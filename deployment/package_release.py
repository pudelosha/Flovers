"""Bundle reviewed deployment modules without writing code/configuration on the VPS."""
import base64
from pathlib import Path


def payload(root=Path(__file__).parent):
    # Load the safety module in memory; the bundle never downloads code on the VPS.
    safety=(root/"release_safety.py").read_text(encoding="utf-8")
    deployment=(root/"deploy_backend.py").read_text(encoding="utf-8")
    runtime=(root/"light_runtime.py").read_text(encoding="utf-8")
    program=("import types,sys\n"
             "runtime=types.ModuleType('light_runtime')\n"
             "sys.modules['light_runtime']=runtime\n"
             "exec(compile("+repr(runtime)+",'<light-runtime>','exec'),runtime.__dict__)\n"
             "module=types.ModuleType('release_safety')\n"
             "sys.modules['release_safety']=module\n"
             "exec(compile("+repr(safety)+",'<release-safety>','exec'),module.__dict__)\n"
             "exec(compile("+repr(deployment)+",'<deployment>','exec'))\n")
    return base64.b64encode(program.encode()).decode()


if __name__=="__main__":
    print("payload="+payload())
