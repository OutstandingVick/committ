import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// A real key value: not empty, not a <PLACEHOLDER>, not an obvious test value.
const API_KEY = /api[-_]?key=(?!<|test\b|SECRET)[A-Za-z0-9-]{8,}/i;

test('no RPC API keys are committed', () => {
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const leaks = files.filter((file) => {
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      return false;
    }
    return API_KEY.test(text);
  });
  assert.deepEqual(leaks, [], `Possible committed API key in: ${leaks.join(', ')}`);
});
