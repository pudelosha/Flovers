"""Synthetic backup files and mocked host/runtime probes; never production."""
import copy
from datetime import datetime, timedelta, timezone
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

import release_safety as safety

SHA="a"*40
NOW=datetime.now(timezone.utc)


class BackupFixture(unittest.TestCase):
    def setUp(self):
        self.temporary=tempfile.TemporaryDirectory();self.addCleanup(self.temporary.cleanup)
        self.root=Path(self.temporary.name);os.chmod(self.root,0o700)
        self.config={"services":{name:{"image":"synthetic/old","command":command,
                     "environment":{"SECRET_KEY":"private-synthetic-marker"},
                     "volumes":[{"type":"volume","source":"private","target":"/app/private-media"}]}
                     for name,command in [("web","gunicorn app.wsgi"),("worker","celery -A app worker"),("beat","celery -A app beat")]}}
        database=self.root/"database.dump";database.write_bytes(b"PGDMP-synthetic-test-fixture-not-a-real-database")
        self.files={"database":{"path":database.name,"sha256":safety.checksum(database)}}
        for key in ("private_media","public_media"):
            archive=self.root/(key+".tar")
            with safety.tarfile.open(archive,"w") as tar:
                for name in ("plants/photo.jpg","journal/photo.jpg"):
                    data=b"synthetic-media";entry=safety.tarfile.TarInfo(name);entry.size=len(data)
                    tar.addfile(entry,io.BytesIO(data))
            self.files[key]={"path":archive.name,"sha256":safety.checksum(archive)}
        self.receipt={"verified_at":NOW.isoformat(),"files":{k:v["sha256"] for k,v in self.files.items()},
                      "postgres_major":16,"restored_to_isolated_database":True,"record_counts_verified":True,
                      "media_references_verified":True,"off_server_copy_verified":True}
        self.manifest={"created_at":NOW.isoformat(),"consistent_snapshot":"application-writers-paused",
                       "configuration_sha256":safety.configuration_hash(self.config),"files":self.files,"restore_receipt":"restore.json"}
        self.save()

    def save(self):
        safety.private_json(self.root/"manifest.json",self.manifest)
        safety.private_json(self.root/"restore.json",self.receipt)

    def verify(self):
        return safety.verify_backups(self.root/"manifest.json",safety.configuration_hash(self.config),NOW)


class BackupTests(BackupFixture):
    def test_verified_consistent_cohort_includes_every_media_and_database_hash(self):
        result=self.verify()
        self.assertEqual(result["files"],self.receipt["files"])
        self.assertEqual(result["sha256"],safety.checksum(self.root/"manifest.json"))

    def test_missing_backup_or_media_member_blocks_release(self):
        original=copy.deepcopy(self.manifest)
        for key in ("database","private_media","public_media"):
            self.manifest=copy.deepcopy(original);del self.manifest["files"][key];self.save()
            with self.subTest(key=key),self.assertRaises(ValueError): self.verify()

    def test_modified_backup_bytes_and_missing_files_are_rejected(self):
        for key in self.files:
            path=self.root/self.files[key]["path"];original=path.read_bytes()
            path.write_bytes(b"changed")
            with self.subTest(key=key),self.assertRaises(ValueError): self.verify()
            path.unlink()
            with self.assertRaises(ValueError): self.verify()
            path.write_bytes(original)

    def test_stale_future_inconsistent_or_other_configuration_backups_are_rejected(self):
        original=copy.deepcopy(self.manifest)
        for field,bad in [("created_at",(NOW-timedelta(hours=25)).isoformat()),
                          ("created_at",(NOW+timedelta(hours=1)).isoformat()),
                          ("consistent_snapshot","uncoordinated"),("configuration_sha256","b"*64)]:
            self.manifest={**copy.deepcopy(original),field:bad};self.save()
            with self.subTest(field=field,bad=bad),self.assertRaises(ValueError): self.verify()

    def test_receipt_must_match_actual_files_and_verified_restore(self):
        original=copy.deepcopy(self.receipt)
        for field,bad in [("files",{}),("postgres_major",15),("restored_to_isolated_database",False),
                          ("record_counts_verified",False),("media_references_verified",False),
                          ("off_server_copy_verified",False),("verified_at",(NOW-timedelta(days=2)).isoformat())]:
            self.receipt={**original,field:bad};self.save()
            with self.subTest(field=field),self.assertRaises(ValueError): self.verify()

    def test_archive_traversal_and_symlinks_are_rejected_without_extracting(self):
        path=self.root/self.files["private_media"]["path"]
        for kind in ("traversal","symlink"):
            with safety.tarfile.open(path,"w") as archive:
                info=safety.tarfile.TarInfo("../escape" if kind=="traversal" else "link")
                if kind=="symlink": info.type=safety.tarfile.SYMTYPE;info.linkname="/etc/passwd"
                archive.addfile(info)
            self.files["private_media"]["sha256"]=safety.checksum(path);self.save()
            with self.subTest(kind=kind),self.assertRaises(ValueError): self.verify()
        self.assertFalse((self.root.parent/"escape").exists())

    def test_backup_paths_cannot_escape_cohort(self):
        self.files["database"]["path"]="../another.dump";self.save()
        with self.assertRaises(ValueError): self.verify()


class HostSafetyTests(BackupFixture):
    def setUp(self):
        super().setUp()
        self.execute=Mock(side_effect=self.command)
        self.guard=safety.Safety(self.root,self.execute,self.config,"web",["web","worker","beat"],SHA)
        self.guard.policy={"backup_manifest":str(self.root/"manifest.json"),"readiness_url":"http://127.0.0.1:8000/api/locations/"}
        safety.private_json(self.root/"deployment-policy.json",self.guard.policy)

    def command(self, command, capture=False):
        if command[:2]==["docker","info"]: text=str(self.root)
        elif command[:3]==["docker","image","inspect"]:
            text=json.dumps([{"Id":"old-image","RepoDigests":["synthetic/old@sha256:"+"b"*64]}])
        elif command[:2]==["docker","inspect"]:
            text=json.dumps([{"Id":name,"Image":"old-image","Name":name,"Config":{"Image":"synthetic/old","Labels":{"com.docker.compose.service":name}}} for name in ("web","worker","beat")])
        elif "ps" in command: text="web\nworker\nbeat\n"
        else: text=""
        return subprocess.CompletedProcess(command,0,stdout=text,stderr="")

    def free(self, bytes=3*safety.GIB, inodes=50000):
        return SimpleNamespace(f_bavail=bytes//4096,f_frsize=4096,f_favail=inodes)

    def test_low_disk_or_inode_capacity_blocks_before_pull_or_stop(self):
        for available in (self.free(bytes=safety.GIB),self.free(inodes=19999)):
            with patch("release_safety.os.statvfs",return_value=available,create=True),self.assertRaises(ValueError):
                self.guard.capacity()
        self.guard.policy["min_free_bytes"]=safety.GIB
        with self.assertRaises(ValueError):self.guard.capacity()
        self.assertTrue(all("pull" not in c.args[0] and "stop" not in c.args[0] for c in self.execute.call_args_list))

    def test_durable_previous_configuration_and_images_survive_failure(self):
        lock=SimpleNamespace(LOCK_EX=1,LOCK_NB=4,flock=Mock())
        with patch.dict("sys.modules",{"fcntl":lock}),patch.dict(os.environ,{"DEPLOY_RUN_ID":"123-1"}),\
             patch("release_safety.os.statvfs",return_value=self.free(),create=True),patch("release_safety.http_ready"):
            self.guard.preflight(["docker","compose"])
        directory=self.guard.directory
        snapshot=(directory/"previous-compose.json").read_text()
        self.assertIn("private-synthetic-marker",snapshot)
        self.guard.record("migrating",image="synthetic/new@sha256:"+"c"*64)
        try: raise ValueError("private failure details")
        except ValueError:self.guard.failed()
        manifest=json.loads((directory/"manifest.json").read_text())
        self.assertEqual(manifest["phase"],"failed");self.assertEqual(manifest["failed_phase"],"migrating")
        self.assertEqual(manifest["previous_images"][0]["id"],"old-image")
        self.assertEqual(manifest["configuration_sha256"],safety.configuration_hash(self.config))
        self.assertNotIn("private-synthetic-marker",json.dumps(manifest))
        self.assertNotIn("private failure details",json.dumps(manifest))
        if os.name=="posix":
            self.assertEqual((directory/"previous-compose.json").stat().st_mode & 0o777,0o600)
            self.assertEqual(directory.stat().st_mode & 0o777,0o700)

    def test_missing_policy_or_unpersisted_media_blocks_preflight(self):
        lock=SimpleNamespace(LOCK_EX=1,LOCK_NB=4,flock=Mock())
        (self.root/"deployment-policy.json").unlink()
        with patch.dict("sys.modules",{"fcntl":lock}),self.assertRaises(ValueError):self.guard.preflight(["docker","compose"])
        safety.private_json(self.root/"deployment-policy.json",self.guard.policy)
        self.config["services"]["web"]["volumes"]=[]
        with patch.dict("sys.modules",{"fcntl":lock}),self.assertRaises(ValueError):self.guard.preflight(["docker","compose"])


class RuntimeTests(unittest.TestCase):
    def guard(self, command):
        guard=safety.Safety(Path("."),command,{},"web",["web"],SHA)
        guard.policy={"readiness_url":"http://127.0.0.1:8000/api/locations/"}
        return guard

    def command(self, arguments, capture=False):
        info={"State":{"Status":"running","StartedAt":"2026-11-20T20:00:00Z"}}
        stdout=json.dumps([info]) if arguments[:2]==["docker","inspect"] else "container\n" if "ps" in arguments else "beat: Starting..."
        return subprocess.CompletedProcess(arguments,0,stdout=stdout,stderr="")

    def test_successful_web_worker_and_beat_each_require_their_real_probe(self):
        execute=Mock(side_effect=self.command);guard=self.guard(execute)
        with patch("release_safety.http_ready") as http:
            for role in ("web","worker","beat"):guard.ready(["docker","compose"],role,role)
        scripts=[c.args[0][c.args[0].index("-c")+1] for c in execute.call_args_list if "-c" in c.args[0]]
        self.assertIn(safety.WORKER,scripts);self.assertIn(safety.BEAT,scripts);self.assertIn(safety.DEPENDENCIES,scripts)
        http.assert_called_once()

    def test_worker_or_beat_failure_is_not_a_success(self):
        for role in ("worker","beat"):
            def execute(command,capture=False):
                if "-c" in command:raise subprocess.CalledProcessError(1,command)
                return self.command(command,capture)
            with patch("release_safety.time.monotonic",side_effect=[0,121]),self.subTest(role=role),self.assertRaises(ValueError):
                self.guard(execute).ready(["docker","compose"],role,role)

    def test_wrong_running_image_is_not_ready(self):
        guard=self.guard(self.command);guard.metadata["image"]="synthetic/approved@sha256:"+"a"*64
        with patch("release_safety.time.monotonic",side_effect=[0,121]),self.assertRaises(ValueError):
            guard.ready(["docker","compose"],"web","web")

    def test_unhealthy_or_missing_container_is_not_ready(self):
        for status in ("exited","restarting","dead"):
            def execute(command,capture=False):
                result=self.command(command,capture)
                if command[:2]==["docker","inspect"]:result.stdout=json.dumps([{"State":{"Status":status}}])
                return result
            with patch("release_safety.time.monotonic",side_effect=[0,121]),self.subTest(status=status),self.assertRaises(ValueError):
                self.guard(execute).ready(["docker","compose"],"web","web")

    def test_readiness_requires_auth_boundary_json_not_an_html_success(self):
        for status,content,body in [(200,"text/html",b"ok"),(401,"text/html",b"no"),(503,"application/json",b"{}")]:
            response=Mock();response.status=status;response.headers={"Content-Type":content};response.read.return_value=body
            response.__enter__=Mock(return_value=response);response.__exit__=Mock(return_value=False)
            opener=Mock();opener.open.return_value=response
            with patch("release_safety.build_opener",return_value=opener),self.assertRaises(ValueError):
                safety.http_ready("http://127.0.0.1:8000/api/locations/")
        response.status=401;response.headers={"Content-Type":"application/json"};response.read.return_value=b'{"detail":"credentials required"}'
        with patch("release_safety.build_opener",return_value=opener):safety.http_ready("http://127.0.0.1:8000/api/locations/")


if __name__=="__main__":unittest.main()
