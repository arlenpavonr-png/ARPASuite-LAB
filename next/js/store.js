const DB_NAME = 'arpa-suite-next';
const DB_VERSION = 1;
const LS_KEY = 'arpa_next_v1';
const STORES = ['clients', 'equipment', 'services', 'followups', 'meta'];

function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix) {
  const rand = Math.random().toString(36).slice(2, 8);
  return (prefix || 'id') + '_' + Date.now().toString(36) + rand;
}

function emptyDump() {
  return {
    clients: [],
    equipment: [],
    services: [],
    followups: [],
    meta: [{ id: 'app', serviceSeq: 0, seeded: false }],
  };
}

function idbAvailable() {
  return typeof indexedDB !== 'undefined';
}

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('clients')) {
        const s = db.createObjectStore('clients', { keyPath: 'id' });
        s.createIndex('nameNorm', 'nameNorm', { unique: false });
      }
      if (!db.objectStoreNames.contains('equipment')) {
        const s = db.createObjectStore('equipment', { keyPath: 'id' });
        s.createIndex('clientId', 'clientId', { unique: false });
      }
      if (!db.objectStoreNames.contains('services')) {
        const s = db.createObjectStore('services', { keyPath: 'id' });
        s.createIndex('clientId', 'clientId', { unique: false });
        s.createIndex('equipmentId', 'equipmentId', { unique: false });
        s.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains('followups')) {
        const s = db.createObjectStore('followups', { keyPath: 'id' });
        s.createIndex('status', 'status', { unique: false });
        s.createIndex('clientId', 'clientId', { unique: false });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('aborted'));
  });
}

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readLsDump() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return emptyDump();
    const data = JSON.parse(raw);
    const dump = emptyDump();
    for (const store of STORES) {
      if (Array.isArray(data[store])) dump[store] = data[store];
    }
    return dump;
  } catch (e) {
    return emptyDump();
  }
}

function writeLsDump(dump) {
  localStorage.setItem(LS_KEY, JSON.stringify(dump));
}

export function createMemoryStore(seed) {
  const data = seed ? structuredClone(seed) : emptyDump();
  return {
    driver: 'memory',
    async getAll(store) {
      return [...(data[store] || [])];
    },
    async get(store, id) {
      return (data[store] || []).find((r) => r.id === id) || null;
    },
    async put(store, record) {
      const list = data[store] || (data[store] = []);
      const idx = list.findIndex((r) => r.id === record.id);
      const row = { ...record, updatedAt: nowIso() };
      if (idx >= 0) list[idx] = { ...list[idx], ...row };
      else list.unshift(row);
      return list[idx >= 0 ? idx : 0];
    },
    async delete(store, id) {
      data[store] = (data[store] || []).filter((r) => r.id !== id);
    },
    async nextServiceNumber() {
      const meta = data.meta.find((m) => m.id === 'app') || { id: 'app', serviceSeq: 0 };
      meta.serviceSeq = (meta.serviceSeq || 0) + 1;
      if (!data.meta.find((m) => m.id === 'app')) data.meta.push(meta);
      const year = new Date().getFullYear();
      return 'SV-' + year + '-' + String(meta.serviceSeq).padStart(4, '0');
    },
  };
}

function createLocalStorageStore() {
  const api = {
    driver: 'localStorage',
    async getAll(store) {
      return [...(readLsDump()[store] || [])];
    },
    async get(store, id) {
      return (readLsDump()[store] || []).find((r) => r.id === id) || null;
    },
    async put(store, record) {
      const dump = readLsDump();
      const list = dump[store] || [];
      const idx = list.findIndex((r) => r.id === record.id);
      const row = { ...record, updatedAt: nowIso() };
      if (idx >= 0) list[idx] = { ...list[idx], ...row };
      else list.unshift(row);
      dump[store] = list;
      writeLsDump(dump);
      return list[idx >= 0 ? idx : 0];
    },
    async delete(store, id) {
      const dump = readLsDump();
      dump[store] = (dump[store] || []).filter((r) => r.id !== id);
      writeLsDump(dump);
    },
    async nextServiceNumber() {
      const dump = readLsDump();
      let meta = dump.meta.find((m) => m.id === 'app');
      if (!meta) {
        meta = { id: 'app', serviceSeq: 0 };
        dump.meta.push(meta);
      }
      meta.serviceSeq = (meta.serviceSeq || 0) + 1;
      writeLsDump(dump);
      const year = new Date().getFullYear();
      return 'SV-' + year + '-' + String(meta.serviceSeq).padStart(4, '0');
    },
  };
  return api;
}

function createIdbStore(db) {
  return {
    driver: 'indexeddb',
    async getAll(store) {
      const tx = db.transaction(store, 'readonly');
      const rows = await requestToPromise(tx.objectStore(store).getAll());
      return Array.isArray(rows) ? rows : [];
    },
    async get(store, id) {
      const tx = db.transaction(store, 'readonly');
      return (await requestToPromise(tx.objectStore(store).get(id))) || null;
    },
    async put(store, record) {
      const row = { ...record, updatedAt: nowIso() };
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(row);
      await txDone(tx);
      return row;
    },
    async delete(store, id) {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      await txDone(tx);
    },
    async nextServiceNumber() {
      const tx = db.transaction('meta', 'readwrite');
      const store = tx.objectStore('meta');
      let meta = await requestToPromise(store.get('app'));
      if (!meta) meta = { id: 'app', serviceSeq: 0 };
      meta.serviceSeq = (meta.serviceSeq || 0) + 1;
      store.put(meta);
      await txDone(tx);
      const year = new Date().getFullYear();
      return 'SV-' + year + '-' + String(meta.serviceSeq).padStart(4, '0');
    },
  };
}

export async function openStore() {
  if (idbAvailable()) {
    try {
      const db = await openIdb();
      return createIdbStore(db);
    } catch (e) {
      return createLocalStorageStore();
    }
  }
  if (typeof localStorage !== 'undefined') return createLocalStorageStore();
  return createMemoryStore();
}

export function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

export function createClient(data) {
  const name = String(data.name || '').trim();
  return {
    id: data.id || newId('cli'),
    name,
    nameNorm: normalizeName(name),
    nit: String(data.nit || '').trim(),
    phone: String(data.phone || '').trim(),
    email: String(data.email || '').trim(),
    address: String(data.address || '').trim(),
    city: String(data.city || '').trim(),
    createdAt: data.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export function createEquipment(data) {
  return {
    id: data.id || newId('eq'),
    clientId: data.clientId,
    type: data.type || 'corrediza',
    brand: String(data.brand || '').trim(),
    model: String(data.model || '').trim(),
    serial: String(data.serial || '').trim(),
    location: String(data.location || '').trim(),
    notes: String(data.notes || '').trim(),
    createdAt: data.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export function createService(data) {
  return {
    id: data.id || newId('sv'),
    number: data.number || '',
    clientId: data.clientId,
    equipmentId: data.equipmentId,
    type: data.type || 'mantenimiento',
    status: data.status || 'draft',
    technician: String(data.technician || '').trim(),
    startedAt: data.startedAt || nowIso(),
    closedAt: data.closedAt || null,
    findings: data.findings || [],
    workDone: data.workDone || [],
    parts: data.parts || [],
    checklist: data.checklist || [],
    photos: data.photos || [],
    transcripts: data.transcripts || [],
    recommendations: data.recommendations || [],
    equipmentStatus: data.equipmentStatus || null,
    quote: data.quote || null,
    notes: String(data.notes || '').trim(),
    createdAt: data.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export function createFollowup(data) {
  return {
    id: data.id || newId('fu'),
    clientId: data.clientId,
    equipmentId: data.equipmentId || '',
    serviceId: data.serviceId || '',
    type: data.type,
    label: data.label || '',
    dueDate: data.dueDate,
    notes: String(data.notes || '').trim(),
    status: data.status || 'open',
    createdAt: data.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export async function equipmentHistory(store, equipmentId) {
  const all = await store.getAll('services');
  return all
    .filter((s) => s.equipmentId === equipmentId && s.status === 'closed')
    .sort((a, b) => String(b.closedAt || b.startedAt).localeCompare(String(a.closedAt || a.startedAt)));
}

export function buildIntelligentBrief(equipment, services) {
  const closed = (services || [])
    .filter((s) => s.status === 'closed')
    .sort((a, b) => String(b.closedAt || b.startedAt).localeCompare(String(a.closedAt || a.startedAt)));
  const last = closed[0] || null;
  const findings = [];
  const repairs = [];
  const parts = [];
  const pending = [];
  for (const s of closed) {
    for (const f of s.findings || []) findings.push({ ...f, at: s.closedAt, number: s.number });
    for (const w of s.workDone || []) repairs.push({ ...w, at: s.closedAt, number: s.number });
    for (const p of s.parts || []) parts.push({ ...p, at: s.closedAt, number: s.number });
    for (const r of s.recommendations || []) pending.push({ ...r, at: s.closedAt, number: s.number });
  }
  return {
    equipment,
    lastService: last,
    findings: findings.slice(0, 5),
    repairs: repairs.slice(0, 5),
    parts: parts.slice(0, 5),
    pendingRecommendations: pending.slice(0, 5),
    serviceCount: closed.length,
  };
}
