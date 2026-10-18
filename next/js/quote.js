import { PART_CATALOG } from './ai/knowledge.js';

export function money(n) {
  const v = Number(n) || 0;
  return '$ ' + Math.round(v).toLocaleString('es-CO');
}

export function lineTotal(item) {
  const qty = Number(item.qty) || 0;
  const price = Number(item.unitPrice) || 0;
  const labor = Number(item.labor) || 0;
  return qty * price + labor;
}

export function quoteTotals(items) {
  const list = Array.isArray(items) ? items : [];
  const parts = list.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  const labor = list.reduce((s, i) => s + (Number(i.labor) || 0), 0);
  return { parts, labor, total: parts + labor };
}

/**
 * Fusiona precios del catálogo local (Mi Catálogo / localStorage) si coinciden por nombre.
 */
export function applyCatalogPrices(items, catalogProducts) {
  const products = Array.isArray(catalogProducts) ? catalogProducts : [];
  return (items || []).map((item) => {
    const name = String(item.name || '').toLowerCase();
    if (!name) return item;
    const hit = products.find((p) => {
      const nom = String(p.nom || p.nombre || p.name || '').toLowerCase();
      return nom && (nom.includes(name) || name.includes(nom.split(' ')[0]));
    });
    if (!hit) return item;
    const pvp = Number(hit.pvp ?? hit.precio ?? hit.price);
    if (!Number.isFinite(pvp) || pvp <= 0) return item;
    return {
      ...item,
      unitPrice: pvp,
      code: hit.cod || hit.codigo || item.code || '',
      source: item.source === 'engine' ? 'catalog' : item.source,
    };
  });
}

export function draftQuoteFromAssistance(assistance, options = {}) {
  const items = (assistance?.quoteItems || []).map((row, idx) => {
    const cat = PART_CATALOG[row.partId] || {};
    return {
      id: 'qi-' + idx + '-' + (row.partId || idx),
      partId: row.partId || '',
      name: row.name || cat.name || 'Ítem',
      qty: row.qty || 1,
      unitPrice: row.unitPrice ?? cat.unitPrice ?? 0,
      labor: row.labor ?? cat.labor ?? 0,
      needsQuote: !!(row.needsQuote || cat.needsQuote),
      code: row.code || '',
      source: row.source || 'engine',
    };
  });
  const priced = applyCatalogPrices(items, options.catalogProducts);
  const totals = quoteTotals(priced);
  return {
    status: priced.length ? 'draft' : 'empty',
    notes: options.notes || 'Borrador generado desde hallazgos. Revise precios antes de enviar.',
    items: priced,
    ...totals,
    createdAt: new Date().toISOString(),
  };
}

export function mergeQuoteWithEdits(generated, existing) {
  const prev = existing?.items || [];
  const items = (generated.items || []).map((item) => {
    const hit = prev.find((p) => (p.partId && p.partId === item.partId) || p.name === item.name);
    if (!hit) return item;
    return {
      ...item,
      qty: hit.qty ?? item.qty,
      unitPrice: hit.unitPrice ?? item.unitPrice,
      labor: hit.labor ?? item.labor,
    };
  });
  const totals = quoteTotals(items);
  return { ...generated, items, ...totals, status: items.length ? 'draft' : 'empty' };
}

export function quoteFromService(job, assistance, catalogProducts) {
  const generated = draftQuoteFromAssistance(assistance, { catalogProducts });
  return mergeQuoteWithEdits(generated, job?.quote);
}

export function readLegacyCatalogProducts() {
  if (typeof localStorage === 'undefined') return [];
  const keys = ['arpa_catalogo_usuario', 'arpa_catalog_automatismos'];
  for (const key of keys) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(data) && data.length) return data;
    } catch (e) { /* ignore */ }
  }
  return [];
}
