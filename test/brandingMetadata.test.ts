import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('browser metadata uses the Committ title and favicon', async () => {
  const [layout, favicon, manifestSource] = await Promise.all([
    readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8'),
    readFile(new URL('../public/site.webmanifest', import.meta.url), 'utf8'),
  ]);
  const manifest = JSON.parse(manifestSource) as {
    name?: string;
    icons?: Array<{ src?: string; type?: string }>;
  };

  assert.match(layout, /default: 'Committ'/);
  assert.match(layout, /url: '\/favicon\.svg'/);
  assert.match(favicon, /fill="#52DEE5"/);
  assert.equal(manifest.name, 'Committ');
  assert.deepEqual(manifest.icons?.[0], {
    src: '/favicon.svg',
    sizes: 'any',
    type: 'image/svg+xml',
    purpose: 'any maskable',
  });
});
