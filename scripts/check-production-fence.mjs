/**
 * Fence de producción LAB.
 * Detecta cambios peligrosos vs HEAD. No reescribe nada.
 * Uso: node scripts/check-production-fence.mjs
 * Exit 0 = PASS, 1 = FAIL.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PROTECTED = new Set([
  'manifest.json',
  'arpa-licencias-apps-script.gs',
  '.github/workflows/pages.yml',
  'service-worker.js',
  'index.html',
  'js/arpa-brand.js',
  'js/arpa-cloud-sync.js',
  'js/arpa-trial-capture.js',
  'js/arpa-cotizacion.js'
]);

const PROD_IDS = [
  'AKfycbzKBeyDVWVqPG1R47EZTVKmCpa3SOwxs8LXrW4ipvRtiyyRV4trJKg7D4i89_cUTcH2',
  'AKfycbyV0-C_XACD5suCh9gm1JkiKvrI3mket-z5GSFGFc6Y87HZaqFyCtVz7jmtQMayNEUeJg',
  '154LeJlcAPa3dlWxXHC2WA2_xFNL4oQ45I8630Kzcd3E',
  'formato-arlenpav',
  'arpa.arpatechnologyglobal.com'
];

const CONFIG_FILE = 'js/arpa-ia/cotizador-config.js';
const SELF_FILE = 'scripts/check-production-fence.mjs';

const findings = [];

function norm(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function failGit(args, status, detail) {
  const cmd = 'git ' + args.join(' ');
  addFinding('(git)', 'GIT', 'comando git falló: ' + cmd + ' exit ' + status, {
    contexto: redact(String(detail || '')).slice(0, 160)
  });
  console.log('FAIL: Git falló (' + cmd + ', exit ' + status + '). No se interpreta stdout vacío como PASS.');
  findings.forEach(function (f) {
    console.log('- archivo: ' + f.file);
    console.log('  capa: ' + f.capa);
    console.log('  motivo: ' + f.motivo);
    if (f.linea !== '') console.log('  línea: ' + f.linea);
    if (f.contexto) console.log('  contexto: ' + f.contexto);
  });
  process.exit(1);
}

function git(args) {
  const r = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  if (r.error) failGit(args, 1, r.error.message || String(r.error));
  const status = r.status == null ? 1 : r.status;
  if (status !== 0) failGit(args, status, r.stderr || r.stdout);
  return {
    status: 0,
    stdout: r.stdout || '',
    stderr: r.stderr || ''
  };
}

function isSelfFence(rel) {
  return norm(rel) === SELF_FILE;
}

function isBExcepted(rel) {
  const n = norm(rel);
  if (n.endsWith('.md')) return true;
  if (n.startsWith('js/arpa-ia/tests/')) return true;
  if (/(^|\/)[^/]+-tests\.mjs$/.test(n)) return true;
  if (n.startsWith('next/tests/')) return true;
  return false;
}

function addFinding(file, capa, motivo, extra) {
  findings.push({
    file: norm(file),
    capa: capa,
    motivo: motivo,
    linea: extra && extra.linea != null ? extra.linea : '',
    contexto: extra && extra.contexto ? extra.contexto : ''
  });
}

function redact(text) {
  return String(text || '')
    .replace(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+/g, '[APPS_SCRIPT_URL]')
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, '[KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [redactado]')
    .replace(/ARPA_IA_LLM_KEY\s*[:=]\s*\S+/g, 'ARPA_IA_LLM_KEY=[redactado]')
    .slice(0, 160);
}

function isDocMention(line, name) {
  const t = String(line);
  if (new RegExp('(?:const|let|var)\\s+' + name + '\\s*=').test(t)) return false;
  if (new RegExp(name + '\\s*=\\s*[\'"`]').test(t)) return false;
  if (new RegExp('\\b' + name + '\\s*:').test(t) && /https?:|script\.google/.test(t)) return false;
  return true;
}

function scanAddedLine(file, lineNo, rawLine) {
  const line = String(rawLine);
  const ctx = { linea: lineNo, contexto: redact(line.trim()) };

  if (/\bLICENSE_API\b/.test(line) && !isDocMention(line, 'LICENSE_API')) {
    addFinding(file, 'B', 'introducción de LICENSE_API', ctx);
  }
  if (/\bCOT_SHEETS_URL\b/.test(line) && !isDocMention(line, 'COT_SHEETS_URL')) {
    addFinding(file, 'B', 'introducción de COT_SHEETS_URL', ctx);
  }
  if (/\bCONFIG\.SHEET_ID\b/.test(line) || /SHEET_ID\s*[:=]\s*['"][A-Za-z0-9_-]{20,}/.test(line)) {
    addFinding(file, 'B', 'asignación de SHEET_ID / CONFIG.SHEET_ID', ctx);
  }
  if (/(?:CONFIG\.)?APP_URL\s*[:=]\s*['"]https?:/.test(line) || /(?:const|let|var)\s+APP_URL\s*=/.test(line)) {
    addFinding(file, 'B', 'APP_URL de despliegue', ctx);
  }
  if (/script\.google\.com/i.test(line) && /\/exec\b/.test(line)) {
    addFinding(file, 'B', 'URL /exec de Apps Script', ctx);
  }
  for (let i = 0; i < PROD_IDS.length; i += 1) {
    if (line.indexOf(PROD_IDS[i]) !== -1) {
      addFinding(file, 'B', 'identificador de producción (blocklist)', ctx);
      break;
    }
  }
  if (/sk-[A-Za-z0-9_-]{20,}/.test(line) && !/\/sk-\[?A-Za-z0-9/.test(line) && !/sk-\[A-Za-z0-9/.test(line)) {
    addFinding(file, 'B', 'posible API key (sk-)', ctx);
  }
  if (/ARPA_IA_LLM_KEY\s*[:=]\s*['"`]?[^\s'"`;]+/.test(line) && !/ARPA_IA_LLM_KEY\s*[:=]\s*\[/.test(line)) {
    const m = line.match(/ARPA_IA_LLM_KEY\s*[:=]\s*(\S+)/);
    const val = m ? m[1].replace(/['",;]+$/g, '') : '';
    if (val && val !== "'*(tu" && !/^['"]?\s*$/.test(val) && val.toLowerCase().indexOf('redact') < 0) {
      if (!/getProperty|getProp_|Script Properties/i.test(line)) {
        addFinding(file, 'B', 'ARPA_IA_LLM_KEY con valor', ctx);
      }
    }
  }
  if (/BEGIN PRIVATE KEY/.test(line)) {
    addFinding(file, 'B', 'BEGIN PRIVATE KEY', ctx);
  }
  if (/\.pem\b/.test(file) || /^\s*.*\.pem['"]?\s*$/.test(line)) {
    if (/\.pem$/.test(norm(file))) {
      addFinding(file, 'B', 'archivo .pem', ctx);
    }
  }
  if (/Bearer\s+[A-Za-z0-9._\-]{16,}/.test(line) && !/\[redactado\]/.test(line) && !/'Bearer '\s*\+/.test(line)) {
    addFinding(file, 'B', 'Bearer seguido de token', ctx);
  }
}

function parseDiff(diffText) {
  const lines = String(diffText).split(/\r?\n/);
  let file = '';
  let newLine = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.indexOf('diff --git ') === 0) {
      file = '';
      newLine = 0;
      continue;
    }
    if (line.indexOf('+++ b/') === 0) {
      file = norm(line.slice(6));
      newLine = 0;
      continue;
    }
    if (line.indexOf('+++ /dev/null') === 0) {
      file = '';
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = parseInt(hunk[1], 10);
      continue;
    }
    if (line.indexOf('+++') === 0 || line.indexOf('---') === 0) continue;
    if (line.charAt(0) === '+') {
      if (file && !isSelfFence(file) && !PROTECTED.has(file) && !isBExcepted(file)) {
        scanAddedLine(file, newLine, line.slice(1));
      }
      newLine += 1;
      continue;
    }
    if (line.charAt(0) === ' ') {
      newLine += 1;
    }
  }
}

function scanUntrackedFile(rel) {
  const n = norm(rel);
  if (isSelfFence(n) || PROTECTED.has(n) || isBExcepted(n)) return;
  const abs = path.join(root, n);
  let text = '';
  try {
    text = fs.readFileSync(abs, 'utf8');
  } catch (e) {
    return;
  }
  if (/\.pem$/i.test(n)) {
    addFinding(n, 'B', 'archivo .pem', { linea: 1, contexto: n });
  }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    scanAddedLine(n, i + 1, lines[i]);
  }
}

function checkCapaC(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return;
  const text = fs.readFileSync(abs, 'utf8');
  if (!/mode:\s*'local'/.test(text) && !/mode:\s*"local"/.test(text)) {
    addFinding(rel, 'C', "mode no es 'local'", {});
  }
  if (!/endpoint:\s*''/.test(text) && !/endpoint:\s*""/.test(text)) {
    addFinding(rel, 'C', 'endpoint no es vacío', {});
  }
  if (/script\.google\.com/i.test(text)) {
    addFinding(rel, 'C', 'aparece script.google.com', {});
  }
  if (/\/exec\b/.test(text)) {
    addFinding(rel, 'C', 'aparece /exec', {});
  }
}

// git diff HEAD incluye staged + unstaged vs HEAD; no hace falta git diff --cached.
const nameOut = git(['diff', 'HEAD', '--name-only']);
const changed = nameOut.stdout.split(/\r?\n/).map(norm).filter(Boolean);

const untrackedOut = git(['ls-files', '--others', '--exclude-standard']);
const untracked = untrackedOut.stdout.split(/\r?\n/).map(norm).filter(Boolean);

changed.forEach(function (file) {
  if (PROTECTED.has(file)) {
    addFinding(file, 'A', 'archivo protegido modificado', {});
  }
});
untracked.forEach(function (file) {
  if (PROTECTED.has(file)) {
    addFinding(file, 'A', 'archivo protegido nuevo (untracked)', {});
  }
});

const diffOut = git(['diff', 'HEAD']);
parseDiff(diffOut.stdout);

untracked.forEach(scanUntrackedFile);

const configTouched = changed.indexOf(CONFIG_FILE) >= 0 || untracked.indexOf(CONFIG_FILE) >= 0;
if (configTouched) checkCapaC(CONFIG_FILE);

if (!findings.length) {
  console.log('PASS: no se detectaron cambios peligrosos de producción.');
  process.exit(0);
}

console.log('FAIL: se detectaron cambios protegidos/peligrosos:');
findings.forEach(function (f) {
  console.log('- archivo: ' + f.file);
  console.log('  capa: ' + f.capa);
  console.log('  motivo: ' + f.motivo);
  if (f.linea !== '') console.log('  línea: ' + f.linea);
  if (f.contexto) console.log('  contexto: ' + f.contexto);
});
process.exit(1);
