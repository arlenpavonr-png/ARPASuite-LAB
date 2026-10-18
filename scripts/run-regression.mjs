/**
 * Runner único de regresión LAB (sin e2e, sin red de producción).
 * Uso desde la raíz: node scripts/run-regression.mjs
 * Se detiene en el primer código de salida distinto de 0.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FENCE = 'scripts/check-production-fence.mjs';

const STEPS = [
  'js/arpa-ia/tests/cotizador-run.mjs',
  'js/arpa-ia/tests/tecnica-run.mjs',
  'js/arpa-ia/tests/informes-run.mjs',
  'js/arpa-ia/tests/comercial-run.mjs',
  'js/arpa-ia/copiloto/copiloto-tests.mjs',
  'js/arpa-ia/integral/integral-tests.mjs',
  'next/tests/run.mjs',
  'next/tests/stages.mjs'
];

console.log('\n======== ' + FENCE + ' ========');
const fence = spawnSync(process.execPath, [FENCE], {
  cwd: root,
  stdio: 'inherit'
});
if (fence.status !== 0) {
  console.error('\nREGRESSION STOP: production fence failed.');
  process.exit(1);
}

let passed = 0;
for (const rel of STEPS) {
  console.log('\n======== ' + rel + ' ========');
  const result = spawnSync(process.execPath, [rel], {
    cwd: root,
    stdio: 'inherit'
  });
  const code = result.status;
  if (code !== 0) {
    console.error('\nFALLO: ' + rel + '  exit ' + (code == null ? 'null' : code));
    process.exit(code == null ? 1 : code);
  }
  passed += 1;
}

console.log('\nOK: ' + passed + '/' + STEPS.length + ' suites pasaron.');
