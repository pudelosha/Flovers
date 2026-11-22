"""Structural contract for manual, owner-approved production workflows."""
from ci_workflow_policy import PolicyError, _require, _no_soft_fail


def validate(workflow,target):
    env="production-backend" if target=="backend" else "github-pages"
    call=workflow.get("on",{})
    _require(set(call)=={"workflow_dispatch"},"Production must never deploy from push, PR or workflow-call events")
    inputs=call["workflow_dispatch"].get("inputs",{})
    _require(set(inputs)==({"revision","confirmation","deployment_mode"} if target=="backend" else {"revision","confirmation"}),"Explicit revision, mode and confirmation are mandatory")
    _require(all(inputs[k].get("required")=="true" and inputs[k].get("type")=="string" and "default" not in inputs[k] for k in ("revision","confirmation")),"Approval inputs cannot be defaulted")
    if target=="backend":
        mode=inputs["deployment_mode"]
        _require(mode.get("required")=="true" and mode.get("type")=="choice" and mode.get("default")=="LIGHT"
                 and mode.get("options")==["LIGHT","FULL"],"Explicit LIGHT/FULL selection required")
        _require(workflow["jobs"]["release"].get("env",{}).get("DEPLOY_MODE")=="${{ inputs.deployment_mode }}","Approved deployment mode must reach the release")
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
    if target=="backend":
        steps=release["steps"]
        ssh=[(i,s) for i,s in enumerate(steps) if "ssh-action" in s.get("uses","")]
        _require(len(ssh)==1,"Exactly one protected SSH release step required")
        i,step=ssh[0]
        _require(steps[i-1].get("run")==gate,"Authorization and CI must be rechecked immediately before SSH")
        _require(step.get("with",{}).get("fingerprint")=="${{ vars.VPS_HOST_FINGERPRINT }}","SSH host pin required")
        _require("DEPLOY_MODE" in step.get("with",{}).get("envs","").split(","),"SSH mode forwarding required")
    return True
