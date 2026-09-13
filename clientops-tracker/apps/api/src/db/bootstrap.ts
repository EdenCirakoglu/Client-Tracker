import { pathToFileURL } from 'node:url';
import { bootstrapAdministrator } from '../services/account.service';
import { pool } from './client';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  bootstrapAdministrator({
    name: process.env.BOOTSTRAP_NAME ?? '',
    email: process.env.BOOTSTRAP_EMAIL ?? '',
    password: process.env.BOOTSTRAP_PASSWORD ?? '',
  })
    .then(() => console.log('Administrator created. Bootstrap is now locked.'))
    .catch(() => {
      console.error(
        'Bootstrap refused or failed. Check configuration, password policy and whether an administrator already exists. No account was overwritten.',
      );
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
