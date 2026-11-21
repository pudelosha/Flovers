"""Verify a built static site and record its immutable source and file hashes."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener


def record(folder, revision, run_id):
    if not re.fullmatch(r"[0-9a-f]{40}",revision) or not re.fullmatch(r"[0-9]+",run_id):
        raise ValueError("Full revision and numeric workflow run ID required")
    root = Path(folder).resolve()
    index = root / "index.html"
    if not index.is_file() or not (root / "assets").is_dir():
        raise ValueError("Built index.html and assets directory required")
    html = index.read_text(encoding="utf-8")
    scripts = re.findall(r'<script[^>]+src="([^"]+)"',html)
    if not scripts:
        raise ValueError("Built entry script is missing")
    for src in scripts:
        if ":" in src or src.startswith("//") or ".." in src.split("/"):
            raise ValueError("External or escaping entry script refused")
        # Vite's configured base can be /Flovers/; asset names remain relative.
        path = root / ("assets/" + src.split("assets/",1)[1]) if "assets/" in src else root/src.lstrip("/")
        if not path.is_file() or not path.stat().st_size:
            raise ValueError("A built entry script does not exist")
    result = {"revision":revision,"workflow_run":run_id,"files":{}}
    for file in sorted(root.rglob("*")):
        if file.is_symlink():
            raise ValueError("Symlinks are not valid published artifacts")
        if file.is_file() and file.name != "release.json":
            result["files"][file.relative_to(root).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
    (root/"release.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    return result


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self,*args):
        raise ValueError("Published-site verification does not follow redirects")


def verify_publication(url,revision):
    parsed=urlsplit(url)
    if parsed.scheme!="https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Explicit final HTTPS Pages URL required")
    if not re.fullmatch(r"[0-9a-f]{40}",revision):raise ValueError("Full deployed revision required")
    opener=build_opener(ProxyHandler({}),NoRedirects())
    request=Request(url.rstrip("/")+"/release.json?revision="+revision,headers={"Accept":"application/json","Cache-Control":"no-cache"},method="GET")
    with opener.open(request,timeout=15) as response:
        data=response.read(4*1024*1024+1)
        if response.status!=200 or len(data)>4*1024*1024:
            raise ValueError("Published release receipt is missing or oversized")
        result=json.loads(data)
    if result.get("revision")!=revision or not result.get("files"):
        raise ValueError("Published website revision does not match the approved build")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    commands=parser.add_subparsers(dest="command",required=True)
    build=commands.add_parser("build")
    build.add_argument("folder");build.add_argument("revision");build.add_argument("run_id")
    verify=commands.add_parser("verify")
    verify.add_argument("url");verify.add_argument("revision")
    args=parser.parse_args()
    if args.command=="build":record(args.folder,args.revision,args.run_id)
    else:verify_publication(args.url,args.revision)
