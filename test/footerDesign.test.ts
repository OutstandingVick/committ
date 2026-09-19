import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('footer redesign preserves Committ content and scopes its artwork', async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
  ]);

  assert.equal(page.match(/Committ \/ developer onboarding as a product/g)?.length, 1);
  assert.equal(page.match(/Built for Solana/g)?.length, 1);
  assert.match(page, /className="footer-atmosphere" aria-hidden="true"/);
  assert.doesNotMatch(page, /Secure Anchor|Expert Witness|Privacy Policy/);
  assert.match(styles, /\.site-footer \{[^}]*background-color:#020405/);
  assert.match(styles, /\.footer-atmosphere::after \{[^}]*radial-gradient/);
  assert.match(styles, /@media \(max-width:720px\)[\s\S]*\.footer-frame/);
});
