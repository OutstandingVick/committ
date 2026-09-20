import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('landing page keeps responsive safeguards for tablet and phone widths', async () => {
  const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

  assert.match(styles, /--page-gutter:clamp\(18px,5vw,96px\)/);
  assert.match(styles, /html \{[^}]*overflow-x:clip/);
  assert.match(styles, /@media \(max-width:1120px\)[\s\S]*\.network-pill \{ display:none; \}/);
  assert.match(styles, /@media \(max-width:860px\)[\s\S]*\.stage-grid \{ grid-template-columns:1fr; \}/);
  assert.match(styles, /@media \(max-width:480px\)[\s\S]*\.hero h1 \{ font-size:clamp\(2\.75rem,14vw,4rem\)/);
  assert.match(styles, /@media \(max-width:480px\)[\s\S]*\.transaction-review dl div \{ grid-template-columns:1fr; \}/);
});
