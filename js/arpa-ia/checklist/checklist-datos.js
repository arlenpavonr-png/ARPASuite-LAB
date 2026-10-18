/**
 * Checklist de mantenimiento preventivo — datos y lógica pura (sin DOM).
 * Los puntos dependen del tipo de puerta marcado en el Formato de Servicio
 * (chips #formato-tipo-chips, oficio automatismos).
 */
(function (global) {
  const ESTADOS = ['ok', 'ajuste', 'cambio'];

  // id del chip del formato -> grupo de puntos
  const CHIP_GRUPO = {
    c1: 'corrediza',
    c2: 'batiente',
    c3: 'batiente',
    c4: 'levadiza',
    c5: 'levadiza',
    c6: 'barrera',
    c7: 'techo',
    c9: 'cortina'
  };

  const GRUPOS = {
    general: {
      titulo: 'Motor y sistema eléctrico',
      puntos: [
        ['gen-tarjeta', 'Tarjeta de control y conexiones eléctricas'],
        ['gen-voltaje', 'Voltaje de alimentación y protecciones (breaker, polo a tierra)'],
        ['gen-fotoceldas', 'Fotoceldas: alineación y funcionamiento'],
        ['gen-controles', 'Controles remotos y receptor'],
        ['gen-bateria', 'Batería de respaldo (si aplica)'],
        ['gen-desbloqueo', 'Desbloqueo manual'],
        ['gen-fuerza', 'Fuerza del motor e inversión por obstáculo'],
        ['gen-limpieza', 'Limpieza general del equipo']
      ]
    },
    corrediza: {
      titulo: 'Puerta corrediza',
      puntos: [
        ['cor-cremallera', 'Cremallera: fijación, alineación y desgaste'],
        ['cor-pinon', 'Piñón: desgaste y holgura con la cremallera'],
        ['cor-finales', 'Finales de carrera calibrados'],
        ['cor-ruedas', 'Ruedas y riel: limpieza y rodamientos'],
        ['cor-guias', 'Guías superiores y rodillos'],
        ['cor-anclaje', 'Anclaje del motor a la base'],
        ['cor-lubricacion', 'Lubricación del reductor (según modelo)']
      ]
    },
    batiente: {
      titulo: 'Puerta batiente',
      puntos: [
        ['bat-brazos', 'Brazos o actuadores: fijación de soportes'],
        ['bat-bisagras', 'Bisagras: lubricación y desgaste'],
        ['bat-topes', 'Topes de apertura y cierre'],
        ['bat-cerradura', 'Electrocerradura (si aplica)'],
        ['bat-desfase', 'Tiempos y desfase de hojas (2 hojas)']
      ]
    },
    levadiza: {
      titulo: 'Puerta levadiza / seccional',
      puntos: [
        ['lev-resortes', 'Resortes: balance de la puerta'],
        ['lev-cables', 'Cables de acero y tambores'],
        ['lev-rieles', 'Rieles y rodachinas: limpieza y lubricación'],
        ['lev-transmision', 'Cadena o correa del operador: tensión'],
        ['lev-carro', 'Carro y brazo de arrastre'],
        ['lev-bisagras', 'Bisagras de paneles']
      ]
    },
    barrera: {
      titulo: 'Barrera vehicular',
      puntos: [
        ['bar-pluma', 'Pluma: fijación y alineación'],
        ['bar-resorte', 'Resorte de balance'],
        ['bar-detector', 'Lazo magnético o detector vehicular'],
        ['bar-tiempos', 'Tiempos de apertura y cierre']
      ]
    },
    techo: {
      titulo: 'Techo corredizo',
      puntos: [
        ['tec-rieles', 'Rieles y carros: limpieza y lubricación'],
        ['tec-arrastre', 'Cremallera o cadena de arrastre'],
        ['tec-sellos', 'Sellos, empaques y drenaje'],
        ['tec-finales', 'Finales de carrera']
      ]
    },
    cortina: {
      titulo: 'Cortina enrollable',
      puntos: [
        ['crt-motor', 'Motor: fijación y finales de carrera'],
        ['crt-eje', 'Eje y resortes de balance'],
        ['crt-guias', 'Guías laterales: limpieza'],
        ['crt-lamas', 'Lamas o tablillas: estado'],
        ['crt-freno', 'Freno o sistema anticaída (si aplica)'],
        ['crt-cerradura', 'Cerradura o candado']
      ]
    }
  };

  const PROXIMO = ['1 mes', '3 meses', '6 meses', '12 meses'];

  /** Grupos a mostrar según los chips marcados (siempre incluye "general" primero). */
  function gruposParaChips(chipIds) {
    const out = ['general'];
    (chipIds || []).forEach(function (id) {
      const g = CHIP_GRUPO[id];
      if (g && out.indexOf(g) === -1) out.push(g);
    });
    return out.map(function (key) {
      return { key: key, titulo: GRUPOS[key].titulo, puntos: GRUPOS[key].puntos.map(function (p) { return { id: p[0], texto: p[1] }; }) };
    });
  }

  function normalizarEstado(v) {
    return ESTADOS.indexOf(v) === -1 ? '' : v;
  }

  /** Pulsar el estado ya elegido lo quita; si no, lo pone. */
  function alternar(estadoActual, pulsado) {
    const p = normalizarEstado(pulsado);
    return normalizarEstado(estadoActual) === p ? '' : p;
  }

  /** Conteos solo de los puntos visibles. */
  function resumen(grupos, estados) {
    const r = { total: 0, revisados: 0, ok: 0, ajuste: 0, cambio: 0 };
    (grupos || []).forEach(function (g) {
      g.puntos.forEach(function (p) {
        r.total++;
        const e = normalizarEstado(estados && estados[p.id]);
        if (e) { r.revisados++; r[e]++; }
      });
    });
    return r;
  }

  /** Clave de guardado por número de formato. */
  function claveDocumento(numero) {
    const n = String(numero || '').trim();
    return n || '_sin_numero';
  }

  /** Recorta el almacén a los `max` documentos más recientes. */
  function podar(store, max) {
    const keys = Object.keys(store || {});
    if (keys.length <= max) return store;
    keys.sort(function (a, b) { return (store[a].t || 0) - (store[b].t || 0); });
    const out = Object.assign({}, store);
    keys.slice(0, keys.length - max).forEach(function (k) { delete out[k]; });
    return out;
  }

  global.ArpaChecklistDatos = {
    ESTADOS: ESTADOS,
    PROXIMO: PROXIMO,
    CHIP_GRUPO: CHIP_GRUPO,
    GRUPOS: GRUPOS,
    gruposParaChips: gruposParaChips,
    normalizarEstado: normalizarEstado,
    alternar: alternar,
    resumen: resumen,
    claveDocumento: claveDocumento,
    podar: podar
  };
})(typeof window !== 'undefined' ? window : globalThis);
