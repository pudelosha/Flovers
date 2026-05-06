import re
from collections.abc import Iterable

from .models import PlantDefinition


def normalize_plant_key(value: str) -> str:
    """
    Convert model/display plant names to the URL-safe key shape used by the API.

    Examples:
    - Echeveria 'Black Prince' -> echeveria_black_prince
    - Beta vulgaris subsp. cicla -> beta_vulgaris_subsp_cicla
    """
    if not value:
        return ""

    s = str(value).strip().lower()
    s = re.sub("[.'\u2019`,()/\\\\\\-]+", " ", s)
    s = re.sub(r"[^a-z0-9\s]+", " ", s)
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"_+", "_", s)

    return s.strip("_")


def plant_key_candidates(value: str) -> list[str]:
    """
    Return canonical and legacy key variants.

    Some seed data historically stored external_id with punctuation preserved
    (for example echeveria_'black_prince'). Recognition uses canonical keys, so
    lookup must accept both during the transition.
    """
    raw = str(value or "").strip()
    if not raw:
        return []

    variants = [
        raw,
        raw.lower(),
        re.sub(r"\s+", "_", raw.lower()),
        normalize_plant_key(raw),
    ]

    out: list[str] = []
    seen: set[str] = set()
    for item in variants:
        key = item.strip()
        if key and key not in seen:
            seen.add(key)
            out.append(key)

    return out


def resolve_plant_definition_by_key(value: str) -> PlantDefinition | None:
    candidates = plant_key_candidates(value)
    if not candidates:
        return None

    plant = PlantDefinition.objects.filter(external_id__in=candidates).first()
    if plant:
        return plant

    canonical = normalize_plant_key(value)
    if not canonical:
        return None

    for plant in PlantDefinition.objects.only("id", "external_id", "latin"):
        if (
            normalize_plant_key(plant.external_id) == canonical
            or normalize_plant_key(plant.latin) == canonical
        ):
            return plant

    return None


def map_plant_definitions_by_keys(values: Iterable[str]) -> dict[str, PlantDefinition]:
    """
    Build a canonical-key map for recognition results while matching legacy DB
    external_id values and latin names.
    """
    values = list(values)
    canonical_values = [normalize_plant_key(v) for v in values]
    canonical_values = [v for v in canonical_values if v]
    if not canonical_values:
        return {}

    exact_candidates: set[str] = set()
    for value in values:
        exact_candidates.update(plant_key_candidates(value))

    plants = list(
        PlantDefinition.objects.filter(external_id__in=exact_candidates).only(
            "external_id",
            "latin",
            "image_thumb",
        )
    )

    found_ids = {plant.id for plant in plants}
    missing = set(canonical_values)

    for plant in plants:
        missing.discard(normalize_plant_key(plant.external_id))
        missing.discard(normalize_plant_key(plant.latin))

    if missing:
        for plant in PlantDefinition.objects.only("external_id", "latin", "image_thumb"):
            if plant.id in found_ids:
                continue
            if (
                normalize_plant_key(plant.external_id) in missing
                or normalize_plant_key(plant.latin) in missing
            ):
                plants.append(plant)
                found_ids.add(plant.id)

    by_key: dict[str, PlantDefinition] = {}
    for plant in plants:
        by_key.setdefault(normalize_plant_key(plant.external_id), plant)
        by_key.setdefault(normalize_plant_key(plant.latin), plant)

    return by_key
