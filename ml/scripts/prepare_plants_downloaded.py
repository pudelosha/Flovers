from pathlib import Path
import random
import shutil

# ----------------------------------------------------------------------
# CONFIG
# ----------------------------------------------------------------------

# NEW SOURCE (your web-scraped dataset after dedupe/YOLO filtering)
SOURCE_ROOT = Path(r"C:\Projekty\ML\Google Webscrapping\option 3")
PLANTS_LIST_PATH = SOURCE_ROOT / "plants_latin.txt"
SOURCE_DATA_DIR = SOURCE_ROOT / "Data"

# NEW TARGET
TARGET_DATA_ROOT = Path(r"C:\Projekty\Python\Flovers\ml\data\web_scrapped\images")
TRAIN_ROOT = TARGET_DATA_ROOT / "train"
VAL_ROOT = TARGET_DATA_ROOT / "val"

TRAIN_RATIO = 0.8
random.seed(42)

# Folders to ignore inside each plant folder
IGNORE_SUBFOLDERS = {"check", "duplicates"}


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------

def is_image(path: Path) -> bool:
    return path.suffix.lower() in {
        ".jpg", ".jpeg", ".png", ".bmp", ".gif",
        ".pgm", ".ppm", ".tif", ".tiff", ".webp",
    }

def plant_folder_name(plant: str) -> str:
    # Robust conversion: trim + collapse whitespace -> underscores
    return "_".join(plant.split())

def read_latin_list(path: Path) -> list[str]:
    if not path.exists():
        raise FileNotFoundError(f"Plant list file not found at {path}")

    names: list[str] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            names.append(line)

    # dedupe while preserving order
    seen = set()
    unique_names: list[str] = []
    for name in names:
        if name not in seen:
            seen.add(name)
            unique_names.append(name)
    return unique_names


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------

def main():
    TRAIN_ROOT.mkdir(parents=True, exist_ok=True)
    VAL_ROOT.mkdir(parents=True, exist_ok=True)

    latin_names = read_latin_list(PLANTS_LIST_PATH)
    print(f"Found {len(latin_names)} latin names in {PLANTS_LIST_PATH}")

    if not SOURCE_DATA_DIR.exists():
        raise FileNotFoundError(f"Source data dir not found at {SOURCE_DATA_DIR}")

    for latin in latin_names:
        species_folder = plant_folder_name(latin)
        species_dir = SOURCE_DATA_DIR / species_folder

        if not species_dir.exists() or not species_dir.is_dir():
            print(f"[WARN] Folder for '{latin}' not found at {species_dir}, skipping.")
            continue

        print(f"[INFO] Processing species: {latin} -> {species_dir.name}")

        # Only take images in the plant folder root (not inside check/duplicates/etc.)
        all_images = [p for p in species_dir.iterdir() if p.is_file() and is_image(p)]

        if len(all_images) < 2:
            print(
                f"[WARN] Only {len(all_images)} image(s) for '{latin}', "
                f"skipping this species (need at least 2)."
            )
            continue

        random.shuffle(all_images)

        # ensure at least 1 train and 1 val image
        n_total = len(all_images)
        n_train = int(n_total * TRAIN_RATIO)
        n_train = max(1, min(n_train, n_total - 1))

        train_imgs = all_images[:n_train]
        val_imgs = all_images[n_train:]

        train_species_dir = TRAIN_ROOT / species_folder
        val_species_dir = VAL_ROOT / species_folder
        train_species_dir.mkdir(parents=True, exist_ok=True)
        val_species_dir.mkdir(parents=True, exist_ok=True)

        for src in train_imgs:
            shutil.copy2(src, train_species_dir / src.name)

        for src in val_imgs:
            shutil.copy2(src, val_species_dir / src.name)

        print(
            f"[OK] '{latin}': {len(train_imgs)} train, {len(val_imgs)} val "
            f"(total {n_total})"
        )

    print("\nAll done. Dataset created under:")
    print(f"  Train: {TRAIN_ROOT}")
    print(f"  Val:   {VAL_ROOT}")


if __name__ == "__main__":
    main()
