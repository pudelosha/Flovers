const fs = require("fs");
const path = require("path");

function sources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === "__tests__") return [];
    const location = path.join(dir, entry.name);
    return entry.isDirectory() ? sources(location) : location.endsWith(".tsx") ? [location] : [];
  });
}

it("routes every active application modal through the shared frame", () => {
  const files = sources(path.join(process.cwd(), "src", "features"));
  const modals = files.filter(file => file.endsWith("Modal.tsx") && !file.endsWith("PlantJournalModal.tsx"));
  expect(modals.length).toBeGreaterThan(0);
  for (const file of modals) {
    const source = fs.readFileSync(file, "utf8");
    expect({ file, sharedFrame: /<(AppModalFrame|ContactModalFrame)\b/.test(source) }).toEqual({ file, sharedFrame: true });
    expect(source).not.toMatch(/<ModalCloseButton\b/);
    expect(source).not.toMatch(/(?:maxHeight|height):\s*["']86%["']/);
  }
});
