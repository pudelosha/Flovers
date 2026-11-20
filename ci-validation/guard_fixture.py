"""Validation branch only: map actual hosted producer outcomes to canonical gate IDs."""
import importlib.util
import json
import os
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('required_gate', root / '.github/scripts/ci_gate.py')
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
raw = json.loads(os.environ['CI_RAW_NEEDS'])
case = sys.argv[1]
policy = {'result': raw['policy']['result'], 'outputs': {}}
if case == 'aggregate':
    evidence = {gate.POLICY: policy}
    for lane in gate.LANES:
        source = 'negative-gates' if lane == 'backend' else 'success'
        evidence['gate-' + lane] = {'result': raw[source]['result'], 'outputs': {}}
    lane = 'release-readiness'
else:
    lane = 'backend'
    evidence = {gate.POLICY: policy}
    source = {'positive': 'success', 'failure': 'failure', 'skipped': 'skipped', 'timed_out': 'timeout'}.get(case, 'success')
    state = raw[source]['result']
    if case == 'cancelled':
        state = 'cancelled'  # explicit simulated result; actual cancellation has its own PR/run
    jobs = {'tests': {'result': state, 'outputs': {}}}
    if case == 'inner-missing':
        jobs = {}
    if case != 'missing':
        evidence['backend-execution'] = {'result': state, 'outputs': {'job_results': json.dumps(jobs)}}
    if case == 'missing-output':
        evidence['backend-execution']['outputs'] = {}
os.environ['CI_NEEDS'] = json.dumps(evidence)
sys.exit(gate.main(['--lane', lane, '--output', 'fixture-results/' + case + '.json']))
