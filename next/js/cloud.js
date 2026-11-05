/**
 * Respaldo automático de NEXT en la nube (Drive del dueño, vía ArpaRespaldoNube).
 * Archivos por celular:
 *   next-<celular>-datos.json            clientes, equipos, servicios (sin fotos) y seguimientos
 *   next-<celular>-datos-AAAA-MM-DD.json copia del día
 *   next-<celular>-fotos-<servicio>.json fotos y firmas de cada servicio
 */
import { buildBackup } from './backup.js';

const STATE_KEY = 'arpa_next_nube';
const MIN_INTERVAL_MS = 2 * 60 * 1000;

function api() {
  return typeof window !== 'undefined' ? window.ArpaRespaldoNube : globalThis.ArpaRespaldoNube;
}

export function cloudEnabled() {
  return !!api()?.enabled?.();
}

function readState() {
  try { return JSON.parse(localStorage.getItem(STATE_KEY) || '{}') || {}; } catch (e) { return {}; }
}

function writeState(patch) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify({ ...readState(), ...patch })); } catch (e) { /* ignore */ }
}

export function cloudStatus() {
  return { enabled: cloudEnabled(), ...readState() };
}

function hasData(url) {
  return typeof url === 'string' && url.startsWith('data:');
}

function safeId(id) {
  return String(id || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

/** Separa la copia en datos livianos y un archivo de fotos/firmas por servicio. */
export function splitBackup(backup) {
  const media = [];
  const services = (backup.data?.services || []).map((s) => {
    const photos = (s.photos || []).filter((p) => hasData(p.dataUrl));
    const sig = s.signatures || {};
    const hasSig = hasData(sig.client?.dataUrl) || hasData(sig.technician?.dataUrl);
    if (!photos.length && !hasSig) return s;
    media.push({ serviceId: s.id, updatedAt: s.updatedAt || '', photos: s.photos || [], signatures: sig });
    return {
      ...s,
      photos: (s.photos || []).map((p) => ({ ...p, dataUrl: '' })),
      signatures: {
        client: { ...(sig.client || {}), dataUrl: '' },
        technician: { ...(sig.technician || {}), dataUrl: '' },
      },
      mediaEnNube: true,
    };
  });
  return { datos: { ...backup, data: { ...backup.data, services } }, media };
}

/** Vuelve a unir los datos con sus fotos/firmas. */
export function joinBackup(datos, mediaList) {
  const byId = new Map((mediaList || []).map((m) => [m.serviceId, m]));
  const services = (datos.data?.services || []).map((s) => {
    const m = byId.get(s.id);
    if (!m) return s;
    const { mediaEnNube, ...rest } = s;
    void mediaEnNube;
    return { ...rest, photos: m.photos || rest.photos, signatures: m.signatures || rest.signatures };
  });
  return { ...datos, data: { ...datos.data, services } };
}

export function mediaFileName(tag, serviceId) {
  return `next-${tag}-fotos-${safeId(serviceId)}.json`;
}

let running = null;

/**
 * Sube a la nube lo que cambió. Devuelve {ok, uploaded} o {ok:false, skipped}.
 */
export async function syncNextToCloud(store, options = {}) {
  const nube = api();
  if (!cloudEnabled()) return { ok: false, skipped: 'sin_nube' };
  if (running) return running;
  running = (async () => {
    const now = options.now || new Date();
    const state = readState();
    if (!options.force && now.getTime() - (state.at || 0) < MIN_INTERVAL_MS && state.lastOk) {
      return { ok: true, skipped: 'reciente' };
    }
    if (nube.serverReady && !(await nube.serverReady(now, !!options.force))) {
      const motivo = nube.status?.().serverError || 'sin respuesta del servidor';
      writeState({ error: 'la nube no respondió: ' + motivo, errorAt: now.toISOString() });
      return { ok: false, skipped: 'servidor' };
    }
    const tag = nube.deviceTag();
    const { datos, media } = splitBackup(await buildBackup(store, now));
    const sent = { ...(state.media || {}) };
    let uploaded = 0;
    for (const m of media) {
      if (sent[m.serviceId] === m.updatedAt) continue;
      const r = await nube.post('respaldoguardar', {
        app: 'next',
        nombre: mediaFileName(tag, m.serviceId),
        contenido: JSON.stringify({ format: 'arpa-next-fotos', version: 1, ...m }),
      });
      if (!r?.ok) {
        writeState({ media: sent, at: now.getTime(), error: r?.mensaje || 'error', errorAt: now.toISOString() });
        return { ok: false, mensaje: r?.mensaje };
      }
      sent[m.serviceId] = m.updatedAt;
      uploaded += 1;
    }
    const text = JSON.stringify(datos);
    const fingerprint = text.length + ':' + JSON.stringify(datos.data).length + ':' + (datos.data.services || []).map((s) => s.updatedAt).join('|');
    const day = nube.hoy(now);
    if (fingerprint !== state.fingerprint || state.dia !== day || uploaded) {
      const r1 = await nube.post('respaldoguardar', { app: 'next', nombre: `next-${tag}-datos.json`, contenido: text });
      const r2 = r1?.ok && state.dia !== day
        ? await nube.post('respaldoguardar', { app: 'next', nombre: `next-${tag}-datos-${day}.json`, contenido: text })
        : r1;
      if (!r1?.ok || !r2?.ok) {
        writeState({ media: sent, at: now.getTime(), error: (r2 || r1)?.mensaje || 'error', errorAt: now.toISOString() });
        return { ok: false, mensaje: (r2 || r1)?.mensaje };
      }
      uploaded += 1;
      writeState({ fingerprint, dia: day });
    }
    writeState({ media: sent, at: now.getTime(), lastOk: now.toISOString(), error: '' });
    return { ok: true, uploaded };
  })().finally(() => { running = null; });
  return running;
}

/** Lista los celulares con copia de NEXT en la nube: [{tag, actualizado}] */
export function groupCloudFiles(archivos) {
  const tags = new Map();
  for (const a of archivos || []) {
    const m = /^next-([a-z0-9]+)-datos\.json$/.exec(a.nombre);
    if (m) tags.set(m[1], { tag: m[1], actualizado: a.actualizado, bytes: a.bytes });
  }
  return [...tags.values()].sort((a, b) => String(b.actualizado).localeCompare(String(a.actualizado)));
}

/** Descarga la copia completa de NEXT de un celular. */
export async function downloadNextFromCloud(tag, dia) {
  const nube = api();
  const nombre = dia ? `next-${tag}-datos-${dia}.json` : `next-${tag}-datos.json`;
  const r = await nube.post('respaldoleer', { app: 'next', nombre });
  if (!r?.ok) throw new Error(r?.mensaje || 'No se pudo leer la copia de NEXT.');
  const datos = JSON.parse(r.contenido);
  const media = [];
  for (const s of datos.data?.services || []) {
    if (!s.mediaEnNube) continue;
    const f = await nube.post('respaldoleer', { app: 'next', nombre: mediaFileName(tag, s.id) });
    if (f?.ok) {
      try { media.push(JSON.parse(f.contenido)); } catch (e) { /* foto dañada: se restaura el resto */ }
    }
  }
  return joinBackup(datos, media);
}
