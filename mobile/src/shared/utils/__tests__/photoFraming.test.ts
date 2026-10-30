import { DEFAULT_PHOTO_FRAMING, normalizePhotoFraming, panPhotoFraming, photoImageLayout, samePhotoFraming, zoomPhotoFraming } from "../photoFraming";

const detail = { width: 320, height: 200 };
const tile = { width: 320, height: 88 };

it.each([{ width: 960, height: 1280 }, { width: 1600, height: 600 }, { width: 800, height: 800 }])(
  "shows the exact guide band from the detail canvas in the wide tile: %j", source => {
    const framing = { focal_x: 0.6, focal_y: 0.4, zoom: 2 };
    const red = photoImageLayout(source, detail, framing);
    const blue = photoImageLayout(source, tile, framing);
    expect(blue.width).toBeCloseTo(red.width);
    expect(blue.height).toBeCloseTo(red.height);
    expect(blue.left).toBeCloseTo(red.left);
    expect(blue.top).toBeCloseTo(red.top - (detail.height - tile.height) / 2);
    expect(blue.framing).toEqual(red.framing);
  });

it("moves the image under the fixed guides instead of changing their size", () => {
  const source = { width: 960, height: 1280 };
  const start = { ...DEFAULT_PHOTO_FRAMING, zoom: 2 };
  const before = photoImageLayout(source, detail, start);
  const moved = panPhotoFraming(source, detail, start, 24, -16);
  const after = photoImageLayout(source, detail, moved);
  expect(after.left - before.left).toBeCloseTo(24);
  expect(after.top - before.top).toBeCloseTo(-16);
  expect(after.width).toBe(before.width);
});

it("keeps the image point under an off-center pinch in place", () => {
  const source = { width: 960, height: 1280 };
  const framing = { ...DEFAULT_PHOTO_FRAMING, zoom: 2 };
  const anchor = { x: 120, y: 60 };
  const before = photoImageLayout(source, detail, framing);
  const after = photoImageLayout(source, detail, zoomPhotoFraming(source, detail, framing, 3, anchor));
  expect((anchor.x - before.left) / before.width).toBeCloseTo((anchor.x - after.left) / after.width);
  expect((anchor.y - before.top) / before.height).toBeCloseTo((anchor.y - after.top) / after.height);
});

it("never exposes blank edges in either guide, including extreme panning", () => {
  const source = { width: 1600, height: 600 };
  const framing = panPhotoFraming(source, detail, { ...DEFAULT_PHOTO_FRAMING, zoom: 4 }, 100000, -100000);
  for (const viewport of [detail, tile]) {
    const image = photoImageLayout(source, viewport, framing);
    expect(image.left).toBeLessThanOrEqual(0);
    expect(image.top).toBeLessThanOrEqual(0);
    expect(image.left + image.width).toBeGreaterThanOrEqual(viewport.width - 0.000001);
    expect(image.top + image.height).toBeGreaterThanOrEqual(viewport.height - 0.000001);
  }
});

it("keeps the same source crop after reopening on a larger screen or using a thumbnail", () => {
  const framing = { focal_x: 0.45, focal_y: 0.62, zoom: 1.8 };
  const small = photoImageLayout({ width: 960, height: 1280 }, detail, framing);
  const large = photoImageLayout({ width: 240, height: 320 }, { width: 640, height: 400 }, framing);
  expect(large.left / large.width).toBeCloseTo(small.left / small.width);
  expect(large.top / large.height).toBeCloseTo(small.top / small.height);
  expect(large.width / 640).toBeCloseTo(small.width / 320);
});

it("bounds zoom and invalid saved values and compares defaults with old metadata", () => {
  expect(normalizePhotoFraming({ focal_x: NaN, focal_y: Infinity, zoom: -2 })).toEqual(DEFAULT_PHOTO_FRAMING);
  expect(normalizePhotoFraming({ focal_x: -1, focal_y: 2, zoom: 100 })).toEqual({ focal_x: 0, focal_y: 1, zoom: 4 });
  expect(samePhotoFraming(undefined, DEFAULT_PHOTO_FRAMING)).toBe(true);
  expect(samePhotoFraming(DEFAULT_PHOTO_FRAMING, { ...DEFAULT_PHOTO_FRAMING, zoom: 1.5 })).toBe(false);
});
