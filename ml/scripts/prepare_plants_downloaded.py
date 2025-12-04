from pathlib import Path
import random
import shutil


# ----------------------------------------------------------------------
# CONFIG: adjust only if your paths change
# ----------------------------------------------------------------------

# Where the downloader is putting plant folders + plants_latin.txt
SOURCE_ROOT = Path(r"C:\Users\user\OneDrive\Pulpit\Plants")

# The text file listing latin names (one per line)
PLANTS_LIST_PATH = SOURCE_ROOT / "plants_latin.txt"

# Target dataset root inside your project
TARGET_DATA_ROOT = Path(
    r"C:\Projekty\Python\Flovers\ml\data\plants_downloaded\images"
)
TRAIN_ROOT = TARGET_DATA_ROOT / "train"
VAL_ROOT = TARGET_DATA_ROOT / "val"

# Train/val split ratio (80% train, 20% val)
TRAIN_RATIO = 0.8

# For reproducible splits
random.seed(42)


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------


def is_image(path: Path) -> bool:
    """Basic image file check by extension."""
    return path.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".gif"}


def read_latin_list(path: Path) -> list[str]:
    """
    Read latin names from plants_latin.txt.
    Assumes one name per line. Ignores empty lines and comments (#).
    """
    if not path.exists():
        raise FileNotFoundError(f"plants_latin.txt not found at {path}")

    names: list[str] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith("#"):
                continue
            names.append(line)

    # Remove duplicates while preserving order
    seen = set()
    unique_names: list[str] = []
    for name in names:
        if name not in seen:
            seen.add(name)
            unique_names.append(name)

    return unique_names


# ----------------------------------------------------------------------
# Main logic
# ----------------------------------------------------------------------


def main():
    # Create target folders if needed
    TRAIN_ROOT.mkdir(parents=True, exist_ok=True)
    VAL_ROOT.mkdir(parents=True, exist_ok=True)

    latin_names = read_latin_list(PLANTS_LIST_PATH)
    print(f"Found {len(latin_names)} latin names in {PLANTS_LIST_PATH}")

    for latin in latin_names:
        species_dir = SOURCE_ROOT / latin
        if not species_dir.exists() or not species_dir.is_dir():
            print(f"[WARN] Folder for '{latin}' not found at {species_dir}, skipping.")
            continue

        print(f"[INFO] Processing species: {latin}")

        # Collect images
        all_images = [p for p in species_dir.iterdir() if p.is_file() and is_image(p)]
        if not all_images:
            print(f"[WARN]  No images found for '{latin}', skipping.")
            continue

        # Shuffle & split
        random.shuffle(all_images)
        n_train = int(len(all_images) * TRAIN_RATIO)
        train_imgs = all_images[:n_train]
        val_imgs = all_images[n_train:]

        train_species_dir = TRAIN_ROOT / latin
        val_species_dir = VAL_ROOT / latin
        train_species_dir.mkdir(parents=True, exist_ok=True)
        val_species_dir.mkdir(parents=True, exist_ok=True)

        # Copy files (use shutil.move if you want to move instead)
        for src in train_imgs:
            dst = train_species_dir / src.name
            shutil.copy2(src, dst)

        for src in val_imgs:
            dst = val_species_dir / src.name
            shutil.copy2(src, dst)

        print(
            f"[OK]  '{latin}': {len(train_imgs)} train, {len(val_imgs)} val "
            f"(total {len(all_images)})"
        )

    print("\nAll done. Dataset created under:")
    print(f"  Train: {TRAIN_ROOT}")
    print(f"  Val:   {VAL_ROOT}")


if __name__ == "__main__":
    main()
