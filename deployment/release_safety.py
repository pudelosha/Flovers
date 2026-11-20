"""Host-local release safeguards. No production connections occur on import."""
from datetime import datetime, timezone
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import tarfile
import time
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

GIB = 1024 ** 3


@contextmanager
def host_lock(app_dir):
    import fcntl
    path=Path(app_dir)/".flovers-deployment.lock"
    if path.is_symlink(): raise ValueError("Deployment lock must not be a symlink")
    with path.open("a+") as lock:
        os.chmod(path,0o600)
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        yield


def checksum(path):
    result = hashlib.sha256()
    with Path(path).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def configuration_hash(configuration):
    return hashlib.sha256(json.dumps(configuration,sort_keys=True,separators=(",",":")).encode()).hexdigest()


def private_json(path, value):
    path = Path(path)
    temporary = path.with_name(path.name + ".new")
    descriptor = os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    try:
        with os.fdopen(descriptor,"w",encoding="utf-8") as output:
            json.dump(value,output,indent=2)
            output.flush(); os.fsync(output.fileno())
        os.replace(temporary,path)
        os.chmod(path,0o600)
        if hasattr(os,"O_DIRECTORY"):
            directory=os.open(path.parent,os.O_RDONLY|os.O_DIRECTORY)
            try: os.fsync(directory)
            finally: os.close(directory)
    finally:
        temporary.unlink(missing_ok=True)


def confined_file(root, name):
    relative = PurePosixPath(name)
    if relative.is_absolute() or not relative.parts or ".." in relative.parts:
        raise ValueError("Backup path escapes its cohort")
    path = root.joinpath(*relative.parts)
    if path.is_symlink() or not path.is_file() or not path.stat().st_size:
        raise ValueError("Backup file is missing, empty or a symlink")
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError:
        raise ValueError("Backup file escapes its cohort") from None
    return path


def recent(value, maximum_hours, now):
    timestamp = datetime.fromisoformat(value.replace("Z","+00:00"))
    if timestamp.tzinfo is None or not 0 <= (now-timestamp).total_seconds() <= maximum_hours*3600:
        raise ValueError("Backup or restore verification is stale or future-dated")


def verify_backups(manifest_path, config_hash, now=None):
    """Recheck backup bytes and a trusted, separately performed restore receipt."""
    path = Path(manifest_path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 65536:
        raise ValueError("A bounded backup manifest is required")
    if os.name=="posix" and (path.stat().st_mode & 0o077 or path.parent.stat().st_mode & 0o077):
        raise ValueError("Backup cohort directory and manifest must be private to the deployment user")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    now = now or datetime.now(timezone.utc)
    recent(manifest["created_at"],24,now)
    if manifest.get("consistent_snapshot") != "application-writers-paused" or manifest.get("configuration_sha256") != config_hash:
        raise ValueError("A consistent database/media cohort for the current configuration is required")
    files = manifest["files"]
    if set(files) != {"database","private_media","public_media"}:
        raise ValueError("Database, private media and public catalogue media backups are required")
    hashes = {}
    for kind, record in files.items():
        file = confined_file(path.parent,record["path"])
        digest = checksum(file)
        if digest != record["sha256"]:
            raise ValueError("Backup checksum mismatch")
        hashes[kind] = digest
        if kind == "database":
            with file.open("rb") as data:
                if data.read(5) != b"PGDMP":
                    raise ValueError("PostgreSQL custom-format backup required")
        else:
            with tarfile.open(file,"r:*") as archive:
                for member in archive:
                    name = PurePosixPath(member.name)
                    if name.is_absolute() or ".." in name.parts or member.issym() or member.islnk() or not (member.isfile() or member.isdir()):
                        raise ValueError("Unsafe media archive entry")
                    if member.isfile():
                        with archive.extractfile(member) as data:
                            while data.read(1024 * 1024):
                                pass
    receipt_path = confined_file(path.parent,manifest["restore_receipt"])
    if receipt_path.stat().st_size > 65536:
        raise ValueError("Bounded restore receipt required")
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    recent(receipt["verified_at"],24,now)
    if (receipt.get("files") != hashes or receipt.get("postgres_major") != 16
            or receipt.get("restored_to_isolated_database") is not True
            or receipt.get("record_counts_verified") is not True
            or receipt.get("media_references_verified") is not True
            or receipt.get("off_server_copy_verified") is not True):
        raise ValueError("A matching isolated PostgreSQL/media restore and off-server-copy receipt is required")
    return {"manifest":str(path.resolve()),"sha256":checksum(path),"files":hashes,
            "created_at":manifest["created_at"],"restore_verified_at":receipt["verified_at"]}


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self,*args):
        raise ValueError("Readiness redirects are refused")


def http_ready(url):
    from urllib.parse import urlsplit
    parsed = urlsplit(url)
    if (parsed.username or parsed.password or parsed.fragment or parsed.query
            or parsed.path != "/api/locations/" or parsed.scheme not in {"https","http"}
            or not parsed.hostname or (parsed.scheme == "http" and parsed.hostname not in {"127.0.0.1","localhost","::1"})):
        raise ValueError("Explicit HTTPS or loopback HTTP /api/locations/ readiness URL required")
    opener = build_opener(ProxyHandler({}),NoRedirects())
    try:
        response = opener.open(Request(url,headers={"Accept":"application/json"},method="GET"),timeout=8)
    except HTTPError as error:
        response = error
    with response:
        body=response.read(65537)
        if response.status != 401 or len(body)>65536 or "application/json" not in response.headers.get("Content-Type",""):
            raise ValueError("API readiness must return bounded DRF HTTP 401 JSON without authentication")
        if not isinstance(json.loads(body),dict):
            raise ValueError("API readiness returned invalid JSON")


DEPENDENCIES = '''import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE","app.settings")
import django; django.setup()
from django.conf import settings
from django.db import connection
from redis import Redis
with connection.cursor() as cursor:
    cursor.execute("SELECT 1")
    assert cursor.fetchone() == (1,)
connection.close()
assert Redis.from_url(settings.CELERY_BROKER_URL,socket_connect_timeout=3,socket_timeout=3).ping()
'''
WORKER = '''import os,socket,sys
os.environ.setdefault("DJANGO_SETTINGS_MODULE","app.settings")
from app.celery import celery_app
node=sys.argv[1].replace("{hostname}",socket.gethostname())
answer=celery_app.control.inspect(destination=[node],timeout=5).ping()
assert answer and answer.get(node)=={"ok":"pong"}
'''
BEAT = '''import os,sys
from pathlib import Path
root=Path(sys.argv[1]); started=float(sys.argv[2])
assert root.is_absolute()
assert any(p.is_file() and p.stat().st_mtime>=started-2 for p in root.parent.glob(root.name+"*")), "Beat schedule did not initialize"
'''


class Safety:
    def __init__(self, app_dir, execute, configuration, backend, apps, commit_sha):
        self.app_dir=Path(app_dir); self.execute=execute; self.configuration=configuration
        self.backend=backend; self.apps=apps; self.sha=commit_sha
        self.directory=None; self.metadata={}

    def preflight(self, base):
        policy_path=self.app_dir/"deployment-policy.json"
        if policy_path.is_symlink() or not policy_path.is_file() or policy_path.stat().st_size>65536:
            raise ValueError("An owner-reviewed deployment-policy.json is required")
        if os.name=="posix" and policy_path.stat().st_mode & (stat.S_IWGRP|stat.S_IWOTH):
            raise ValueError("Deployment policy must not be group/world writable")
        self.policy=json.loads(policy_path.read_text(encoding="utf-8"))
        if not Path(self.policy["backup_manifest"]).is_absolute():
            raise ValueError("An absolute backup-manifest path is required")
        for service in self.apps:
            mounts=self.configuration["services"][service].get("volumes",[])
            if not any(isinstance(m,dict) and m.get("type") in {"volume","bind"} and m.get("target")=="/app/private-media" for m in mounts):
                raise ValueError("Existing persistent private-media mounts are required before release")
        commands=[str(self.configuration["services"][name].get("command","")).lower() for name in self.apps]
        if not any("celery" in c and "worker" in c for c in commands) or not any("celery" in c and "beat" in c for c in commands):
            raise ValueError("Both a Celery worker and Beat must be included in the production application services")
        self.capacity()
        backup=verify_backups(self.policy["backup_manifest"],configuration_hash(self.configuration))
        self.execute([*base,"exec","-T",self.backend,"python","-c",DEPENDENCIES],capture=True)
        http_ready(self.policy["readiness_url"])
        run=os.environ.get("DEPLOY_RUN_ID","")
        if not re.fullmatch(r"[0-9]+-[0-9]+",run):
            raise ValueError("Numeric GitHub run and attempt identity is required")
        root=self.app_dir/".flovers-deployments"
        if root.is_symlink():
            raise ValueError("Deployment history must not be a symlink")
        root.mkdir(mode=0o700,exist_ok=True); os.chmod(root,0o700)
        self.directory=root/(run+"-"+self.sha)
        self.directory.mkdir(mode=0o700)  # Never overwrite recovery evidence.
        private_json(self.directory/"previous-compose.json",self.configuration)
        containers=self.execute([*base,"ps","--all","--quiet",*self.apps],capture=True).stdout.split()
        if not containers:
            raise ValueError("Existing application containers required; bootstrap is a separate operation")
        records=json.loads(self.execute(["docker","inspect",*containers],capture=True).stdout)
        previous=[{"id":r["Id"],"image_id":r["Image"],"configured_image":r["Config"]["Image"],"name":r["Name"],
                   "service":r["Config"].get("Labels",{}).get("com.docker.compose.service")} for r in records]
        if len(previous)!=len(self.apps) or {r["service"] for r in previous}!=set(self.apps):
            raise ValueError("Exactly one previous container per application service is required")
        images=json.loads(self.execute(["docker","image","inspect",*sorted({r["image_id"] for r in previous})],capture=True).stdout)
        self.metadata={"revision":self.sha,"run":run,"started_at":datetime.now(timezone.utc).isoformat(),
                       "previous":previous,"configuration_sha256":configuration_hash(self.configuration),
                       "configuration_snapshot":"previous-compose.json","backup":backup,"phase":"preflight",
                       "previous_images":[{"id":i["Id"],"digests":i.get("RepoDigests",[])} for i in images]}
        self.record("preflight")

    def capacity(self):
        required=self.policy.get("min_free_bytes",2*GIB)
        inodes=self.policy.get("min_free_inodes",20000)
        if not isinstance(required,int) or required<2*GIB or not isinstance(inodes,int) or inodes<20000:
            raise ValueError("Capacity floors cannot be lower than 2 GiB and 20000 free inodes")
        docker_root=self.execute(["docker","info","--format","{{.DockerRootDir}}"],capture=True).stdout.strip()
        if not Path(docker_root).is_absolute():
            raise ValueError("Docker storage root could not be verified")
        paths=[self.app_dir,Path(docker_root),Path(self.policy["backup_manifest"]).parent]
        if Path("/var/lib/containerd").exists(): paths.append(Path("/var/lib/containerd"))
        for path in paths:
            free=os.statvfs(path)
            if free.f_bavail*free.f_frsize<required or free.f_favail<inodes:
                raise ValueError("Insufficient disk space or inodes; no automatic data/volume deletion is permitted")

    def record(self, phase, **extra):
        self.metadata.update(extra); self.metadata["phase"]=phase
        if self.directory: private_json(self.directory/"manifest.json",self.metadata)

    def ready(self, compose, service, role):
        # Readiness polls retry observations only, never migrations/start commands.
        deadline=time.monotonic()+120
        while True:
            try:
                ids=self.execute([*compose,"ps","--quiet",service],capture=True).stdout.split()
                if len(ids)!=1: raise ValueError("Exactly one running service container required")
                info=json.loads(self.execute(["docker","inspect",ids[0]],capture=True).stdout)[0]
                if self.metadata.get("image") and info.get("Config",{}).get("Image")!=self.metadata["image"]:
                    raise ValueError("Running service does not use the approved immutable image")
                state=info["State"]
                if state.get("Status")!="running" or state.get("Restarting") or state.get("OOMKilled"):
                    raise ValueError("Application service failed startup")
                if state.get("Health",{}).get("Status","healthy")!="healthy":
                    raise ValueError("Application healthcheck has not passed")
                if role=="web":
                    self.execute([*compose,"exec","-T",service,"python","-c",DEPENDENCIES],capture=True)
                    http_ready(self.policy["readiness_url"])
                elif role=="worker":
                    self.execute([*compose,"exec","-T",service,"python","-c",WORKER,self.policy.get("worker_node","celery@{hostname}")],capture=True)
                elif role=="beat":
                    logs=self.execute(["docker","logs","--since",info["State"]["StartedAt"],ids[0]],capture=True)
                    text=logs.stdout+(logs.stderr or "")
                    if "beat: Starting" not in text or any(word in text for word in ("Traceback", "CRITICAL", "ERROR")):
                        raise ValueError("Beat did not initialize cleanly")
                    self.execute([*compose,"exec","-T",service,"python","-c",DEPENDENCIES],capture=True)
                    started=datetime.fromisoformat(info["State"]["StartedAt"].replace("Z","+00:00")).timestamp()
                    self.execute([*compose,"exec","-T",service,"python","-c",BEAT,self.policy.get("beat_schedule_path","/app/celerybeat-schedule"),str(started)],capture=True)
                elif role=="other":
                    self.execute([*compose,"exec","-T",service,"python","-c",DEPENDENCIES],capture=True)
                else: raise ValueError("Unknown readiness role")
                self.metadata.setdefault("ready_services",{})[service]={"container":ids[0],"image_id":info.get("Image"),"role":role}
                return
            except (ValueError, OSError, subprocess.CalledProcessError):
                if time.monotonic()>=deadline: raise ValueError("Runtime readiness deadline exceeded for "+role) from None
                time.sleep(3)

    def failed(self):
        self.record("failed", failed_phase=self.metadata.get("phase"), failure_type=type(sys.exc_info()[1]).__name__)

