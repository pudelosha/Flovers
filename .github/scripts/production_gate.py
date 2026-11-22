"""Fail-closed authorization for explicit owner-initiated production releases."""
import argparse
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from ci_gate import CHECK_NAMES

REPOSITORY = "pudelosha/Flovers"
TARGETS = {"backend": ("production-backend", "DEPLOY BACKEND"),
           "website": ("github-pages", "PUBLISH WEBSITE")}


class ApprovalError(ValueError):
    pass


def authorize(event, env, target):
    environment, phrase = TARGETS[target]
    owner = event.get("repository", {}).get("owner", {})
    sha = env.get("GITHUB_SHA", "")
    inputs = event.get("inputs", {})
    mode = inputs.get("deployment_mode") if target == "backend" else None
    if target == "backend":
        if mode not in {"LIGHT", "FULL"}:
            raise ApprovalError("An explicit LIGHT or FULL deployment mode is required")
        phrase += " " + mode
    if (env.get("GITHUB_EVENT_NAME") != "workflow_dispatch"
            or env.get("GITHUB_REPOSITORY") != REPOSITORY
            or event.get("repository", {}).get("full_name") != REPOSITORY
            or env.get("GITHUB_REF") != "refs/heads/main"
            or owner.get("login") != "pudelosha"
            or env.get("GITHUB_ACTOR") != owner.get("login")
            or env.get("GITHUB_TRIGGERING_ACTOR") != owner.get("login")
            or str(owner.get("id", "")) != env.get("GITHUB_ACTOR_ID")
            or not re.fullmatch(r"[0-9a-f]{40}", sha)
            or inputs.get("revision") != sha
            or inputs.get("confirmation") != f"{phrase} {sha}"):
        raise ApprovalError("Owner dispatch from main, exact revision and explicit release confirmation are required")
    return {"environment": environment, "revision": sha, "owner": owner["login"], "owner_id": owner["id"], "mode": mode}


def require_main_ci(revision, read):
    """Verify the exact main commit, effective protection and one complete CI run."""
    branch = read("/branches/main")
    if branch.get("protected") is not True or branch.get("commit", {}).get("sha") != revision:
        raise ApprovalError("Approved revision must still be the protected main tip")
    rules = read("/rules/branches/main")
    required = set(CHECK_NAMES)
    status_rules = [r.get("parameters", {}) for r in rules if r.get("type") == "required_status_checks"]
    if (not any(r.get("type") == "pull_request" for r in rules)
            or not any(r.get("type") == "non_fast_forward" for r in rules)
            or not any(r.get("type") == "deletion" for r in rules)
            or not any(p.get("strict_required_status_checks_policy") is True and
                       {(c.get("context"), c.get("integration_id")) for c in p.get("required_status_checks", [])}
                       >= {(name, 15368) for name in required} for p in status_rules)):
        raise ApprovalError("Main must retain its PR, strict CI, force-push and deletion protections")
    response = read(f"/commits/{revision}/check-runs?per_page=100&filter=latest")
    checks = response.get("check_runs", [])
    if response.get("total_count") != len(checks):
        raise ApprovalError("Incomplete CI check listing")
    checks = [c for c in checks if c.get("name") in required and c.get("app", {}).get("id") == 15368]
    if (len(checks) != len(required) or {c["name"] for c in checks} != required
            or any(c.get("head_sha") != revision or c.get("status") != "completed" or c.get("conclusion") != "success" for c in checks)):
        raise ApprovalError("All ten GitHub Actions CI checks must pass for this exact revision")
    run_ids = set()
    for check in checks:
        match = re.fullmatch(r"https://github\.com/pudelosha/Flovers/actions/runs/([0-9]+)/job/([0-9]+)", check.get("details_url", ""))
        if not match:
            raise ApprovalError("Unverified CI check provenance")
        run_ids.add(match.group(1))
    if len(run_ids) != 1:
        raise ApprovalError("Required checks must belong to one complete coordinator run")
    run_id = run_ids.pop()
    run = read("/actions/runs/" + run_id)
    if (run.get("head_sha") != revision or run.get("head_branch") != "main"
            or run.get("event") not in {"push", "workflow_dispatch"}
            or run.get("path") != ".github/workflows/ci-main.yml"
            or run.get("status") != "completed" or run.get("conclusion") != "success"):
        raise ApprovalError("Successful exact-main coordinator execution is required")
    recent = read(f"/actions/workflows/ci-main.yml/runs?branch=main&head_sha={revision}&per_page=100").get("workflow_runs", [])
    recent = [r for r in recent if r.get("head_sha") == revision and r.get("head_branch") == "main"
              and r.get("event") in {"push", "workflow_dispatch"}]
    if (not recent or str(max(recent,key=lambda r:(r["run_number"],r["run_attempt"]))["id"]) != run_id):
        raise ApprovalError("A newer coordinator run must finish before release")
    response = read(f"/actions/runs/{run_id}/jobs?per_page=100")
    jobs = response.get("jobs", [])
    if (response.get("total_count") != len(jobs) or len(jobs) < 24
            or any(j.get("status") != "completed" or j.get("conclusion") != "success" for j in jobs)):
        raise ApprovalError("Full CI matrix must pass without cancelled, missing or skipped jobs")
    names = {j.get("name") for j in jobs}
    if not required.issubset(names):
        raise ApprovalError("Coordinator jobs are incomplete")
    return run_id


def require_environment(configuration, policies, owner_id):
    rules = configuration.get("protection_rules", [])
    reviewers = [r for r in rules if r.get("type") == "required_reviewers"]
    expected = [{"type": "User", "reviewer": {"id": owner_id}}]
    actual = [{"type":r.get("type"),"reviewer":{"id":r.get("reviewer",{}).get("id")}}
              for r in reviewers[0].get("reviewers", [])] if len(reviewers) == 1 else []
    if (len(reviewers) != 1 or actual != expected
            or reviewers[0].get("prevent_self_review") is not False
            or configuration.get("can_admins_bypass") is not False
            or configuration.get("deployment_branch_policy") != {"protected_branches": False, "custom_branch_policies": True}
            or policies.get("total_count") != 1
            or [(r.get("name"),r.get("type")) for r in policies.get("branch_policies",[])] != [("main","branch")]):
        raise ApprovalError("Environment must require only the owner, allow owner self-review, forbid admin bypass, and allow only main")


def github(path, token):
    request = Request("https://api.github.com/repos/" + REPOSITORY + path,
                      headers={"Authorization":"Bearer " + token, "Accept":"application/vnd.github+json",
                               "X-GitHub-Api-Version":"2022-11-28", "User-Agent":"flovers-production-approval"})
    try:
        with urlopen(request, timeout=20) as response:
            data = response.read(1024 * 1024 + 1)
            if len(data) > 1024 * 1024:
                raise ApprovalError("Oversized environment response")
            return json.loads(data)
    except (HTTPError, URLError, TimeoutError, ValueError) as error:
        raise ApprovalError("Cannot verify protected environment; release is blocked") from error


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", choices=TARGETS)
    args = parser.parse_args(argv)
    try:
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
        result = authorize(event, os.environ, args.target)
        token = os.environ.get("GH_TOKEN", "")
        if not token:
            raise ApprovalError("Read-only environment inspection token is required")
        path = "/environments/" + result["environment"]
        require_environment(github(path,token), github(path+"/deployment-branch-policies",token),result["owner_id"])
        if args.target == "backend":
            require_main_ci(result["revision"], lambda path: github(path, token))
        print(f"Owner authorization and protected environment verified for {result['revision']}")
        return 0
    except (ApprovalError, KeyError, OSError, ValueError) as error:
        print(f"Production approval blocked: {error}",file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
