import RNFS from "react-native-fs";

const BASE_DIR = `${RNFS.DocumentDirectoryPath}/Flovers`;
const TMP_DIR = `${BASE_DIR}/tmp`;
const PLANTS_DIR = `${BASE_DIR}/plants`;

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
 * Moves Flovers/tmp/<tempKey>.<ext> -> Flovers/plants/<plantId>.<ext>
 */
export async function promoteTempPhotoToPlant(params: {
  tempPhotoUri: string;
  plantId: string | number;
}): Promise<string> {
  await ensureDirs();

  const srcPath = stripFilePrefix(params.tempPhotoUri);

  const ext = extFrom(srcPath);
  const destPath = `${PLANTS_DIR}/${params.plantId}.${ext}`;

  // Move/rename (fast if same volume)
  await RNFS.moveFile(srcPath, destPath);
  return withFilePrefix(destPath);
}

export async function deleteLocalPhoto(localUri?: string) {
  if (!localUri) return;
  const p = stripFilePrefix(localUri);
  const exists = await RNFS.exists(p);
  if (exists) await RNFS.unlink(p);
}

/**
 * ✅ NEW (shared): resolve plant photo stored locally
 *
 * Returns:
 * - `file://.../Flovers/plants/<plantId>.<ext>` if present
 * - otherwise `null`
 *
 * Implementation:
 * 1) Fast path: try common extensions
 * 2) Fallback: scan PLANTS_DIR and find any file that starts with "<plantId>."
 */
export async function getPlantPhotoUri(plantId: string | number): Promise<string | null> {
  await ensureDirs();

  const id = String(plantId).trim();
  if (!id) return null;

  // Fast path: try common extensions
  const common = ["jpg", "jpeg", "png", "webp"];
  for (const ext of common) {
    const absPath = `${PLANTS_DIR}/${id}.${ext}`;
    const ok = await RNFS.exists(absPath);
    if (ok) return withFilePrefix(absPath);
  }

  // Fallback: directory scan (handles whatever ext you moved with)
  try {
    const items = await RNFS.readDir(PLANTS_DIR);
    const hit = items.find((x) => x.isFile() && x.name.startsWith(`${id}.`));
    if (hit?.path) return withFilePrefix(hit.path);
  } catch {
    // ignore
  }

  return null;
}

/**
 * Optional: delete a plant photo by plantId (uses getPlantPhotoUri)
 */
export async function deletePlantPhotoById(plantId: string | number) {
  const uri = await getPlantPhotoUri(plantId);
  if (uri) await deleteLocalPhoto(uri);
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
