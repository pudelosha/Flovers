import RNFS from "react-native-fs";

const BASE_DIR = `${RNFS.DocumentDirectoryPath}/Flovers`;
const TMP_DIR = `${BASE_DIR}/tmp`;
const PLANTS_DIR = `${BASE_DIR}/plants`;
const plantMutations = new Map<string, Promise<void>>();
let lastPhotoVersion = 0;

function mutatePlantPhoto<T>(plantId: string | number, operation: () => Promise<T>): Promise<T> {
  const id = String(plantId).trim();
  const result = (plantMutations.get(id) ?? Promise.resolve()).then(operation);
  // A failed mutation must not poison later replacements or deletions.
  const settled = result.then(() => undefined, () => undefined);
  plantMutations.set(id, settled);
  void settled.then(() => {
    if (plantMutations.get(id) === settled) plantMutations.delete(id);
  });
  return result;
}

async function ensureDirs() {
  await RNFS.mkdir(TMP_DIR);
  await RNFS.mkdir(PLANTS_DIR);
}

function extFrom(nameOrUri?: string) {
  const s = nameOrUri ?? "";
  const m = s.match(/\.([a-zA-Z0-9]+)(\?|$)/);
  return (m?.[1] ?? "jpg").toLowerCase();
}

function stripFilePrefix(uriOrPath: string) {
  return uriOrPath.startsWith("file://") ? uriOrPath.replace("file://", "") : uriOrPath;
}

function withFilePrefix(path: string) {
  return path.startsWith("file://") ? path : `file://${path}`;
}

/**
 * Wizard step (temp save)
 * Copies sourceUri into Flovers/tmp/<tempKey>.<ext>
 */
export async function persistTempPlantPhoto(params: {
  sourceUri: string;
  fileNameHint?: string;
  tempKey: string; // local guid
}): Promise<string> {
  await ensureDirs();

  const ext = extFrom(params.fileNameHint || params.sourceUri);
  const destPath = `${TMP_DIR}/${params.tempKey}.${ext}`;

  const srcPath = stripFilePrefix(params.sourceUri);

  await RNFS.copyFile(srcPath, destPath);
  return withFilePrefix(destPath);
}

/**
 * Wizard finalize (after backend returns plantId)
 * Commit a new version before removing old photos. A failed move leaves the
 * previous photo intact; lookup prefers the newest committed version.
 */
export async function promoteTempPhotoToPlant(params: {
  tempPhotoUri: string;
  plantId: string | number;
}): Promise<string> {
  return mutatePlantPhoto(params.plantId, async () => {
    await ensureDirs();

    const srcPath = stripFilePrefix(params.tempPhotoUri);

    const ext = extFrom(srcPath);
    lastPhotoVersion = Math.max(Date.now(), lastPhotoVersion + 1);
    const version = `${lastPhotoVersion}-${Math.random().toString(36).slice(2, 8)}`;
    const destPath = `${PLANTS_DIR}/${params.plantId}.${version}.${ext}`;

    // Move/rename (fast if same volume)
    try {
      await RNFS.moveFile(srcPath, destPath);
    } catch (error) {
      // A native move may leave a partial destination; it must not win lookup.
      await RNFS.unlink(destPath).catch(() => {});
      throw error;
    }

    // The per-plant queue keeps newer commits out of this cleanup snapshot.
    try {
      const items = await RNFS.readDir(PLANTS_DIR);
      await Promise.all(
        items
          .filter((item) => item.isFile() && item.name.startsWith(`${params.plantId}.`) && item.path !== destPath)
          .map((item) => RNFS.unlink(item.path).catch(() => {}))
      );
    } catch {
    }
    return withFilePrefix(destPath);
  });
}

export async function deleteLocalPhoto(localUri?: string) {
  if (!localUri) return;
  const p = stripFilePrefix(localUri);
  const exists = await RNFS.exists(p);
  if (exists) await RNFS.unlink(p);
}

/**
 * (shared): resolve plant photo stored locally
 *
 * Prefer the latest committed <plantId>.<version>.<ext> replacement, falling
 * back to legacy <plantId>.<ext> photos. Return null when no photo is stored.
 */
export async function getPlantPhotoUri(plantId: string | number): Promise<string | null> {
  await plantMutations.get(String(plantId).trim());
  await ensureDirs();

  const id = String(plantId).trim();
  if (!id) return null;

  // Prefer versioned replacements, including when old-file cleanup failed.
  let files: Awaited<ReturnType<typeof RNFS.readDir>> = [];
  try {
    files = (await RNFS.readDir(PLANTS_DIR)).filter(
      (item) => item.isFile() && item.name.startsWith(`${id}.`)
    );
    const versions = files
      .filter((item) => /^\d+-[a-z0-9]*\./.test(item.name.slice(id.length + 1)))
      .sort((a, b) => Number(b.name.split(".")[1].split("-")[0]) - Number(a.name.split(".")[1].split("-")[0]));
    if (versions[0]) return withFilePrefix(versions[0].path);
  } catch {
  }

  // Backwards compatibility with photos saved as <plantId>.<ext>.
  const common = ["jpg", "jpeg", "png", "webp"];
  for (const ext of common) {
    const absPath = `${PLANTS_DIR}/${id}.${ext}`;
    const ok = await RNFS.exists(absPath);
    if (ok) return withFilePrefix(absPath);
  }

  // Legacy photos may use extensions other than the common ones above.
  return files[0]?.path ? withFilePrefix(files[0].path) : null;
}

/**
 * Delete all saved versions of this plant's photo.
 */
export async function deletePlantPhotoById(plantId: string | number) {
  return mutatePlantPhoto(plantId, async () => {
    await ensureDirs();
    const id = String(plantId).trim();
    if (!id) return;
    const files = await RNFS.readDir(PLANTS_DIR);
    await Promise.all(
      files.filter((item) => item.isFile() && item.name.startsWith(`${id}.`))
        .map((item) => RNFS.unlink(item.path))
    );
  });
}

/**
 * Optional: cleanup tmp files (useful if user abandons wizard)
 */
export async function clearTmpPhotos() {
  await ensureDirs();
  try {
    const items = await RNFS.readDir(TMP_DIR);
    await Promise.all(
      items
        .filter((x) => x.isFile())
        .map((x) => RNFS.unlink(x.path).catch(() => {}))
    );
  } catch {
    // ignore
  }
}
