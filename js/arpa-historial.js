/**
 * Historial de servicios (localStorage)
 */
(function (global) {
  const STORAGE_KEY = 'arpa_suite_servicio_historial';
  const CLIENTES_KEY = 'arpa_suite_clientes';
  const MAX_RECORDS = 200;
  function formatFechaLegible(fechaStr) {
    if (!fechaStr) return '—';
    var d = new Date(fechaStr);
    if (!isNaN(d.getTime())) {
      return String(d.getDate()).padStart(2,'0') + '/' +
             String(d.getMonth()+1).padStart(2,'0') + '/' +
             d.getFullYear();
    }
    return fechaStr;
  }
  const TIPO_LABEL = {
    instalacion: 'Instalación',
    mantenimiento: 'Mantenimiento',
    reparacion: 'Reparación'
  };
  const DOC_META = {
    formato: { icon: '📋', label: 'Formato de Servicio', className: 'historial-doc-formato' },
    cotizacion: { icon: '💰', label: 'Cotización', className: 'historial-doc-cotizacion' },
    'cuenta-cobro': { icon: '🧾', label: 'Cuenta de Cobro', className: 'historial-doc-cuenta-cobro' }
  };
  function getRecords() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }
  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  }
  function newRecordId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  // ── Base de datos de clientes ─────────────────────────────────────────────
  function getClientes() {
    try {
      const data = JSON.parse(localStorage.getItem(CLIENTES_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch(e) { return []; }
  }
  function saveCliente(datos) {
    const nombre = String(datos && datos.nombre || '').trim();
    if (!nombre) return;
    const clientes = getClientes();
    const idx = clientes.findIndex(function(c) {
      return c.nombre.toLowerCase() === nombre.toLowerCase();
    });
    var base = idx >= 0 ? clientes[idx] : {};
    var entry = {
      id:        base.id || newRecordId(),
      nombre:    nombre,
      ciudad:    (datos.ciudad  && String(datos.ciudad).trim())  || base.ciudad  || '',
      nit:       (datos.nit     && String(datos.nit).trim())     || base.nit     || '',
      tel:       (datos.tel     && String(datos.tel).trim())     || base.tel     || '',
      dir:       (datos.dir     && String(datos.dir).trim())     || base.dir     || '',
      email:     (datos.email   && String(datos.email).trim())   || base.email   || '',
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) { clientes[idx] = entry; }
    else { clientes.unshift(entry); }
    try {
      localStorage.setItem(CLIENTES_KEY, JSON.stringify(clientes.slice(0, 500)));
      document.dispatchEvent(new CustomEvent('arpa:clientes-updated'));
    } catch(e) {}
  }
  function getClientesSinServicio(meses) {
    meses = meses || 6;
    var records = getRecords();
    var corte = new Date();
    corte.setMonth(corte.getMonth() - meses);
    // Paso 1: clientes que tuvieron una INSTALACIÓN en Formato
    var instalaciones = {};
    records.forEach(function(r) {
      if (r.modulo !== 'formato') return;
      if (r.subtipo !== 'Instalación' && r.tipo !== 'Instalación') return;
      var nombre = (r.cliente || '').trim().toLowerCase();
      if (!nombre) return;
      var prev = instalaciones[nombre];
      if (!prev || (r.savedAt || r.fecha || '') > (prev.ultimaInstalacion || '')) {
        instalaciones[nombre] = { nombre: r.cliente, ciudad: r.ciudad || '', ultimaInstalacion: r.savedAt || r.fecha || '' };
      }
    });
    // Paso 2: buscar teléfono en DB de clientes
    var clientes = getClientes();
    var clientesDB = {};
    clientes.forEach(function(c) { if (c.nombre) clientesDB[c.nombre.toLowerCase()] = c; });
    // Paso 3: filtrar los que llevan 6+ meses sin ningún servicio
    return Object.values(instalaciones).filter(function(ci) {
      var nombre = ci.nombre.toLowerCase();
      var matching = records.filter(function(r) {
        return r.cliente && r.cliente.toLowerCase() === nombre;
      }).sort(function(a, b) {
        return (b.savedAt || b.fecha || '') > (a.savedAt || a.fecha || '') ? 1 : -1;
      });
      if (!matching.length) return false;
      var ultimo = new Date(matching[0].savedAt || matching[0].fecha || 0);
      return ultimo < corte && !isNaN(ultimo.getTime());
    }).map(function(ci) {
      var nombre = ci.nombre.toLowerCase();
      var matching = records.filter(function(r) {
        return r.cliente && r.cliente.toLowerCase() === nombre;
      }).sort(function(a, b) {
        return (b.savedAt || b.fecha || '') > (a.savedAt || a.fecha || '') ? 1 : -1;
      });
      var ultimaFecha = matching[0] ? (matching[0].savedAt || matching[0].fecha || '') : '';
      var mesesAtras = '';
      if (ultimaFecha) {
        var d = new Date(ultimaFecha);
        if (!isNaN(d.getTime())) {
          var diff = Math.floor((Date.now() - d.getTime()) / (1000*60*60*24*30));
          mesesAtras = diff + ' mes' + (diff !== 1 ? 'es' : '');
        }
      }
      var tel = (clientesDB[nombre] || {}).tel || '';
      return { nombre: ci.nombre, ciudad: ci.ciudad, tel: tel, ultimaFecha: ultimaFecha.slice(0,10), mesesAtras: mesesAtras };
    });
  }
  function readInputLikePdf(el) {
    if (!el) return '';
    if (el.tagName === 'SELECT') {
      return (el.options[el.selectedIndex]?.text || '').trim();
    }
    const valor = (el.value || '').trim();
    return valor || (el.placeholder || '').trim();
  }
  function inferModulo(record) {
    if (!record) return 'formato';
    if (record.modulo === 'cuenta-cobro') return 'cuenta-cobro';
    if (record.modulo === 'cotizacion')   return 'cotizacion';
    var num = (record.numero || record.numeroServicio || '')
                .toString().toUpperCase();
    var doc = (record.documento || '').toLowerCase().trim();
    var tipo = (record.tipo || '').toLowerCase().trim();
    if (num.startsWith('CC-') || doc === 'cuenta de cobro'
        || tipo === 'cuenta de cobro') return 'cuenta-cobro';
    if (num.startsWith('AP-') || num.startsWith('COT-')
        || doc === 'cotización' || doc === 'cotizacion'
        || tipo === 'cotización' || tipo === 'cotizacion')
      return 'cotizacion';
    return 'formato';
  }
  function getDocumentoMeta(record) {
    const modulo = inferModulo(record);
    return DOC_META[modulo] || DOC_META.formato;
  }
  function getDocumentoLabel(record) {
    return record?.documento || getDocumentoMeta(record).label;
  }
  function getSubtipoLabel(record) {
    if (record?.subtipo) return record.subtipo;
    const modulo = inferModulo(record);
    if (modulo === 'formato') {
      const tipo = record?.tipo || '';
      if (tipo && tipo !== getDocumentoLabel(record)) return tipo;
    }
    return '';
  }
  function shouldShowTotal(record) {
    const modulo = inferModulo(record);
    return modulo === 'cotizacion' || modulo === 'cuenta-cobro';
  }
  function getSinDescripcion() { return window.ArpaI18n.t('ui.historial.sin_descripcion'); }
  function trimBrief(text, maxLen) {
    const limit = maxLen || 100;
    const s = String(text || '').trim();
    if (!s) return '';
    return s.length > limit ? s.slice(0, limit - 1) + '…' : s;
  }
  function firstNonEmpty(values) {
    for (let i = 0; i < values.length; i += 1) {
      const t = trimBrief(values[i]);
      if (t) return t;
    }
    return '';
  }
  function buildConceptoFromItemList(items) {
    const list = (items || []).map((item) => String(item || '').trim()).filter(Boolean);
    if (!list.length) return '';
    const first = list[0];
    if (list.length > 1) return `${first} + ${list.length - 1} más`;
    return first;
  }
  function truncateConcepto(text, maxLen) {
    const limit = maxLen || 60;
    const s = String(text || '').trim();
    return s.length > limit ? s.slice(0, limit) + '...' : s;
  }
  function getConceptoDisplay(record, options) {
    const partes = [];
    const subtipo = getSubtipoLabel(record);
    const concepto = (record?.concepto || '').trim();
    if (subtipo) {
      const conceptoLower = concepto.toLowerCase();
      const subtipoLower = subtipo.toLowerCase();
      if (!conceptoLower.startsWith(subtipoLower)) {
        partes.push(subtipo);
      }
    }
    if (concepto) partes.push(concepto);
    if (!partes.length) return getSinDescripcion();
    const texto = partes.join(' · ');
    return options?.full ? texto : truncateConcepto(texto);
  }
  function getFormatoBriefDetail() {
    const oficioId = global.ArpaFormatoTipo?.getDocumentFormatoOficio?.()
      || global.ArpaOficios?.getActiveFormatoOficioId?.()
      || 'automatismos';
    const equipo = global.ArpaFormatoTipo?.getFormatoEquipoValues?.(oficioId);
    const materiales = [];
    document.querySelectorAll('#view-formato .mat-row input[type="text"]').forEach((input) => {
      const v = (input.value || '').trim();
      if (v) materiales.push(v);
    });
    if (equipo) {
      return firstNonEmpty([
        equipo.referencia,
        equipo.marca,
        ...materiales
      ]);
    }
    return firstNonEmpty([...materiales]);
  }
  function getFormatoObservaciones() {
    const lines = [];
    document.querySelectorAll('#view-formato .obs-lines input').forEach((input) => {
      const v = (input.value || '').trim();
      if (v) lines.push(v);
    });
    return firstNonEmpty(lines);
  }
  function buildFormatoConcepto() {
    const tipoEl = document.querySelector('#view-formato input[name="tipo"]:checked');
    const tipoKey = tipoEl?.value || 'instalacion';
    const tipoLabel = TIPO_LABEL[tipoKey] || 'Instalación';
    const detail = getFormatoBriefDetail();
    if (detail) return `${tipoLabel} — ${detail}`;
    const obs = getFormatoObservaciones();
    if (obs) return obs;
    return tipoLabel;
  }
  function buildCotizacionConcepto() {
    const labels = global.ArpaCotizacion?.getCotItemLabels?.() || [];
    let concepto = buildConceptoFromItemList(labels);
    if (!concepto) {
      const obs = (document.getElementById('cot-obs')?.value || '').trim();
      if (obs) concepto = trimBrief(obs, 120);
    }
    return concepto || getSinDescripcion();
  }
  function buildCuentaCobroConcepto(snap) {
    const d = snap || global.ArpaCuentaCobro?.getFormSnapshot?.();
    const items = (d?.servicios || [])
      .map((s) => (s.desc || '').trim())
      .filter(Boolean);
    let concepto = buildConceptoFromItemList(items);
    if (!concepto && d?.observaciones) concepto = trimBrief(d.observaciones, 120);
    return concepto || getSinDescripcion();
  }
  function addRecord(record) {
    const records = getRecords();
    const numero = String(record.numero || '').trim();
    const modulo = inferModulo(record);
    let finalRecord = record;
    if (numero) {
      const existingIdx = records.findIndex(
        (r) => inferModulo(r) === modulo && String(r.numero || '').trim() === numero
      );
      if (existingIdx !== -1) {
        const existing = records[existingIdx];
        finalRecord = { ...existing, ...record, id: existing.id };
        records.splice(existingIdx, 1);
        records.unshift(finalRecord);
        saveRecords(records);
        render();
        global.ArpaCloudSync?.pushHistorialEntry?.(finalRecord);
        return finalRecord;
      }
    }
    records.unshift(finalRecord);
    saveRecords(records);
    render();
    global.ArpaCloudSync?.pushHistorialEntry?.(finalRecord);
    return finalRecord;
  }
  function readFormSnapshot() {
    const tipoEl = document.querySelector('#view-formato input[name="tipo"]:checked');
    const tipoKey = tipoEl?.value || 'instalacion';
    const numeroServicio = readInputLikePdf(document.getElementById('numero-formato'));
    return {
      numero: numeroServicio,
      numeroServicio,
      cliente: readInputLikePdf(document.getElementById('formato-cliente-nombre')),
      subtipo: TIPO_LABEL[tipoKey] || 'Instalación',
      ciudad: readInputLikePdf(document.getElementById('formato-cliente-ciudad')),
      fecha: document.getElementById('formato-fecha')?.value || ''
    };
  }
  function captureFromFormato() {
    const snap = readFormSnapshot();
    var fullSnapshot = null;
    try { fullSnapshot = global.collectFormatoDraft?.() || null; } catch(e) {}
    saveCliente({ nombre: snap.cliente, ciudad: snap.ciudad });
    return addRecord({
      id: newRecordId(),
      modulo: 'formato',
      documento: 'Formato de Servicio',
      subtipo: snap.subtipo,
      tipo: snap.subtipo,
      numero: snap.numero,
      numeroServicio: snap.numeroServicio,
      cliente: snap.cliente,
      ciudad: snap.ciudad,
      fecha: snap.fecha,
      concepto: buildFormatoConcepto(),
      formatoOficio: global.ArpaFormatoTipo?.getDocumentFormatoOficio?.() || 'automatismos',
      fullSnapshot: fullSnapshot,
      savedAt: new Date().toISOString()
    });
  }
  function captureFromCotizacion(snap) {
    const d = snap || global.ArpaCotizacion?.getCotSnapshot?.();
    if (!d) return null;
    var nit   = document.getElementById('cot-nit')?.value   || '';
    var tel   = document.getElementById('cot-tel')?.value   || '';
    var email = document.getElementById('cot-email')?.value || '';
    saveCliente({ nombre: d.cliente, ciudad: d.ciudad, nit, tel, email });
    var fullSnapshot = d ? {
      ...d,
      nit,
      tel,
      email,
      filas:  global.ArpaCotizacion?.getFilas?.()  || [],
      cobros: global.ArpaCobros?.getLines?.('cot') || []
    } : null;
    return addRecord({
      id: newRecordId(),
      modulo: 'cotizacion',
      documento: 'Cotización',
      tipo: 'Cotización',
      numero: d.numero || '',
      numeroServicio: d.numero || '',
      cliente: d.cliente || '',
      ciudad: d.ciudad || '',
      fecha: d.fecha || '',
      total: d.total,
      concepto: buildCotizacionConcepto(),
      fullSnapshot,
      savedAt: new Date().toISOString()
    });
  }
  function captureFromCuentaCobro(snap) {
    const d = snap || global.ArpaCuentaCobro?.getFormSnapshot?.();
    if (!d) return null;
    saveCliente({
      nombre: d.cliente?.nombre,
      ciudad: d.ciudad,
      nit:    d.cliente?.doc,
      tel:    d.cliente?.tel,
      dir:    d.cliente?.dir
    });
    return addRecord({
      id: newRecordId(),
      modulo: 'cuenta-cobro',
      documento: 'Cuenta de Cobro',
      tipo: 'Cuenta de Cobro',
      numero: d.numero || '',
      numeroServicio: d.numero || '',
      cliente: d.cliente?.nombre || '',
      ciudad: d.ciudad || '',
      fecha: d.fechaEmision || '',
      total: d.total,
      concepto: buildCuentaCobroConcepto(d),
      fullSnapshot: d || null,
      savedAt: new Date().toISOString()
    });
  }
  function removeRecord(id) {
    saveRecords(getRecords().filter((r) => r.id !== id));
    render();
    global.ArpaCloudSync?.deleteHistorialEntry?.(id);
  }
  function dedupeRecords() {
    const records = getRecords();
    if (records.length < 2) return false;
    const seen = new Set();
    const result = [];
    const removedIds = [];
    records.forEach((r) => {
      const numero = String(r.numero || '').trim();
      if (!numero) { result.push(r); return; }
      const key = inferModulo(r) + '|' + numero;
      if (seen.has(key)) {
        removedIds.push(r.id);
        return;
      }
      seen.add(key);
      result.push(r);
    });
    if (!removedIds.length) return false;
    saveRecords(result);
    removedIds.forEach((id) => global.ArpaCloudSync?.deleteHistorialEntry?.(id));
    return true;
  }
  function formatoPesos(n) {
    return global.ArpaPricing?.formatoPesos(n) || ('$ ' + (Number(n) || 0).toLocaleString('es-CO'));
  }
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }
  function renderCard(r) {
    const meta = getDocumentoMeta(r);
    const subtipo = getSubtipoLabel(r);
    const showTotal = shouldShowTotal(r) && r.total != null;
    return `
      <article class="historial-card" data-id="${escapeHtml(r.id)}">
        <div class="historial-card-head">
          <span class="historial-num">N° ${escapeHtml(r.numeroServicio || r.numero || '—')}</span>
          <span class="historial-tipo ${meta.className}">
            ${meta.icon} ${escapeHtml(getDocumentoLabel(r))}
            ${subtipo ? `<span class="historial-subtipo">${escapeHtml(subtipo)}</span>` : ''}
          </span>
        </div>
        <div class="historial-card-body">
          <div class="historial-row"><span>${escapeHtml(window.ArpaI18n.t('ui.historial.cliente'))}</span><strong>${escapeHtml(r.cliente || '—')}</strong></div>
          <div class="historial-row historial-row-concepto"><span>${escapeHtml(window.ArpaI18n.t('ui.historial.concepto'))}</span><strong>${escapeHtml(getConceptoDisplay(r))}</strong></div>
          <div class="historial-row"><span>${escapeHtml(window.ArpaI18n.t('ui.historial.ciudad'))}</span><strong>${escapeHtml(r.ciudad || '—')}</strong></div>
          <div class="historial-row"><span>${escapeHtml(window.ArpaI18n.t('ui.historial.fecha'))}</span><strong>${escapeHtml(formatFechaLegible(r.fecha))}</strong></div>
          ${showTotal ? `<div class="historial-row"><span>${escapeHtml(window.ArpaI18n.t('ui.historial.total'))}</span><strong>${escapeHtml(formatoPesos(r.total))}</strong></div>` : ''}
        </div>
        <button type="button" class="historial-delete" data-id="${escapeHtml(r.id)}" aria-label="${escapeHtml(window.ArpaI18n.t('aria.historial.eliminar_registro'))}">${escapeHtml(window.ArpaI18n.t('ui.historial.eliminar'))}</button>
        <button type="button" class="btn-ver-doc" onclick="ArpaHistorial.verDocumento('${escapeHtml(r.id)}')">
          ${escapeHtml(window.ArpaI18n.t('ui.historial.ver_documento'))} 📄
        </button>
      </article>`;
  }
  function verDocumento(id) {
    const records = getRecords();
    const r = records.find((rec) => rec.id === id);
    if (!r) {
      alert(window.ArpaI18n.t('alert.historial.registro_no_encontrado'));
      return;
    }
    const modulo = inferModulo(r);
    if (modulo === 'formato') {
      document.querySelector('.main-menu-btn[onclick*="scrollToTopMenu"]')?.click();
      setTimeout(() => {
        if (r.fullSnapshot && global.applyFormatoDraft) {
          try {
            var draftKey = global.ArpaBrand?.FORMATO_DRAFT_KEY || 'arpa_formato_borrador';
            localStorage.setItem(draftKey, JSON.stringify(r.fullSnapshot));
            global.applyFormatoDraft();
          } catch(e) {
            if (r.cliente) { var el = document.getElementById('formato-cliente-nombre'); if (el) el.value = r.cliente; }
            if (r.ciudad)  { var el2 = document.getElementById('formato-cliente-ciudad'); if (el2) el2.value = r.ciudad; }
            if (r.fecha)   { var el3 = document.getElementById('formato-fecha'); if (el3) el3.value = r.fecha; }
          }
        } else {
          if (r.cliente) { const el = document.getElementById('formato-cliente-nombre'); if (el) el.value = r.cliente; }
          if (r.ciudad)  { const el = document.getElementById('formato-cliente-ciudad'); if (el) el.value = r.ciudad; }
          if (r.fecha)   { const el = document.getElementById('formato-fecha'); if (el) el.value = r.fecha; }
        }
        window.scrollTo(0, 0);
        alert(window.ArpaI18n.t('alert.historial.documento_restaurado'));
      }, 400);
    } else if (modulo === 'cotizacion') {
      document.querySelector('.main-menu-btn[onclick*="openCotizacionView"]')?.click();
      setTimeout(() => {
        var fs = r.fullSnapshot;
        if (fs && global.ArpaCotizacion?.loadCotizacion) {
          global.ArpaCotizacion.loadCotizacion({
            numero:  fs.numero  || r.numero  || '',
            cliente: fs.cliente || r.cliente || '',
            ciudad:  fs.ciudad  || r.ciudad  || '',
            fecha:   fs.fecha   || r.fecha   || '',
            nit:     fs.nit   || '',
            tel:     fs.tel   || '',
            email:   fs.email || '',
            filas:   fs.filas  || [],
            cobros:  fs.cobros || []
          });
        } else {
          var cliente = (fs && fs.cliente) || r.cliente || '';
          var ciudad  = (fs && fs.ciudad)  || r.ciudad  || '';
          var fecha   = (fs && fs.fecha)   || r.fecha   || '';
          var numero  = (fs && fs.numero)  || r.numero  || '';
          if (numero)  { const el = document.getElementById('numero-cot');  if (el) el.value = numero; }
          if (cliente) { const el = document.getElementById('cot-nombre');  if (el) el.value = cliente; }
          if (ciudad)  { const el = document.getElementById('cot-ciudad');  if (el) el.value = ciudad; }
          if (fecha)   { const el = document.getElementById('cot-fecha');   if (el) el.value = fecha; }
        }
        window.scrollTo(0, 0);
        alert(window.ArpaI18n.t('alert.historial.documento_restaurado'));
      }, 400);
    } else {
      document.querySelector('.main-menu-btn[onclick*="openCuentaCobroView"]')?.click();
      setTimeout(() => {
        var fs = r.fullSnapshot;
        if (fs && global.ArpaCuentaCobro?.applyCcDraft) {
          try {
            var draft = {
              numero:           fs.numero           || r.numero  || '',
              ciudad:           fs.ciudad           || r.ciudad  || '',
              fechaEmision:     fs.fechaEmision     || r.fecha   || '',
              fechaVencimiento: fs.fechaVencimiento || '',
              clienteNombre:    (fs.cliente && fs.cliente.nombre) || r.cliente || '',
              clienteDoc:       (fs.cliente && fs.cliente.doc)    || '',
              clienteDir:       (fs.cliente && fs.cliente.dir)    || '',
              clienteTel:       (fs.cliente && fs.cliente.tel)    || '',
              obs:              fs.obs    || '',
              conIva:           !!fs.iva,
              conRet:           !!fs.retencion,
              retPct:           fs.retPct || '11',
              pago:             fs.pago   || null,
              servicios: (fs.servicios || []).map(function(s) {
                return { desc: s.desc || '', cant: s.cant || 1, unit: s.unit || 0 };
              }),
              firmaCobrador: '',
              firmaCliente:  ''
            };
            localStorage.setItem('arpa_cuenta_cobro_draft', JSON.stringify(draft));
            global.ArpaCuentaCobro.applyCcDraft();
          } catch(e) {
            if (r.cliente) { const el = document.getElementById('cc-cliente-nombre'); if (el) el.value = r.cliente; }
            if (r.ciudad)  { const el = document.getElementById('cc-ciudad');          if (el) el.value = r.ciudad; }
          }
        } else {
          var clienteNombre = (fs && fs.cliente && fs.cliente.nombre) || r.cliente || '';
          var clienteDoc    = (fs && fs.cliente && fs.cliente.doc)    || '';
          var clienteDir    = (fs && fs.cliente && fs.cliente.dir)    || '';
          var clienteTel    = (fs && fs.cliente && fs.cliente.tel)    || '';
          var ciudad  = (fs && fs.ciudad)        || r.ciudad || '';
          var fecha   = (fs && fs.fechaEmision)  || r.fecha  || '';
          var numero  = (fs && fs.numero)        || r.numero || '';
          if (numero)       { const el = document.getElementById('cc-numero');         if (el) el.value = numero; }
          if (clienteNombre){ const el = document.getElementById('cc-cliente-nombre'); if (el) el.value = clienteNombre; }
          if (clienteDoc)   { const el = document.getElementById('cc-cliente-doc');    if (el) el.value = clienteDoc; }
          if (clienteDir)   { const el = document.getElementById('cc-cliente-dir');    if (el) el.value = clienteDir; }
          if (clienteTel)   { const el = document.getElementById('cc-cliente-tel');    if (el) el.value = clienteTel; }
          if (ciudad)       { const el = document.getElementById('cc-ciudad');         if (el) el.value = ciudad; }
          if (fecha)        { const el = document.getElementById('cc-fecha-emision');  if (el) el.value = fecha; }
        }
        window.scrollTo(0, 0);
        alert(window.ArpaI18n.t('alert.historial.documento_restaurado'));
      }, 400);
    }
  }
  let filtroActivo = 'todos';
  let textoBusqueda = '';
  function renderStats() {
    function toYM(str) {
      if (!str) return '';
      if (/^\d{4}-\d{2}/.test(str)) return str.slice(0, 7);
      var d = new Date(str);
      if (!isNaN(d.getTime())) return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      return '';
    }
    var records = getRecords();
    var ahora = new Date();
    var mesActual = ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0');
    var esteMes = records.filter(function(r) {
      return toYM(r.fecha) === mesActual || toYM(r.savedAt) === mesActual;
    });
    var totalCotMes = esteMes
      .filter(function(r) { return inferModulo(r) === 'cotizacion' && r.total; })
      .reduce(function(s, r) { return s + (Number(r.total) || 0); }, 0);
    var elTotal = document.getElementById('hist-stat-total-n');
    var elMes   = document.getElementById('hist-stat-mes-n');
    var elCot   = document.getElementById('hist-stat-cot-mes');
    if (elTotal) elTotal.textContent = records.length;
    if (elMes)   elMes.textContent   = esteMes.length;
    if (elCot)   elCot.textContent   = formatoPesos(totalCotMes);
  }
  function render() {
    renderStats();
    const list = document.getElementById('historial-list');
    const empty = document.getElementById('historial-empty');
    if (!list) return;
    let records = getRecords();
    if (filtroActivo !== 'todos') {
      records = records.filter(function(r) { return inferModulo(r) === filtroActivo; });
    }
    if (textoBusqueda.trim()) {
      const q = textoBusqueda.trim().toLowerCase();
      records = records.filter(function(r) {
        return (r.cliente || '').toLowerCase().includes(q)
          || (r.ciudad  || '').toLowerCase().includes(q)
          || (r.numero  || '').toLowerCase().includes(q)
          || (r.numeroServicio || '').toLowerCase().includes(q);
      });
    }
    if (!records.length) {
      list.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    list.innerHTML = records.map(function(r) { return renderCard(r); }).join('');
    list.querySelectorAll('.historial-delete').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (confirm(window.ArpaI18n.t('confirm.historial.eliminar_registro'))) {
          removeRecord(btn.dataset.id);
        }
      });
    });
  }
  function exportCSV() {
    const records = getRecords();
    if (!records.length) {
      alert(window.ArpaI18n.t('alert.historial.no_hay_registros'));
      return;
    }
    const header = ['Documento', 'Subtipo', 'Numero', 'Cliente', 'Concepto', 'Ciudad', 'Fecha', 'Total', 'Guardado'];
    const rows = records.map((r) => [
      getDocumentoLabel(r),
      getSubtipoLabel(r),
      r.numeroServicio || r.numero,
      r.cliente,
      getConceptoDisplay(r, { full: true }),
      r.ciudad,
      r.fecha,
      shouldShowTotal(r) && r.total != null ? r.total : '',
      r.savedAt
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-servicios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function guardarPDFYHistorial() {
    if (typeof global.guardarPDF === 'function') global.guardarPDF();
  }
  function patchCloseSettingsForHistorial() {
    const orig = global.closeSettingsModal;
    if (typeof orig !== 'function' || orig.__historialPatch) return;
    global.closeSettingsModal = function patchedCloseSettings() {
      orig();
      if (global.ArpaViews?.getCurrentView?.() === 'historial') {
        document.querySelectorAll('.main-menu-btn').forEach((b) => b.classList.remove('active'));
        document.querySelector('.main-menu-btn[onclick*="openHistorialView"]')?.classList.add('active');
      }
    };
    global.closeSettingsModal.__historialPatch = true;
  }
  function initFiltros() {
    const buscar = document.getElementById('historial-buscar');
    if (buscar) {
      buscar.addEventListener('input', function() {
        textoBusqueda = buscar.value;
        render();
      });
    }
    document.querySelectorAll('.historial-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        filtroActivo = btn.dataset.filtro;
        textoBusqueda = '';
        const buscarEl = document.getElementById('historial-buscar');
        if (buscarEl) buscarEl.value = '';
        document.querySelectorAll('.historial-tab').forEach(function(b) {
          b.style.background = '#fff';
          b.style.color = 'var(--navy)';
          b.classList.remove('active');
        });
        btn.style.background = 'var(--navy)';
        btn.style.color = '#fff';
        btn.classList.add('active');
        render();
      });
    });
  }
  global.ArpaHistorial = {
    STORAGE_KEY,
    CLIENTES_KEY,
    getClientes,
    saveCliente,
    getClientesSinServicio,
    getRecords,
    readInputLikePdf,
    readFormSnapshot,
    buildFormatoConcepto,
    buildCotizacionConcepto,
    buildCuentaCobroConcepto,
    getConceptoDisplay,
    captureFromFormato,
    captureFromCotizacion,
    captureFromCuentaCobro,
    dedupeRecords,
    render,
    exportCSV,
    removeRecord,
    verDocumento,
    initFiltros
  };
  global.guardarPDFYHistorial = guardarPDFYHistorial;
  global.exportarHistorialCSV = exportCSV;
  document.addEventListener('DOMContentLoaded', () => {
    patchCloseSettingsForHistorial();
    dedupeRecords();
    initFiltros();
    (function migrarModulos() {
      try {
        var raw = localStorage.getItem('arpa_suite_servicio_historial');
        if (!raw) return;
        var recs = JSON.parse(raw);
        if (!Array.isArray(recs)) return;
        var dirty = false;
        recs.forEach(function(r) {
          var m = inferModulo(r);
          if (r.modulo !== m) { r.modulo = m; dirty = true; }
        });
        if (dirty) localStorage.setItem(
          'arpa_suite_servicio_historial', JSON.stringify(recs));
      } catch(e) {}
    })();
    render();
    document.getElementById('btn-exportar-historial')?.addEventListener('click', exportCSV);
  });
})(window);
