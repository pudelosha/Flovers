"""Best-effort unpause of this run's services, including after a failed test."""
import json
import os
import subprocess
from .safety import container_action, validate_container, validate_environment


def main():
    run = validate_environment(os.environ)
    for role in ("redis", "mailpit"):
        container = os.environ[f"FLOVERS_{role.upper()}_CONTAINER"]
        info = json.loads(subprocess.run(["docker", "inspect", container], check=True,
                         capture_output=True, text=True, timeout=15).stdout)[0]
        validate_container(info, container_id=container, run=run, role=role)
        if info["State"]["Paused"]:
            container_action(container, run=run, role=role, action="unpause")


if __name__ == "__main__":
    main()
