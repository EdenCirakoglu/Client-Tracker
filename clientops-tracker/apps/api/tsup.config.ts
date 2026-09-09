import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    migrate: 'src/db/migrate.ts',
    seed: 'src/db/seed.ts',
    fingerprint: 'src/db/fingerprint.ts',
  },
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  clean: true,
});
