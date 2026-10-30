export type PhotoFraming = { focal_x: number; focal_y: number; zoom: number };
export type PhotoSize = { width: number; height: number };
export type PhotoPoint = { x: number; y: number };

export const PHOTO_DETAILS_ASPECT_RATIO = 1.6;
export const PHOTO_MIN_ZOOM = 1;
export const PHOTO_MAX_ZOOM = 4;
export const DEFAULT_PHOTO_FRAMING: PhotoFraming = Object.freeze({ focal_x: 0.5, focal_y: 0.5, zoom: 1 });

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function normalizePhotoFraming(value?: Partial<PhotoFraming> | null): PhotoFraming {
  return {
    focal_x: clamp(finite(value?.focal_x, 0.5), 0, 1),
    focal_y: clamp(finite(value?.focal_y, 0.5), 0, 1),
    zoom: clamp(finite(value?.zoom, 1), PHOTO_MIN_ZOOM, PHOTO_MAX_ZOOM),
  };
}

/**
 * Both views crop the same virtual 1.6:1 canvas. A wide tile reveals its
 * middle band instead of applying a second, unrelated cover/zoom operation.
 */
export function photoImageLayout(source: PhotoSize, viewport: PhotoSize, value?: Partial<PhotoFraming> | null) {
  const framing = normalizePhotoFraming(value);
  const referenceHeight = Math.max(viewport.height, viewport.width / PHOTO_DETAILS_ASPECT_RATIO);
  const scale = Math.max(viewport.width / source.width, referenceHeight / source.height) * framing.zoom;
  const width = source.width * scale;
  const height = source.height * scale;
  const marginX = Math.min(0.5, viewport.width / (2 * width));
  const marginY = Math.min(0.5, referenceHeight / (2 * height));
  const bounded = {
    focal_x: clamp(framing.focal_x, marginX, 1 - marginX),
    focal_y: clamp(framing.focal_y, marginY, 1 - marginY),
    zoom: framing.zoom,
  };
  return { width, height, left: viewport.width / 2 - bounded.focal_x * width,
    top: viewport.height / 2 - bounded.focal_y * height, framing: bounded };
}

export function panPhotoFraming(source: PhotoSize, viewport: PhotoSize, value: PhotoFraming, dx: number, dy: number): PhotoFraming {
  const image = photoImageLayout(source, viewport, value);
  return photoImageLayout(source, viewport, {
    ...image.framing, focal_x: image.framing.focal_x - dx / image.width,
    focal_y: image.framing.focal_y - dy / image.height,
  }).framing;
}

/** Keep the source point under the pinch midpoint in place while zooming. */
export function zoomPhotoFraming(source: PhotoSize, viewport: PhotoSize, value: PhotoFraming, zoom: number,
  anchor: PhotoPoint = { x: viewport.width / 2, y: viewport.height / 2 }): PhotoFraming {
  const before = photoImageLayout(source, viewport, value);
  const nextZoom = normalizePhotoFraming({ ...value, zoom }).zoom;
  const factor = nextZoom / before.framing.zoom;
  const width = before.width * factor;
  const height = before.height * factor;
  return photoImageLayout(source, viewport, {
    zoom: nextZoom,
    focal_x: (viewport.width / 2 - anchor.x + (anchor.x - before.left) * factor) / width,
    focal_y: (viewport.height / 2 - anchor.y + (anchor.y - before.top) * factor) / height,
  }).framing;
}

export function samePhotoFraming(a?: Partial<PhotoFraming> | null, b?: Partial<PhotoFraming> | null) {
  const one = normalizePhotoFraming(a); const two = normalizePhotoFraming(b);
  return Math.abs(one.focal_x - two.focal_x) < 0.00001
    && Math.abs(one.focal_y - two.focal_y) < 0.00001 && Math.abs(one.zoom - two.zoom) < 0.00001;
}
