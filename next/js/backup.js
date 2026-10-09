/**
 * Copia de seguridad de NEXT: un archivo con todo (clientes, equipos, servicios,
 * fotos, firmas y seguimientos) que el técnico guarda en Drive, WhatsApp o correo.
 * Restaurar mezcla por id: nunca borra lo que ya hay y conserva la versión más reciente.
 */

const STORES = ['clients', 'equipment', 'services', 'followups'];
const FORMAT = 'arpa-next-copia';
const VERSION = 1;
const LAST_BACKUP_KEY = 'arpa_next_ultima_copia';
export const BACKUP_REMIND_DAYS = 7;

function lsGet(key) {
  try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

export async function buildBackup(store, now) {
  const data = {};
  for (const name of STORES) data[name] = await store.getAll(name);
  const meta = (await store.getAll('meta')).find((m) => m.id === 'app') || null;
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: (now || new Date()).toISOString(),
    serviceSeq: meta?.serviceSeq || 0,
    data,
  };
}

export function backupFilename(now) {
  const d = now || new Date();
  const pad = (n) => String(n).padStart(2, '0');
  // .txt: Android solo deja compartir ciertos tipos de archivo, y JSON no está entre ellos.
  return `ARPA-NEXT-copia-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.txt`;
}

export function backupToFile(backup, now) {
  const blob = new Blob([JSON.stringify(backup)], { type: 'text/plain' });
  const name = backupFilename(now);
  if (typeof File === 'function') return new File([blob], name, { type: 'text/plain' });
  blob.name = name;
  return blob;
}

/** Valida el contenido de un archivo de copia. Lanza Error con un mensaje para el técnico. */
export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(String(text || ''));
  } catch (e) {
    throw new Error('El archivo no es una copia de ARPA NEXT.');
  }
  if (!obj || obj.format !== FORMAT || typeof obj.data !== 'object') {
    throw new Error('El archivo no es una copia de ARPA NEXT.');
  }
  if (Number(obj.version) > VERSION) {
    throw new Error('Esta copia es de una versión más nueva de NEXT. Actualice la app.');
  }
  return obj;
}

function newer(a, b) {
  return String(a?.updatedAt || '') >= String(b?.updatedAt || '');
}

/**
 * Restaura una copia mezclándola con lo que hay.
 * @returns {{added: number, updated: number, kept: number}}
 */
const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * En un celular nuevo, NEXT ya importó los clientes e historial de la suite con ids propios.
 * Busca el mismo registro por su contenido para no duplicarlo.
 */
function findTwin(name, row, rows) {
  if (name === 'clients') return rows.find((c) => norm(c.name) && norm(c.name) === norm(row.name));
  if (name === 'equipment') {
    return rows.find((e) => e.clientId === row.clientId && e.type === row.type
      && norm(e.brand) === norm(row.brand) && norm(e.model) === norm(row.model));
  }
  if (name === 'services' && row.classicId) return rows.find((s) => s.classicId === row.classicId);
  return null;
}

/** Completa los datos vacíos del registro que ya existe con los de la copia. */
function fillBlanks(have, row) {
  const patch = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'id' || v == null || v === '' || typeof v === 'object') continue;
    if (have[k] == null || have[k] === '') patch[k] = v;
  }
  return Object.keys(patch).length ? { ...have, ...patch } : null;
}

export async function restoreBackup(store, backup) {
  const result = { added: 0, updated: 0, kept: 0 };
  const idMap = new Map();
  const remap = (id) => (id && idMap.has(id) ? idMap.get(id) : id);
  for (const name of STORES) {
    const rows = Array.isArray(backup.data?.[name]) ? backup.data[name] : [];
    const existing = await store.getAll(name);
    const current = new Map(existing.map((r) => [r.id, r]));
    for (const raw of rows) {
      if (!raw || !raw.id) continue;
      const row = { ...raw };
      for (const ref of ['clientId', 'equipmentId', 'serviceId']) {
        if (row[ref]) row[ref] = remap(row[ref]);
      }
      if (!current.has(row.id)) {
        const twin = findTwin(name, row, existing);
        if (twin) {
          idMap.set(row.id, twin.id);
          const filled = fillBlanks(twin, row);
          if (filled) {
            await store.put(name, filled);
            result.updated += 1;
          } else {
            result.kept += 1;
          }
          continue;
        }
      }
      const have = current.get(row.id);
      if (!have) {
        await store.put(name, row);
        result.added += 1;
      } else if (newer(row, have) && JSON.stringify(row) !== JSON.stringify(have)) {
        await store.put(name, row);
        result.updated += 1;
      } else {
        result.kept += 1;
      }
    }
  }
  const metaRows = await store.getAll('meta');
  const meta = metaRows.find((m) => m.id === 'app') || { id: 'app', serviceSeq: 0, seeded: true };
  const seq = Math.max(Number(meta.serviceSeq) || 0, Number(backup.serviceSeq) || 0);
  if (seq !== meta.serviceSeq) await store.put('meta', { ...meta, serviceSeq: seq, seeded: true });
  return result;
}

export function markBackupDone(now) {
  lsSet(LAST_BACKUP_KEY, (now || new Date()).toISOString());
}

export function lastBackupAt() {
  return lsGet(LAST_BACKUP_KEY);
}

/**
 * Estado para el aviso de la pantalla de inicio.
 * @returns {{last: string, pending: number, due: boolean}}
 */
export function backupStatus(services, last, now) {
  const closed = (services || []).filter((s) => s.status === 'closed' && s.source !== 'classic');
  const pending = closed.filter((s) => String(s.updatedAt || s.closedAt || '') > String(last || '')).length;
  if (!closed.length) return { last, pending: 0, due: false };
  if (!last) return { last, pending, due: true };
  const ageDays = ((now || new Date()).getTime() - new Date(last).getTime()) / 86400000;
  return { last, pending, due: pending > 0 && (ageDays >= BACKUP_REMIND_DAYS || pending >= 3) };
}

/** Pide al navegador que no borre los datos de NEXT cuando falte espacio. */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (e) {
    return false;
  }
}
