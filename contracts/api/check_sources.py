"""CI checks vendored adapters against the exact, user-approved Git commit."""
import subprocess
from validation import BASELINE, ROOT, manifest, verify_previous_sources
import json

verify_previous_sources()
manifest()
repo = ROOT.parents[1]
metadata = json.loads((ROOT / "previous.json").read_text())
for item in metadata["files"]:
    raw = subprocess.run(["git", "show", f"{BASELINE}:{item['source']}"], cwd=repo,
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout
    assert raw == (ROOT / item["path"]).read_bytes(), item["path"]
print(f"Verified {len(metadata['files'])} exact adapter files from {BASELINE}")
