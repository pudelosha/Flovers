"""Combine the topic reviews into filterable, per-plant audit files.

Does not alter definitions. Run after the topic JSON reports exist.
"""
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

OUT = Path(__file__).resolve().parent

def load(name):
    return json.loads((OUT / (name + '.json')).read_text(encoding='utf-8'))

def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')) if not isinstance(value, str) else value

structure = load('structure')
topics = {name: load(name) for name in ['toxicity', 'soil_container', 'task_recommendations']}
matrix = {p['external_id']: dict(p) for p in structure['coverage']}
all_findings = []

def classification(status):
    if status in {'confirmed_correction', 'confirmed_source_conflict', 'confirmed_false_safe', 'confirmed_false_non_toxic'}:
        return 'confirmed_correction'
    if status.startswith('confirmed'):
        return 'confirmed_limitation_or_contradiction'
    return 'requires_review'

for topic, report in topics.items():
    coverage = report.get('coverage', report.get('plants'))
    assert len(coverage) == 734, (topic, len(coverage))
    ids = {p['external_id'] for p in coverage}
    assert ids == set(matrix), (topic, ids ^ set(matrix))
    for p in coverage:
        matrix[p['external_id']][topic] = p
    for n, finding in enumerate(report.get('findings', []), 1):
        external_id = finding['external_id']
        assert external_id in matrix, (topic, external_id)
        status = finding.get('status', 'review_needed')
        category = classification(status)
        if topic == 'toxicity':
            status = finding['code']
            category = 'evidenced_safety_label_conflict' if status in {'non_toxic_label_contradicted', 'pet_toxic_claim_contradicted'} else (
                'translation_quality_issue' if status.startswith('translation_quality') else 'scope_or_evidence_review')
        all_findings.append({
            'topic': topic, 'id': finding.get('id', f'{topic}-{n}'), 'external_id': external_id,
            'latin': matrix[external_id]['latin'], 'severity': finding.get('severity', 'medium'),
            'classification': category, 'status': status,
            'fields': finding.get('fields', finding.get('field', 'traits.toxic' if topic == 'toxicity' else '')),
            'current': finding.get('current', finding.get('current_toxicity', finding.get('current_value'))),
            'finding': finding.get('title', finding.get('issue', finding.get('finding', finding.get('reason', '')))),
            'recommended_action': finding.get('recommended_action', finding.get('recommended_correction', finding.get('recommendation', ''))),
            'sources': finding.get('sources', finding.get('source_urls', finding.get('evidence_urls', []))),
            'confidence': finding.get('confidence', ''),
        })

for f in structure['findings']:
    all_findings.append({'topic': 'structure', 'id': f"STR:{f['external_id']}:{f['code']}:{f['field']}",
                         'external_id': f['external_id'], 'latin': f['latin'], 'severity': f['severity'],
                         'classification': 'confirmed_app_or_data_structure_issue', 'status': f['code'],
                         'fields': f['field'], 'current': f['current'], 'finding': f['finding'],
                         'recommended_action': f['recommended_action'], 'sources': [], 'confidence': f['confidence']})

by_plant = defaultdict(list)
for f in all_findings:
    by_plant[f['external_id']].append(f)

source_flags = Counter(f['external_id'] for f in load('source_identity_flags')['links'])
rhs_flag_count = sum(source_flags.values())
aspca_flags = Counter(f['external_id'] for f in topics['toxicity']['findings'] if f.get('code') == 'aspca_source_identity_not_established')
source_flags.update(aspca_flags)
summary = {'plants': len(matrix), 'findings': len(all_findings),
           'finding_instances_by_topic': dict(Counter(f['topic'] for f in all_findings)),
           'finding_instances_by_classification': dict(Counter(f['classification'] for f in all_findings)),
           'source_identity_flags': sum(source_flags.values()), 'plants_with_source_identity_flags': len(source_flags),
           'rhs_identity_flags': rhs_flag_count, 'aspca_identity_flags': sum(aspca_flags.values()),
           'disclaimer': 'Findings include context gaps and review candidates. Their count is not a count of proven botanical errors. A plant without a confirmed correction is not certified safe or botanically correct.'}
(OUT / 'combined_findings.json').write_text(json.dumps({'summary': summary, 'findings': all_findings}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
with (OUT / 'findings.csv').open('w', encoding='utf-8-sig', newline='') as handle:
    writer = csv.DictWriter(handle, fieldnames=list(all_findings[0]))
    writer.writeheader()
    writer.writerows({k: compact(v) for k, v in f.items()} for f in all_findings)

columns = ['external_id', 'latin', 'file', 'sha256', 'toxicity_en', 'soils', 'containers', 'task_settings',
           'toxicity_review_status', 'soil_review_status', 'task_review_status',
           'finding_count', 'finding_ids', 'source_identity_flags', 'conclusion']
with (OUT / 'plant_review_matrix.csv').open('w', encoding='utf-8-sig', newline='') as handle:
    writer = csv.DictWriter(handle, fieldnames=columns)
    writer.writeheader()
    for key, p in sorted(matrix.items()):
        toxicity = p['toxicity']
        soil, tasks = p['soil_container'], p['task_recommendations']
        writer.writerow({
            'external_id': key, 'latin': p['latin'], 'file': p['file'], 'sha256': p['sha256'],
            'toxicity_en': p['toxicity_en'], 'soils': compact(p['soils']), 'containers': compact(p['containers']),
            'task_settings': compact(p['tasks']),
            'toxicity_review_status': toxicity.get('coverage', toxicity.get('status', toxicity.get('evidence_status', toxicity.get('review_status', toxicity.get('source_status', 'See toxicity.json'))))),
            'soil_review_status': soil.get('soil_evidence_status'),
            'task_review_status': tasks.get('source_status'), 'finding_count': len(by_plant[key]),
            'finding_ids': '; '.join(str(f['id']) for f in by_plant[key]),
            'source_identity_flags': source_flags.get(key, 0),
            'conclusion': 'See finding classifications and topic coverage; unresolved evidence is not approval.',
        })
print(json.dumps(summary, ensure_ascii=False, indent=2))
