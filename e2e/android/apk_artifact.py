"""Run-scoped smoke APK provenance. Never search another run or fall back by age."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.request import Request, build_opener, HTTPRedirectHandler

MAX_BYTES = 512 * 1024**2


def context(env):
    repository = env.get("GITHUB_REPOSITORY", "")
    run = env.get("GITHUB_RUN_ID", "")
    revision = env.get("GITHUB_SHA", "")
    source = env.get("E2E_SOURCE_SHA", "")
    attempt = env.get("GITHUB_RUN_ATTEMPT", "")
    repository_id = env.get("GITHUB_REPOSITORY_ID", "")
    if (repository != "pudelosha/Flovers" or not re.fullmatch(r"[1-9][0-9]*", run)
            or not re.fullmatch(r"[1-9][0-9]*", repository_id)
            or not re.fullmatch(r"[1-9][0-9]*", attempt)
            or not all(re.fullmatch(r"[a-f0-9]{40}", value) for value in (revision, source))):
        raise ValueError("Complete current-run repository, commit and attempt identity required")
    return {"repository": repository, "repository_id": int(repository_id), "run_id": int(run),
            "checkout_sha": revision, "source_sha": source, "attempt": int(attempt)}


def artifact_name(identity):
    return f"android-smoke-apk-{identity['run_id']}-{identity['checkout_sha']}"


def checksum(path):
    if path.is_symlink() or not path.is_file() or not 0 < path.stat().st_size <= MAX_BYTES:
        raise ValueError("A bounded, regular smoke APK is required")
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def create(directory, identity, checked_out_sha):
    if checked_out_sha != identity["checkout_sha"]:
        raise ValueError("Checkout does not match the approved workflow commit")
    digest = checksum(directory / "app-e2e.apk")
    receipt = {**identity, "format": 1, "package": "com.flovers.mobile.e2e",
               "apk": "app-e2e.apk", "sha256": digest}
    (directory / "provenance.json").write_text(json.dumps(receipt, sort_keys=True) + "\n", encoding="utf8")
    (directory / "sha256.txt").write_text(digest + "  app-e2e.apk\n", encoding="ascii")


def resolve(identity, read):
    """Read every artifact page for exactly this workflow run, then require one."""
    artifacts = []
    total = None
    for page in range(1, 11):
        response = read(f"/actions/runs/{identity['run_id']}/artifacts?per_page=100&page={page}")
        count = response.get("total_count")
        batch = response.get("artifacts")
        if (type(count) is not int or not 0 <= count <= 1000 or not isinstance(batch, list)
                or not all(isinstance(artifact, dict) for artifact in batch)
                or (total is not None and total != count)):
            raise ValueError("Incomplete or changing run artifact listing")
        total = count
        artifacts.extend(batch)
        if len(artifacts) >= total:
            break
        if not batch:
            raise ValueError("Incomplete run artifact listing")
    if len(artifacts) != total or len({a.get("id") for a in artifacts}) != total:
        raise ValueError("Incomplete or duplicated run artifact listing")
    matches = [a for a in artifacts if a.get("name") == artifact_name(identity)]
    if len(matches) != 1:
        raise ValueError("Exactly one APK artifact for this run and commit is required")
    artifact = matches[0]
    run = artifact.get("workflow_run", {})
    if (not isinstance(run, dict) or artifact.get("expired") is not False or type(artifact.get("id")) is not int or artifact["id"] <= 0
            or type(artifact.get("size_in_bytes")) is not int or not 0 < artifact["size_in_bytes"] <= MAX_BYTES
            or not isinstance(artifact.get("digest"), str)
            or not re.fullmatch(r"sha256:[a-f0-9]{64}", artifact["digest"])
            or run.get("id") != identity["run_id"] or run.get("repository_id") != identity["repository_id"]
            or run.get("head_sha") != identity["source_sha"]):
        raise ValueError("APK artifact metadata does not match this workflow run and source commit")
    return artifact["id"]


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate APK provenance field")
        result[key] = value
    return result


def verify(directory, identity):
    if directory.is_symlink() or {p.name for p in directory.iterdir()} != {"app-e2e.apk", "provenance.json", "sha256.txt"}:
        raise ValueError("Unexpected or ambiguous APK artifact contents")
    provenance = directory / "provenance.json"
    if provenance.is_symlink() or not provenance.is_file() or provenance.stat().st_size > 4096:
        raise ValueError("Bounded regular APK provenance required")
    receipt = json.loads(provenance.read_text(encoding="utf8"), object_pairs_hook=unique_object)
    keys = ["repository", "repository_id", "run_id", "checkout_sha", "source_sha"]
    if (not isinstance(receipt, dict) or receipt.get("format") != 1 or any(receipt.get(key) != identity[key] for key in keys)
            or type(receipt.get("attempt")) is not int or not 1 <= receipt["attempt"] <= identity["attempt"]
            or receipt.get("apk") != "app-e2e.apk" or receipt.get("package") != "com.flovers.mobile.e2e"):
        raise ValueError("APK provenance does not match this run, commit and build attempt")
    digest = checksum(directory / "app-e2e.apk")
    sums = directory / "sha256.txt"
    if (sums.is_symlink() or not sums.is_file() or sums.stat().st_size > 256
            or receipt.get("sha256") != digest or sums.read_text(encoding="ascii") != digest + "  app-e2e.apk\n"):
        raise ValueError("Smoke APK checksum verification failed")
    return receipt


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def github_reader(identity, token):
    if not token:
        raise ValueError("Read-only GitHub artifact inspection token required")
    def read(path):
        request = Request("https://api.github.com/repos/" + identity["repository"] + path,
            headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
                     "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "flovers-smoke-apk"})
        with build_opener(NoRedirect).open(request, timeout=30) as response:
            data = response.read(1024**2 + 1)
            if len(data) > 1024**2:
                raise ValueError("Oversized artifact metadata response")
            return json.loads(data)
    return read


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["create", "resolve", "verify"])
    args = parser.parse_args()
    try:
        identity = context(os.environ)
        directory = Path("e2e-results/apk")
        if args.command == "create":
            revision = subprocess.run(["git", "rev-parse", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()
            create(directory, identity, revision)
        elif args.command == "resolve":
            artifact = resolve(identity, github_reader(identity, os.environ.get("GH_TOKEN", "")))
            with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf8") as output:
                output.write(f"artifact_id={artifact}\n")
        else:
            receipt = verify(directory, identity)
            print(f"Verified smoke APK for run {identity['run_id']}, commit {identity['checkout_sha']}, build attempt {receipt['attempt']}")
        return 0
    except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
        print(f"Smoke APK provenance check failed ({type(error).__name__}); refusing unverified artifact", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
