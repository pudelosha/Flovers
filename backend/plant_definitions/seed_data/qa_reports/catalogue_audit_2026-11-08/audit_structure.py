"""Read-only, reproducible catalogue checks; writes reports beside this script.

Run with Python from any directory. No application imports or database writes.
Botanical evidence is reviewed separately in the topic reports.
"""
import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parent
BACKEND = OUT.parents[3]
MOBILE = BACKEND.parent / 'mobile'
PLANTS = BACKEND / 'plant_definitions/seed_data/plants'
LANGUAGES = {'en', 'pl', 'de', 'it', 'fr', 'es', 'pt', 'ar', 'hi', 'zh', 'ja', 'ko', 'id', 'ru', 'tr'}
constants = (MOBILE / 'src/features/create-plant/constants/create-plant.constants.ts').read_text(encoding='utf-8')

def options(name):
    content = constants.split(f'export const {name}:', 1)[1].split('] as const;', 1)[0]
    return set(re.findall(r'key: "([^"]+)"', content))

pot_keys, soil_keys = options('POT_MATERIALS'), options('SOIL_MIXES')
rows, findings = [], []

def finding(plant, code, severity, field, current, explanation, correction):
    findings.append({
        'external_id': plant['external_id'], 'latin': plant['latin'], 'code': code,
        'severity': severity, 'field': field, 'current': current,
        'finding': explanation, 'recommended_action': correction,
        'confidence': 'confirmed_from_code_and_catalogue',
    })

for path in sorted(PLANTS.glob('*.json')):
    raw = path.read_bytes()
    plant = json.loads(raw.decode('utf-8-sig'))
    start = len(findings)
    for task, flag, interval in [
        ('watering', 'water_required', 'water_interval_days'),
        ('misting', 'moisture_required', 'moisture_interval_days'),
        ('fertilising', 'fertilize_required', 'fertilize_interval_days'),
        ('pruning', 'pruning_required', 'pruning_interval_days'),
        ('repotting', 'repot_required', 'repot_interval_months'),
    ]:
        enabled, value = plant.get(flag), plant.get(interval)
        if type(enabled) is not bool:
            finding(plant, 'invalid_task_flag', 'high', flag, enabled, 'Task recommendation flag is missing or not a boolean.', 'Validate and provide an explicit boolean.')
        if value is not None and (type(value) is not int or not 1 <= value <= 32767):
            finding(plant, 'invalid_interval', 'high', interval, value, 'Interval is outside the backend positive small-integer range.', 'Supply a positive whole number in the supported range, or null.')
        if enabled is True and value is None:
            finding(plant, 'enabled_without_interval', 'high', interval, value, f'{task} is recommended without a usable interval.', 'Supply a reviewed interval or disable the automatic recommendation.')
        if enabled is False and value is not None:
            finding(plant, 'disabled_with_interval', 'low', interval, value, f'{task} is disabled but a default interval remains.', 'Check whether this is intentional retained data; do not enable merely because a number exists.')
        limit = {'repotting': 12, 'fertilising': 90, 'watering': 90, 'misting': 90, 'pruning': 365}[task]
        if enabled is True and type(value) is int and value > limit:
            finding(plant, 'wizard_interval_truncated', 'high', interval, value,
                    f'The creation wizard reducer/slider caps {task} at {limit}, shortening this definition recommendation.',
                    'Expand the wizard control/reducer range to preserve reviewed definition values; do not shorten the botanical recommendation to fit the UI.')
    for field, allowed in [('recommended_pot_materials', pot_keys), ('recommended_soil_mixes', soil_keys)]:
        values = plant.get(field)
        if not isinstance(values, list) or any(not isinstance(v, str) for v in values):
            finding(plant, 'invalid_recommendation_list', 'high', field, values, 'Recommendations are not a list of string codes.', 'Use canonical selectable codes.')
        elif set(values) - allowed:
            finding(plant, 'recommendation_not_selectable', 'medium', field, sorted(set(values) - allowed), 'Codes do not match the actual selectable wizard options.', 'Map to supported options or introduce the missing suitable option; do not infer from the outdated TypeScript union.')
    toxic = [trait for trait in plant.get('traits', []) if trait.get('key') == 'toxic']
    if len(toxic) != 1:
        finding(plant, 'missing_or_duplicate_toxicity', 'high', 'traits.toxic', len(toxic), 'Expected one toxicity trait.', 'Review and retain one unambiguous toxicity entry.')
    missing_trait_languages = []
    for trait in plant.get('traits', []):
        text = trait.get('value', {}).get('text', {})
        missing = sorted(LANGUAGES - set(text))
        if missing:
            missing_trait_languages.append({'trait': trait.get('key'), 'languages': missing})
        for lang, value in text.items():
            if not isinstance(value, str) or not value.strip():
                finding(plant, 'empty_trait_translation', 'medium', f'traits.{trait.get("key")}.{lang}', value, 'Missing usable trait text.', 'Restore a reviewed translation.')
            elif '\ufffd' in value or re.search(r'\?{2,}', value):
                finding(plant, 'damaged_trait_encoding', 'high' if trait.get('key') == 'toxic' else 'medium', f'traits.{trait.get("key")}.{lang}', value, 'Replacement characters or repeated question marks in trait.', 'Restore the original text from a verified translation.')
    missing_description_languages = sorted(LANGUAGES - set(plant.get('translations', {})))
    if missing_trait_languages or missing_description_languages:
        finding(plant, 'missing_definition_languages', 'medium', 'translations_and_traits',
                {'missing_description_languages': missing_description_languages, 'missing_trait_languages': missing_trait_languages},
                'Definition content lacks some supported languages, including its toxicity warning. Fallback content is not a translation.',
                'Translate the reviewed meanings, including toxicity scope, into all supported languages.')
    rows.append({'external_id': plant['external_id'], 'latin': plant['latin'], 'file': path.name,
                 'sha256': hashlib.sha256(raw).hexdigest(), 'findings': len(findings) - start,
                 'toxicity_en': toxic[0].get('value', {}).get('text', {}).get('en') if toxic else None,
                 'tasks': {key: plant.get(key) for key in ['water_required', 'water_interval_days', 'moisture_required', 'moisture_interval_days', 'fertilize_required', 'fertilize_interval_days', 'pruning_required', 'pruning_interval_days', 'repot_required', 'repot_interval_months']},
                 'soils': plant.get('recommended_soil_mixes'), 'containers': plant.get('recommended_pot_materials')})

summary = {'plants': len(rows), 'finding_counts': dict(Counter(f['code'] for f in findings)),
           'affected_plants': len({f['external_id'] for f in findings}),
           'scope': 'Structural and app integration checks only. Botanical correctness requires topic evidence review.',
           'allowed_pot_codes': sorted(pot_keys), 'allowed_soil_codes': sorted(soil_keys)}
(OUT / 'structure.json').write_text(json.dumps({'summary': summary, 'coverage': rows, 'findings': findings}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
with (OUT / 'structure_findings.csv').open('w', encoding='utf-8-sig', newline='') as handle:
    writer = csv.DictWriter(handle, fieldnames=['external_id', 'latin', 'code', 'severity', 'field', 'current', 'finding', 'recommended_action', 'confidence'])
    writer.writeheader()
    writer.writerows(findings)
print(json.dumps(summary, ensure_ascii=False, indent=2))
