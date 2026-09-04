/**
 * Matcher: suggest(datos, products, profile)
 * Solo usa el catálogo recibido. Reglas de puertas/kg solo en automatismos.
 */
(function (global) {
  const CAT_BY_PUERTA = {
    corrediza: /corrediz/i,
    batiente: /batiente/i,
    levadiza: /levadiz|seccional/i,
    seccional: /seccional|levadiz/i,
    enrollable: /enrollable|cortina/i,
    cortina: /cortina|enrollable/i,
    barrera: /barrera|talanquera/i,
    talanquera: /talanquera|barrera/i
  };

  const ACCESSORY_CAT = /accesorio/i;

  function helpers() {
    return {
      capacityKgFromName: function (nombre) {
        const api = global.ArpaIaCotizadorCatalogo;
        return api && api.capacityKgFromName ? api.capacityKgFromName(nombre) : null;
      },
      metrosFromName: function (nombre) {
        const api = global.ArpaIaCotizadorCatalogo;
        return api && api.metrosFromName ? api.metrosFromName(nombre) : null;
      }
    };
  }

  function categoryMatchesPuerta(categoria, tipoPuerta) {
    if (!tipoPuerta) return false;
    const re = CAT_BY_PUERTA[tipoPuerta];
    return re ? re.test(categoria || '') : false;
  }

  function isAccessory(categoria) {
    return ACCESSORY_CAT.test(categoria || '');
  }

  function scoreAutomatismos(product, datos) {
    const h = helpers();
    const kgName = h.capacityKgFromName(product.nombre);
    const mName = h.metrosFromName(product.nombre);
    let score = 0;
    const motivos = [];

    const catOk = categoryMatchesPuerta(product.categoria, datos.tipo_de_puerta);
    if (datos.tipo_de_puerta) {
      if (catOk) {
        score += 50;
        motivos.push('categoría ' + product.categoria);
      } else if (!isAccessory(product.categoria)) {
        return { score: 0, skip: true, motivos: motivos };
      }
    } else if (isAccessory(product.categoria)) {
      return { score: 0, skip: true, motivos: motivos };
    } else {
      score += 8;
    }

    if (datos.peso_estimado != null) {
      if (kgName == null) {
        score += 2;
      } else if (kgName + 1 < datos.peso_estimado) {
        return { score: 0, skip: true, motivos: ['capacidad insuficiente (' + kgName + ' kg)'] };
      } else {
        const extra = kgName - datos.peso_estimado;
        score += 36 - Math.min(30, extra / 40);
        motivos.push('capacidad ' + kgName + ' kg');
      }
    }

    if (datos.recorrido_m != null && mName != null && mName + 0.05 >= datos.recorrido_m) {
      score += 10;
      motivos.push('recorrido hasta ' + mName + ' m');
    }
    if (datos.ancho_m != null && mName != null && mName + 0.05 >= datos.ancho_m) {
      score += 10;
      motivos.push('largo hasta ' + mName + ' m');
    }

    if (datos.uso === 'residencial' && /residenc|home|casa/i.test(product.nombre)) score += 6;
    if (datos.uso === 'industrial' && /industri|continuo|intensivo/i.test(product.nombre + ' ' + product.categoria)) score += 6;
    if (datos.hojas === 2 && /2 hojas|2 brazos/i.test(product.nombre + ' ' + product.categoria)) score += 8;
    if (datos.hojas === 1 && /1 hoja|1 brazo/i.test(product.nombre + ' ' + product.categoria)) score += 8;

    return { score: Math.round(score * 10) / 10, skip: false, motivos: motivos, meta: { capacidad_kg_catalogo: kgName } };
  }

  function tokensFromDatos(datos, profile) {
    const tokens = [];
    const skip = { oficio_id: 1, especificos: 1, observaciones: 1 };
    function pushVal(val) {
      if (val == null || val === '') return;
      if (Array.isArray(val)) {
        val.forEach((item) => {
          if (item && typeof item === 'object') pushVal(item.label || item.id);
          else pushVal(item);
        });
        return;
      }
      const s = String(val).toLowerCase().trim();
      if (s.length > 1) tokens.push(s);
    }
    if (datos) {
      Object.keys(datos).forEach((key) => {
        if (skip[key]) return;
        pushVal(datos[key]);
      });
      if (datos.especificos) {
        Object.keys(datos.especificos).forEach((key) => pushVal(datos.especificos[key]));
      }
    }
    (profile && profile.matchKeywords ? profile.matchKeywords : []).forEach((k) => pushVal(k));
    return tokens;
  }

  function scoreGeneric(product, datos, profile) {
    const blob = (product.nombre + ' ' + product.categoria + ' ' + product.marca).toLowerCase();
    let score = 10;
    const motivos = ['catálogo del oficio'];
    tokensFromDatos(datos, profile).forEach((token) => {
      if (token.length < 2) return;
      if (blob.indexOf(token) !== -1) {
        score += token.length > 3 ? 16 : 10;
        motivos.push(token);
      }
    });
    return { score: score, skip: false, motivos: motivos, meta: {} };
  }

  function matchAccessoryAutomatismos(product, mentioned) {
    const blob = (product.nombre + ' ' + product.categoria).toLowerCase();
    return mentioned.some((m) => {
      if (m.id === 'fotocelda') return /fotocelda|fotocélula|desme|reflex/i.test(blob);
      if (m.id === 'control') return /control|mitto|remoto/i.test(blob);
      if (m.id === 'cremallera') return /cremallera/i.test(blob);
      if (m.id === 'bateria') return /bater/i.test(blob);
      if (m.id === 'lampara') return /l[aá]mpara/i.test(blob);
      return blob.includes(String(m.label || '').toLowerCase());
    });
  }

  function toSuggestion(product, ranked) {
    const item = {
      codigo: product.codigo,
      nombre: product.nombre,
      marca: product.marca,
      categoria: product.categoria,
      precio_catalogo: product.precio_catalogo,
      coincidencia: Math.max(1, Math.min(100, Math.round(ranked.score))),
      motivo: ranked.motivos.join('; ') || 'Coincidencia con el catálogo del oficio'
    };
    if (ranked.meta && ranked.meta.capacidad_kg_catalogo != null) {
      item.capacidad_kg_catalogo = ranked.meta.capacidad_kg_catalogo;
    }
    return item;
  }

  function suggest(datos, products, profile) {
    const list = Array.isArray(products) ? products : [];
    const mode = profile && profile.match ? profile.match : 'generic';
    const mentioned = (datos && datos.materiales_mencionados) || [];
    const principales = [];
    const materiales = [];

    list.forEach((product) => {
      if (!product || !product.codigo) return;
      if (mode === 'automatismos' && isAccessory(product.categoria)) {
        if (mentioned.length && matchAccessoryAutomatismos(product, mentioned)) {
          materiales.push(toSuggestion(product, {
            score: 70,
            motivos: ['accesorio del catálogo coincidente'],
            meta: {}
          }));
        }
        return;
      }
      const ranked = mode === 'automatismos'
        ? scoreAutomatismos(product, datos || {})
        : scoreGeneric(product, datos || {}, profile);
      if (ranked.skip || ranked.score < 10) return;
      principales.push(toSuggestion(product, ranked));
    });

    principales.sort((a, b) => b.coincidencia - a.coincidencia || String(a.codigo).localeCompare(String(b.codigo)));
    materiales.sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));

    return {
      productos_sugeridos: principales.slice(0, 12),
      materiales_sugeridos: materiales,
      oficio_id: profile && profile.id ? profile.id : null
    };
  }

  global.ArpaIaCotizadorMatcher = { suggest };
})(typeof window !== 'undefined' ? window : globalThis);
