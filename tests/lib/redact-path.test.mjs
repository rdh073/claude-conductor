import test from 'node:test';
import assert from 'node:assert/strict';
import { redactPath, redactObject } from '../../bin/lib/redact-path.mjs';

test('redactPath: linux home', () => {
  assert.equal(redactPath('/home/alice/foo'), '/home/<user>/foo');
  assert.equal(redactPath('/home/john.doe/bar'), '/home/<user>/bar');
});

test('redactPath: mac home', () => {
  assert.equal(redactPath('/Users/alice/code'), '/Users/<user>/code');
});

test('redactPath: windows home', () => {
  assert.equal(redactPath('C:\\Users\\Bob\\repo'), 'C:\\Users\\<user>\\repo');
});

test('redactPath: no-op for non-home paths', () => {
  assert.equal(redactPath('/tmp/foo'), '/tmp/foo');
  assert.equal(redactPath('/var/log/syslog'), '/var/log/syslog');
});

test('redactObject: recursive', () => {
  const input = {
    cwd: '/home/alice/proj',
    nested: { working_dir: '/home/alice/proj' },
    list: ['/home/alice/a', 'not-a-path']
  };
  const out = redactObject(input);
  assert.equal(out.cwd, '/home/<user>/proj');
  assert.equal(out.nested.working_dir, '/home/<user>/proj');
  assert.deepEqual(out.list, ['/home/<user>/a', 'not-a-path']);
});

test('redactObject: preserves null/numbers/booleans', () => {
  assert.deepEqual(
    redactObject({ a: null, b: 42, c: true, d: '/home/x/y' }),
    { a: null, b: 42, c: true, d: '/home/<user>/y' }
  );
});

test('redactObject: empty object', () => {
  assert.deepEqual(redactObject({}), {});
});
