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
import { redactObject } from './redact-path.mjs';

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

/**
 * atomicWriteJSON — write JSON with home-directory paths redacted by default.
 *
 * Per CR-4 (v0.1.1): state-file writes used to leak `/home/<user>/…` paths.
 * `redactObject` walks the object and rewrites home segments to `<user>`.
 * Pass `{ skipRedaction: true }` only when the path IS the data (rare —
 * e.g. logging the absolute path of an error source for debug). Default
 * is REDACT.
 */
export async function atomicWriteJSON(target, obj, opts = {}) {
  const data = opts.skipRedaction ? obj : redactObject(obj);
  await atomicWriteText(target, JSON.stringify(data, null, 2) + '\n');
}
