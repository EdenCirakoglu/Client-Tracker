import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    migrate: 'src/db/migrate.ts',
    seed: 'src/db/seed.ts',
    fingerprint: 'src/db/fingerprint.ts',
    bootstrap: 'src/db/bootstrap.ts',
    'mail-worker': 'src/mail-worker.ts',
    'restore-sanitize': 'src/db/restore-sanitize.ts',
    maintenance: 'src/db/maintenance.ts',
    'provision-roles': 'src/db/provision-roles.ts',
    'check-runtime-role': 'src/db/check-runtime-role.ts',
  },
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  clean: true,
});
