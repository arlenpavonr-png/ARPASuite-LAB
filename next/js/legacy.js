import { createClient, createEquipment, createService, normalizeName } from './store.js';

// La suite guarda el texto de ejemplo de la casilla cuando el nombre queda vacío.
const PLACEHOLDER_NAMES = /^(nombre completo o raz[oó]n social|full name or company name)$/i;

export function realClientName(name) {
  const n = String(name || '').trim();
  return PLACEHOLDER_NAMES.test(n) ? '' : n;
}

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
      name: realClientName(c.nombre || c.name),
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
    const name = realClientName(r.cliente);
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
      name: s.companyName || s.company || s.empresa || s.nombre || '',
      phone: s.phone || s.telefono || '',
      city: s.city || s.ciudad || '',
      address: s.address || s.direccion || '',
      technician: s.technicianName || s.technician || s.tecnico || '',
    };
  } catch (e) {
    return { name: '', phone: '', city: '', address: '', technician: '' };
  }
}

export function mapServiceTypeFromClassic(subtipo) {
  const t = String(subtipo || '').toLowerCase();
  if (t.indexOf('instal') >= 0) return 'instalacion';
  if (t.indexOf('repar') >= 0) return 'reparacion';
  return 'mantenimiento';
}

const DOOR_CHIPS = [
  ['c1', 'corrediza'],
  ['c2', 'batiente_1'],
  ['c3', 'batiente_2'],
  ['c4', 'levadiza'],
  ['c5', 'seccional'],
  ['c6', 'barrera'],
  ['c7', 'techo_corredizo'],
  ['c9', 'cortina'],
  ['c10', 'cabezal'],
  // Tipo de Trabajo de Cerrajería (oficio metalmecánica)
  ['fmet7', 'cortina'],
  ['fmet8', 'reja_ballesta'],
  ['fmet9', 'chapa'],
  ['fmet1', 'puerta_metalica'],
  ['fmet2', 'reja'],
  ['fmet3', 'estructura'],
  ['fmet4', 'estructura'],
  // Cámaras y CCTV
  ['fcctv1', 'camaras'], ['fcctv2', 'camaras_ip'], ['fcctv3', 'grabador'],
  ['fcctv4', 'alarma'], ['fcctv5', 'control_acceso'], ['fcctv6', 'videoportero'],
  // Refrigeración
  ['fref1', 'nevera'], ['fref2', 'split'], ['fref3', 'aire_central'],
  ['fref4', 'cuarto_frio'], ['fref5', 'ref_comercial'],
  // Electricidad
  ['fe1', 'residencial'], ['fe2', 'comercial'], ['fe3', 'tablero'], ['fe4', 'acometida'],
  ['fe5', 'iluminacion'], ['fe6', 'tomas'], ['fe7', 'tierra'],
  // Gas
  ['fgas1', 'red_gas'], ['fgas2', 'gasodomestico'], ['fgas3', 'revision_gas'], ['fgas4', 'fuga_gas'], ['fgas5', 'calentador'],
  // Plomería
  ['fplo1', 'red_hidraulica'], ['fplo2', 'red_sanitaria'], ['fplo3', 'fuga_agua'],
  ['fplo4', 'calentador'], ['fplo5', 'griferia'], ['fplo6', 'bomba'],
  // Control de plagas
  ['fpla1', 'desinsectacion'], ['fpla2', 'desratizacion'], ['fpla3', 'desinfeccion'], ['fpla4', 'fumigacion'], ['fpla5', 'preventivo'],
  // Línea blanca
  ['flb1', 'lavadora'], ['flb2', 'nevera'], ['flb3', 'estufa'], ['flb4', 'secadora'], ['flb5', 'lavavajillas'],
  // Energía solar
  ['fsol1', 'panel'], ['fsol2', 'inversor'], ['fsol3', 'baterias'], ['fsol4', 'estructura_solar'],
  ['fsol5', 'cableado_solar'], ['fsol6', 'mant_solar'],
  // Taller de motos
  ['fmot1', 'revision_moto'], ['fmot2', 'mant_moto'], ['fmot3', 'reparacion_moto'], ['fmot4', 'aceite'], ['fmot5', 'frenos'],
];

export function equipmentFromClassicSnapshot(snap) {
  const s = snap || {};
  let type = 'otro';
  for (const [id, mapped] of DOOR_CHIPS) {
    if (s[id] === true || s[id] === 'true' || s[id] === 1) {
      type = mapped;
      break;
    }
  }
  return {
    type,
    brand: String(s['sel-marca'] || s['formato-equipo-marca-text'] || '').trim(),
    model: String(s['ref-manual'] || s['formato-equipo-ref-text'] || s['sel-referencia'] || '').trim(),
    serial: String(s['formato-equipo-serie'] || '').trim(),
  };
}

/**
 * Convierte historial clásico (solo lectura) en equipos y servicios NEXT.
 * No escribe en las claves de la suite clásica.
 */
export function mapClassicHistorial(records) {
  const list = Array.isArray(records) ? records : [];
  const equipment = [];
  const services = [];
  const eqIndex = new Map();

  for (const rec of list) {
    if ((rec.modulo || 'formato') !== 'formato') continue;
    if (!String(rec.cliente || '').trim()) continue;
    const clientName = realClientName(rec.cliente) || 'Cliente sin nombre';
    const snap = rec.fullSnapshot || {};
    const eqFields = equipmentFromClassicSnapshot(snap);
    const eqKey = [normalizeName(clientName), eqFields.type, normalizeName(eqFields.brand), normalizeName(eqFields.model)].join('|');
    let eq = eqIndex.get(eqKey);
    if (!eq) {
      eq = {
        clientName,
        clientNameNorm: normalizeName(clientName),
        city: rec.ciudad || '',
        ...eqFields,
        location: '',
      };
      eqIndex.set(eqKey, eq);
      equipment.push(eq);
    }
    const finding = String(rec.concepto || '').trim();
    const snapObs = [
      snap['obs-1'], snap['obs-2'], snap['obs-3'], snap['obs-4'],
      snap.observaciones, snap['formato-obs'],
    ].map((x) => String(x || '').trim()).filter(Boolean);
    const findings = [];
    if (finding) findings.push({ text: finding, source: 'classic' });
    for (const line of snapObs) {
      if (findings.some((f) => f.text.toLowerCase() === line.toLowerCase())) continue;
      findings.push({ text: line, source: 'classic' });
    }
    services.push({
      classicId: rec.id || rec.numero || '',
      number: rec.numero || rec.numeroServicio || '',
      clientName,
      clientNameNorm: normalizeName(clientName),
      eqKey,
      type: mapServiceTypeFromClassic(rec.subtipo || rec.tipo),
      status: 'closed',
      source: 'classic',
      technician: String(snap['campo-tecnico-firma'] || rec.tecnico || '').trim(),
      startedAt: rec.fecha || rec.savedAt || '',
      closedAt: rec.savedAt || rec.fecha || '',
      findings,
      workDone: [],
      parts: [],
      recommendations: [],
    });
  }
  return { equipment, services };
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

export async function importLegacyHistorial(store, records) {
  const hist = records || (typeof localStorage === 'undefined' ? [] : readJson('arpa_suite_servicio_historial'));
  const mapped = mapClassicHistorial(hist);
  const clients = await store.getAll('clients');
  const byName = new Map(clients.map((c) => [c.nameNorm, c]));
  const eqKeyToId = new Map();
  const existingEq = await store.getAll('equipment');
  const existingSv = await store.getAll('services');
  const haveClassic = new Set(existingSv.map((s) => s.classicId).filter(Boolean));
  let equipmentImported = 0;
  let servicesImported = 0;

  for (const eq of mapped.equipment) {
    let client = byName.get(eq.clientNameNorm);
    if (!client) {
      client = createClient({ name: eq.clientName, city: eq.city });
      await store.put('clients', client);
      byName.set(client.nameNorm, client);
    }
    const dup = existingEq.find((e) =>
      e.clientId === client.id
      && e.type === eq.type
      && normalizeName(e.brand) === normalizeName(eq.brand)
      && normalizeName(e.model) === normalizeName(eq.model)
    );
    if (dup) {
      eqKeyToId.set(eq.clientNameNorm + '|' + eq.type + '|' + normalizeName(eq.brand) + '|' + normalizeName(eq.model), dup.id);
      continue;
    }
    const created = createEquipment({
      clientId: client.id,
      type: eq.type,
      brand: eq.brand,
      model: eq.model,
      serial: eq.serial,
      notes: 'Importado del historial de ARPA Suite',
    });
    await store.put('equipment', created);
    existingEq.push(created);
    eqKeyToId.set(eq.clientNameNorm + '|' + eq.type + '|' + normalizeName(eq.brand) + '|' + normalizeName(eq.model), created.id);
    equipmentImported += 1;
  }

  for (const sv of mapped.services) {
    if (sv.classicId && haveClassic.has(sv.classicId)) continue;
    const client = byName.get(sv.clientNameNorm);
    if (!client) continue;
    const equipmentId = eqKeyToId.get(sv.eqKey) || '';
    const created = createService({
      number: sv.number || ('CL-' + (sv.classicId || '').toString().slice(-6)),
      clientId: client.id,
      equipmentId,
      type: sv.type,
      status: 'closed',
      startedAt: sv.startedAt,
      closedAt: sv.closedAt,
      findings: sv.findings,
      technician: sv.technician || '',
      classicId: sv.classicId,
      source: 'classic',
    });
    await store.put('services', created);
    haveClassic.add(sv.classicId);
    servicesImported += 1;
  }
  return { equipmentImported, servicesImported };
}

/** Corrige clientes que entraron con el texto de ejemplo como nombre (importaciones anteriores). */
async function renamePlaceholderClients(store) {
  for (const c of await store.getAll('clients')) {
    if (c.name && !realClientName(c.name)) {
      await store.put('clients', { ...c, name: 'Cliente sin nombre', nameNorm: normalizeName('Cliente sin nombre') });
    }
  }
}

export async function importLegacyData(store) {
  await renamePlaceholderClients(store);
  const clients = await importLegacyClients(store);
  const hist = await importLegacyHistorial(store);
  return { clients, ...hist };
}
