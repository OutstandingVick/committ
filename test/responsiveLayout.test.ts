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

test('analysis states reuse the dark Committ workspace at every width', async () => {
  const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

  assert.match(styles, /--panel-accent:#52dee5/);
  assert.match(styles, /\.analysis-report \{[^}]*background-color:var\(--panel-bg\)/);
  assert.match(styles, /\.deployment-review \{[^}]*background:linear-gradient/);
  assert.match(styles, /@media \(max-width:480px\)[\s\S]*\.analysis-report,\.deployment-review \{ padding:22px 16px; \}/);
});
