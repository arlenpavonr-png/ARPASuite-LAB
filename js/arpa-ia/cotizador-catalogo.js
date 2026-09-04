/**
 * Resolución de catálogo por oficio.
 * 1) Mi Catálogo del oficio  2) seed/default DEL MISMO oficio
 * Nunca el catálogo de Automatización para otro oficio.
 */
(function (global) {
  function perfiles() {
    return global.ArpaIaPerfiles;
  }

  function knownOficioId(explicit) {
    const api = perfiles();
    if (!api) return explicit || '';
    const oid = api.normalizeOficioId(explicit != null ? explicit : api.resolveOficioId());
    if (!oid || !api.isKnownOficio(oid)) return '';
    return oid;
  }

  function pvpIfPositive(raw) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function findByExactCodigo(list, codigo, codeKeys) {
    const code = String(codigo || '').trim();
    if (!Array.isArray(list) || !code) return null;
    const upper = code.toUpperCase();
    const keys = codeKeys || ['cod', 'codigo'];
    function readCode(item) {
      for (let i = 0; i < keys.length; i += 1) {
        const v = String(item && item[keys[i]] != null ? item[keys[i]] : '').trim();
        if (v) return v;
      }
      return '';
    }
    return list.find((p) => readCode(p) === code)
      || list.find((p) => readCode(p).toUpperCase() === upper)
      || null;
  }

  function lookupBftNasPvp(codigo) {
    const nas = findByExactCodigo(global.CATALOGO_BFT_NAS, codigo, ['codigo', 'cod']);
    if (!nas) return null;
    return pvpIfPositive(nas.precio != null ? nas.precio : nas.pvp);
  }

  function lookupDefaultPvp(codigo) {
    const catalogo = global.ArpaCatalogo;
    const code = String(codigo || '').trim();
    if (!code) return null;

    let item = null;
    if (catalogo && typeof catalogo.getListaProductosDefault === 'function') {
      item = findByExactCodigo(catalogo.getListaProductosDefault() || [], code, ['cod', 'codigo']);
    }

    let pvp = 0;
    if (catalogo && typeof catalogo.getPrecioVenta === 'function') {
      pvp = Number(catalogo.getPrecioVenta(code, item));
    } else if (item && item.pvp != null) {
      pvp = Number(item.pvp);
    }
    const fromDefault = pvpIfPositive(pvp);
    if (fromDefault != null) return fromDefault;

    return lookupBftNasPvp(code);
  }

  function normalizeProduct(item) {
    const codigo = String(item.cod || item.codigo || '').trim();
    const nombre = String(item.nom || item.nombre || '').trim();
    let pvp = Number(item.pvp != null ? item.pvp : item.precio_catalogo);
    if (!Number.isFinite(pvp) || pvp <= 0) {
      const fromDefault = lookupDefaultPvp(codigo);
      if (fromDefault != null) pvp = fromDefault;
    }
    return {
      codigo,
      nombre,
      marca: String(item.marca || '').trim(),
      categoria: String(item.categoria || '').trim(),
      precio_catalogo: Number.isFinite(pvp) && pvp > 0 ? pvp : null,
      unidad: String(item.unidad || '').trim(),
      seed: item.seed === true || /\(seed\)/i.test(nombre)
    };
  }

  function listUserProducts(oficioId) {
    const oid = knownOficioId(oficioId);
    if (!oid) return [];
    if (global.ArpaCatalogo && typeof global.ArpaCatalogo.getListaProductos === 'function') {
      return global.ArpaCatalogo.getListaProductos(oid)
        .map(normalizeProduct)
        .filter((p) => p.codigo && p.nombre);
    }
    if (global.ArpaMiCatalogo && typeof global.ArpaMiCatalogo.getProducts === 'function') {
      return global.ArpaMiCatalogo.getProducts(oid)
        .map(normalizeProduct)
        .filter((p) => p.codigo && p.nombre);
    }
    return [];
  }

  function listDefaultProducts(oficioId) {
    const oid = knownOficioId(oficioId);
    if (!oid) return [];
    if (oid === 'automatismos' && global.ArpaCatalogo && typeof global.ArpaCatalogo.getListaProductosDefault === 'function') {
      return global.ArpaCatalogo.getListaProductosDefault()
        .map(normalizeProduct)
        .filter((p) => p.codigo && p.nombre);
    }
    if (oid === 'automatismos') return [];
    if (global.ArpaOficios && typeof global.ArpaOficios.getSeedProductsForOficio === 'function') {
      const oficiosNorm = typeof global.ArpaOficios.normalizeOficioId === 'function'
        ? global.ArpaOficios.normalizeOficioId(oid)
        : oid;
      if (oficiosNorm === 'automatismos' && oid !== 'automatismos') return [];
      return global.ArpaOficios.getSeedProductsForOficio(oid)
        .map(normalizeProduct)
        .filter((p) => p.codigo && p.nombre);
    }
    return [];
  }

  function resolveCatalog(oficioId) {
    const oid = knownOficioId(oficioId);
    if (!oid) {
      return { oficioId: null, fuente: 'sin_oficio', products: [] };
    }
    const user = listUserProducts(oid);
    if (user.length) {
      return { oficioId: oid, fuente: 'mi_catalogo', products: user };
    }
    const defaults = listDefaultProducts(oid);
    if (oid === 'automatismos') {
      return { oficioId: oid, fuente: 'default', products: defaults };
    }
    return {
      oficioId: oid,
      fuente: defaults.length ? 'seed' : 'seed_vacio',
      products: defaults
    };
  }

  function listProducts(oficioId) {
    return resolveCatalog(oficioId).products;
  }

  function capacityKgFromName(nombre) {
    const parts = String(nombre || '').split(/[–—-]/);
    const tail = parts.length > 1 ? parts.slice(1).join(' ') : nombre;
    const matches = String(tail).match(/(\d+)\s*kg/gi) || [];
    if (!matches.length) {
      const fallback = String(nombre).match(/(\d+)\s*kg/i);
      return fallback ? parseInt(fallback[1], 10) : null;
    }
    const last = matches[matches.length - 1].match(/(\d+)/);
    return last ? parseInt(last[1], 10) : null;
  }

  function metrosFromName(nombre) {
    const m = String(nombre || '').match(/(\d+(?:[.,]\d+)?)\s*m\b/i);
    if (!m) return null;
    const n = parseFloat(String(m[1]).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  global.ArpaIaCotizadorCatalogo = {
    resolveOficioId: knownOficioId,
    resolveCatalog,
    listProducts,
    listUserProducts,
    listDefaultProducts,
    capacityKgFromName,
    metrosFromName
  };
})(typeof window !== 'undefined' ? window : globalThis);
