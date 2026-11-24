import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Publish only these files, never the portal checkout or its private configuration.
const directory = fileURLToPath(new URL('./dist/', import.meta.url));
const files = {
  'index.html': './index.html',
  'service.css': './service.css',
  'journal-v3.png': '../apps/web/public/brand/journal-v3.png',
};
mkdirSync(directory, { recursive: true });
if (
  readdirSync(directory, { withFileTypes: true }).some(
    (entry) => !entry.isFile() || !Object.hasOwn(files, entry.name),
  )
)
  throw new Error('Unexpected file in static output. Use a clean checkout.');
for (const [name, source] of Object.entries(files))
  copyFileSync(new URL(source, import.meta.url), join(directory, name));
