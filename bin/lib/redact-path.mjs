/**
 * redact-path.mjs — strip local usernames from path-like strings.
 *
 * Why: pre-v0.1.1, state files (STATE.json, brief.json, etc.) wrote
 * raw absolute paths like `/home/alice/proj`. When the target plugin
 * later committed `.conductor/` to a public repo, the Linux/macOS/
 * Windows username leaked.
 *
 * `redactPath` rewrites just the home-directory segment to `<user>`.
 * `redactObject` walks an object recursively and applies `redactPath`
 * to any string field that looks like a home-directory path.
 *
 * Per CR-4 (docs/REVIEW.md, v0.1.1). No external deps.
 */

export function redactPath(p) {
  if (typeof p !== 'string') return p;
  return p
    .replace(/^\/home\/[^/]+/, '/home/<user>')
    .replace(/^\/Users\/[^/]+/, '/Users/<user>')
    .replace(/^([A-Z]):\\Users\\[^\\]+/i, '$1:\\Users\\<user>')
    .replace(/^\\\\\?\\([A-Z]):\\Users\\[^\\]+/i, '\\\\?\\$1:\\Users\\<user>');
}

function looksLikeHomePath(s) {
  return (
    s.startsWith('/home/') ||
    s.startsWith('/Users/') ||
    /^[A-Z]:\\Users\\/i.test(s) ||
    /^\\\\\?\\[A-Z]:\\Users\\/i.test(s)
  );
}

export function redactObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return looksLikeHomePath(obj) ? redactPath(obj) : obj;
  }
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactObject);

  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = redactObject(v);
  }
  return result;
}
