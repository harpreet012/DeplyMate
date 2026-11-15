
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('dashboard application entry exists', async () => {
  const appSource = await readFile(
    new URL('../src/App.jsx', import.meta.url),
    'utf8'
  );

  const apiSource = await readFile(
    new URL('../src/api.js', import.meta.url),
    'utf8'
  );

  // Verify application branding
  assert.match(appSource, /deploymate/i);

  // Verify application routing
  assert.match(appSource, /BrowserRouter/);
  assert.match(appSource, /Routes/);
  assert.match(appSource, /Pipelines/);

  // Verify health API integration
  assert.match(apiSource, /api\/health/);
});
