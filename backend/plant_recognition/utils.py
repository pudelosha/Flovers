import re

def normalize_plant_key(s: str) -> str:
    if not s:
        return ""
    s = s.strip().lower()

    # punctuation -> space
    s = re.sub(r"[.'’(),/\\\-]+", " ", s)

    # any remaining non-alnum -> space (covers × etc.)
    s = re.sub(r"[^a-z0-9\s]+", " ", s)

    # spaces -> underscores, collapse underscores
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"_+", "_", s)

    return s.strip("_")
