// scripts/generate-build-info.js
const fs = require("fs");
const pkg = require("../package.json");
const { execSync } = require("child_process");

function fallbackSha() {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

const version = pkg.version;
const releaseTag =
  process.env.GITHUB_REF_NAME ||
  process.env.GITHUB_SHA?.slice(0, 7) ||
  fallbackSha();

const releaseDate = new Date().toISOString().split("T")[0];

const content = `export const BUILD_INFO = {
  version: "${version}",
  releaseTag: "${releaseTag}",
  releaseDate: "${releaseDate}",
};
`;

fs.writeFileSync("./src/buildInfo.ts", content);