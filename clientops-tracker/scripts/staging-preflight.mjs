import { readFileSync } from 'node:fs';
import { validatePrivateStaging } from './lib/private-staging.mjs';

const options = {};
try {
  for (const arg of process.argv.slice(2)) {
    const match = /^--(config|revision|mode)=(.+)$/.exec(arg);
    if (!match || options[match[1]]) throw new Error();
    options[match[1]] = match[2];
  }
  if (!options.config || !options.revision || !options.mode) throw new Error();
} catch {
  console.error(
    'Use --config=<private-rendered-json> --revision=<full-sha> --mode=install|convert|update.',
  );
  process.exit(1);
}
let config;
try {
  config = JSON.parse(readFileSync(options.config, 'utf8'));
} catch {
  console.error('Cannot read private rendered configuration. No values were logged.');
  process.exit(1);
}
try {
  console.log(JSON.stringify(validatePrivateStaging(config, options), null, 2));
} catch (error) {
  // The validator emits fixed messages only; parser exceptions never expose secret URLs.
  console.error(error.message);
  process.exitCode = 1;
}
