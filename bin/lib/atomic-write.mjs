/**
 * atomic-write.mjs — POSIX-style atomic file writes
 *
 * Pattern: write to a sibling tempfile, then rename onto the target.
 * `rename` is atomic on the same filesystem on POSIX and on Windows
 * (since Node uses MoveFileEx with MOVEFILE_REPLACE_EXISTING).
 *
 * Use for STATE.json and checkpoint/report JSONs — anything where a
 * partial write would corrupt /conductor:resume. Plain append-only
 * markdown (decisions.md, discoveries.md) does NOT need this.
 *
 * No external deps. Node 20+ only.
 */

import { writeFile, rename, unlink } from 'node:fs/promises';

function tmpPath(target) {
  return `${target}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
}

export async function atomicWriteText(target, text) {
  const tmp = tmpPath(target);
  try {
    await writeFile(tmp, text);
    await rename(tmp, target);
  } catch (err) {
    try { await unlink(tmp); } catch {}
    throw err;
  }
}

export async function atomicWriteJSON(target, obj) {
  await atomicWriteText(target, JSON.stringify(obj, null, 2) + '\n');
}
