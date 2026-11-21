"""Structural contract for manual, owner-approved production workflows."""
from ci_workflow_policy import PolicyError, _require, _no_soft_fail


def validate(workflow,target):
    env="production-backend" if target=="backend" else "github-pages"
    call=workflow.get("on",{})
    _require(set(call)=={"workflow_dispatch"},"Production must never deploy from push, PR or workflow-call events")
    inputs=call["workflow_dispatch"].get("inputs",{})
    _require(set(inputs)=={"revision","confirmation"},"Explicit revision and confirmation are mandatory")
    _require(all(i.get("required")=="true" and i.get("type")=="string" and "default" not in i for i in inputs.values()),"Approval inputs cannot be defaulted")
    _require(workflow.get("permissions")=={"contents":"read"},"No workflow-wide publication credentials")
    _require(workflow.get("concurrency",{}).get("cancel-in-progress")=="false","A running production release must not be auto-cancelled")
    _no_soft_fail(workflow)
    jobs=workflow["jobs"]
    _require(set(jobs)==({"authorize","quality","release"} if target=="backend" else {"authorize","quality","build","release"}),"Unexpected production jobs")
    authorize=jobs["authorize"]; release=jobs["release"]
    _require("if" not in authorize and "needs" not in authorize and "environment" not in authorize,"Authorization must precede environment creation")
    _require(release.get("environment",{}).get("name")==env,"Protected production environment missing")
    expected={"authorize","quality"} if target=="backend" else {"authorize","quality","build"}
    _require(set(release.get("needs",[]))==expected and "if" not in release,"Publication cannot bypass authorization/quality")
    _require(jobs["quality"].get("needs")=="authorize","CI must follow owner authorization")
    _require(jobs["quality"].get("uses")=="./.github/workflows/test-"+("backend" if target=="backend" else "web")+".yml","Required component CI missing")
    gate="python3 .github/scripts/production_gate.py "+target
    for job in (authorize,release):
        commands=[s.get("run","") for s in job.get("steps",[])]
        _require(any(c==gate or c.startswith(gate+"\n") for c in commands),"Exact approval evaluator and exit propagation required")
    for name,job in jobs.items():
        if name!="release":
            _require(all(p not in job.get("permissions",{}).values() for p in ["write"]),"Publication privileges cannot precede review")
            for step in job.get("steps",[]):
                action=step.get("uses","")
                _require(not any(x in action for x in ["ssh-action","build-push-action","deploy-pages","configure-pages"]),"Production side effect outside approved job")
    return True
