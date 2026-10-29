const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { createHash } = require("node:crypto");
const { generateBuildInfo, readCommit } = require("../generate-build-info");

const noGit = () => { throw new Error("Git is not installed"); };
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "flovers-build-info-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".git", "refs", "heads"), { recursive: true });
  fs.mkdirSync(path.join(root, ".git", "objects"));
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ version: "1.0.0" }));
  fs.writeFileSync(path.join(root, ".git", "HEAD"), "ref: refs/heads/main\n");
  return root;
}
function commit(root, instant = "2026-10-28T23:30:00Z", offset = "+0200") {
  const epoch = Date.parse(instant) / 1000;
  const data = `tree ${"0".repeat(40)}\nauthor Test <test@example.test> ${epoch} ${offset}\ncommitter Test <test@example.test> ${epoch} ${offset}\n\nFixture\n`;
  const object = Buffer.from(`commit ${Buffer.byteLength(data)}\0${data}`);
  const sha = createHash("sha1").update(object).digest("hex");
  const directory = path.join(root, ".git", "objects", sha.slice(0, 2));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, sha.slice(2)), zlib.deflateSync(object));
  fs.writeFileSync(path.join(root, ".git", "refs", "heads", "main"), sha + "\n");
  return sha;
}

test("uses the commit's calendar date and SHA even without Git in PATH", t => {
  const root = fixture(t); const sha = commit(root);
  assert.deepEqual(readCommit(root, noGit), { sha, date: "2026-10-29" });
  fs.writeFileSync(path.join(root, ".git", "HEAD"), sha + "\n");
  assert.deepEqual(readCommit(root, noGit), { sha, date: "2026-10-29" });
});

test("uses Git metadata for packed repositories without substituting today's date", () => {
  const sha = "a".repeat(40);
  const git = (command, args) => {
    assert.equal(command, "git"); assert.equal(args.at(-1), "HEAD");
    return `${sha}\n2024-01-02T23:45:00-08:00\n`;
  };
  assert.deepEqual(readCommit(os.tmpdir(), git), { sha, date: "2024-01-02" });
});

test("resolves worktree pointers and common packed refs", t => {
  const root = fixture(t); const sha = commit(root);
  fs.writeFileSync(path.join(root, ".git", "packed-refs"), `${sha} refs/heads/main\n`);
  fs.unlinkSync(path.join(root, ".git", "refs", "heads", "main"));
  const worktree = path.join(root, "linked");
  const gitDir = path.join(root, ".git", "worktrees", "linked");
  fs.mkdirSync(worktree); fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(path.join(worktree, ".git"), "gitdir: ../.git/worktrees/linked\n");
  fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/main\n");
  fs.writeFileSync(path.join(gitDir, "commondir"), "../..\n");
  assert.deepEqual(readCommit(worktree, noGit), { sha, date: "2026-10-29" });
});

test("updates after a new commit and avoids rewriting unchanged metadata", t => {
  const root = fixture(t); const sha = commit(root);
  assert.deepEqual(generateBuildInfo(root), { version: "1.0.0", releaseTag: sha.slice(0, 7), releaseDate: "2026-10-29" });
  const target = path.join(root, "src", "buildInfo.ts");
  fs.utimesSync(target, new Date("2000-01-01Z"), new Date("2000-01-01Z"));
  generateBuildInfo(root);
  assert.equal(fs.statSync(target).mtime.getUTCFullYear(), 2000);
  const next = commit(root, "2026-11-01T12:00:00Z");
  assert.deepEqual(generateBuildInfo(root), { version: "1.0.0", releaseTag: next.slice(0, 7), releaseDate: "2026-11-01" });
});

test("fails clearly when commit information is unavailable", t => {
  const root = fixture(t);
  assert.throws(() => readCommit(root, noGit), /Cannot generate app build information/);
});
