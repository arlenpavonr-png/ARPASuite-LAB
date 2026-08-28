import { createClient } from './store.js';

function readJson(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function readLegacyClients() {
  const fromDb = readJson('arpa_suite_clientes');
  if (fromDb.length) {
    return fromDb.map((c) => ({
      name: c.nombre || c.name || '',
      phone: c.tel || c.phone || '',
      city: c.ciudad || c.city || '',
      nit: c.nit || '',
      email: c.email || '',
      address: c.dir || c.address || '',
    })).filter((c) => c.name);
  }
  const hist = readJson('arpa_suite_servicio_historial');
  const map = new Map();
  for (const r of hist) {
    const name = String(r.cliente || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (map.has(key)) continue;
    map.set(key, { name, city: r.ciudad || '', phone: '', address: '' });
  }
  return [...map.values()];
}

export function readCompanySettings() {
  try {
    const s = JSON.parse(localStorage.getItem('arpa_suite_user_settings') || '{}');
    return {
      name: s.company || s.empresa || s.nombre || '',
      phone: s.phone || s.telefono || '',
      city: s.city || s.ciudad || '',
      technician: s.technician || s.tecnico || '',
    };
  } catch (e) {
    return { name: '', phone: '', city: '', technician: '' };
  }
}

export async function importLegacyClients(store) {
  const existing = await store.getAll('clients');
  const have = new Set(existing.map((c) => c.nameNorm));
  let imported = 0;
  for (const row of readLegacyClients()) {
    const client = createClient(row);
    if (have.has(client.nameNorm)) continue;
    await store.put('clients', client);
    have.add(client.nameNorm);
    imported += 1;
  }
  return imported;
}
