import { readdir, rm } from "node:fs/promises";
import path from "node:path";

// Remove older semver-named release folders while keeping the newest one.
const RELEASE_DIR = path.resolve(process.cwd(), "release");
const SEMVER_DIR = /^\d+\.\d+\.\d+$/;
const KEEP_RELEASES = 1;

function compareSemverDesc(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);

  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) {
      return pb[i] - pa[i];
    }
  }

  return 0;
}

async function main() {
  const entries = await readdir(RELEASE_DIR, { withFileTypes: true });
  const releaseFolders = entries
    .filter((entry) => entry.isDirectory() && SEMVER_DIR.test(entry.name))
    .map((entry) => entry.name)
    .sort(compareSemverDesc);

  if (releaseFolders.length <= KEEP_RELEASES) {
    console.log("No old release folders to remove.");
    return;
  }

  const keep = releaseFolders.slice(0, KEEP_RELEASES);
  const remove = releaseFolders.slice(KEEP_RELEASES);

  console.log(`Keeping latest release: ${keep.join(", ")}`);

  for (const folder of remove) {
    const target = path.join(RELEASE_DIR, folder);
    await rm(target, { recursive: true, force: true });
    console.log(`Removed old release folder: ${folder}`);
  }
}

main().catch((error) => {
  console.error("Failed to clean old release folders.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
