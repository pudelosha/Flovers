"""Fail-closed authorization for explicit owner-initiated production releases."""
import argparse
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

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
    return {"environment": environment, "revision": sha, "owner": owner["login"], "owner_id": owner["id"]}


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
        print(f"Owner authorization and protected environment verified for {result['revision']}")
        return 0
    except (ApprovalError, KeyError, OSError, ValueError) as error:
        print(f"Production approval blocked: {error}",file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
