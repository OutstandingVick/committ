import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Committ uses one semantic typography scale across the landing flow', async () => {
  const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

  assert.match(styles, /--type-caption:\.8125rem/);
  assert.match(styles, /--type-body:1rem/);
  assert.match(styles, /--type-display:clamp\(3\.5rem,7\.1vw,7\.25rem\)/);
  assert.match(styles, /--measure-reading:68ch/);
  assert.match(styles, /\.hero h1 \{[^}]*font-size:var\(--type-display\)/);
  assert.match(styles, /\.report-summary \{[^}]*max-width:var\(--measure-reading\)/);
});

test('typography remains readable and stable in interactive states', async () => {
  const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

  assert.match(styles, /html \{[^}]*-webkit-font-smoothing:antialiased/);
  assert.match(styles, /\.repo-input-row input \{[^}]*font-size:var\(--type-body\)/);
  assert.match(styles, /\.transaction-review dd \{[^}]*font-variant-numeric:tabular-nums slashed-zero/);
  assert.match(styles, /@media \(max-width:480px\)[\s\S]*\.repo-input-row input \{ font-size:16px/);
  assert.doesNotMatch(styles, /font-size:\.(?:6|65|66|67|68|69|7|72|73)rem/);
});
