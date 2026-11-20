"""Second cleanup path for a cancelled/terminated rehearsal step; never writes test success."""
import json
from .run import Runner, RESULTS

runner = Runner()
runner.logs = 1000  # Preserve original build/migration logs.
lock = RESULTS / "image-digests.json"
if lock.is_file():
    record = json.loads(lock.read_text(encoding="utf8"))
    runner.image = runner.env["FLOVERS_STAGE_IMAGE"] = record["application"]["image_id"]
    runner.env["FLOVERS_STAGE_POSTGRES"] = record["postgres"]["reference"]
    runner.env["FLOVERS_STAGE_REDIS"] = record["redis"]["reference"]
runner.cleanup()
