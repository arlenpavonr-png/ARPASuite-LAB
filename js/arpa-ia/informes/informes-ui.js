/**
 * Puente LAB: lee la OT del formato y llama a ArpaIaInformes.generarAsync.
 * No reemplaza el PDF. Si el LLM falla, queda el informe local.
 */
(function (global) {
  const TIPO_LABEL = {
    mantenimiento: 'Mantenimiento',
    reparacion: 'Reparación',
    instalacion: 'Instalación'
  };

  function $(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function val(id) {
    const el = $(id);
    return el && el.value != null ? String(el.value).trim() : '';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function listHtml(items, emptyText) {
    if (!items || !items.length) {
      return '<p class="arpa-ia-tec-empty">' + escapeHtml(emptyText) + '</p>';
    }
    return '<ul>' + items.map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join('') + '</ul>';
  }

  function oficioActivo() {
    if (global.ArpaOficios && typeof global.ArpaOficios.getActiveFormatoOficioId === 'function') {
      return global.ArpaOficios.getActiveFormatoOficioId();
    }
    return 'automatismos';
  }

  function trimText(value) {
    return value == null ? '' : String(value).trim();
  }

  function componerUbicacion(campos) {
    const c = campos && typeof campos === 'object' ? campos : {};
    const direccion = trimText(c.direccion || c.direccion_instalacion || '');
    const ciudad = trimText(c.ciudad || '');
    const ubicacion = trimText(c.ubicacion || '');
    if (direccion && ciudad) {
      const dirLow = direccion.toLowerCase();
      const ciudadLow = ciudad.toLowerCase();
      if (dirLow === ciudadLow || dirLow.indexOf(ciudadLow) !== -1) return direccion;
      return direccion + ', ' + ciudad;
    }
    return direccion || ciudad || ubicacion;
  }

  function formatearMaterial(row) {
    if (row == null) return '';
    if (typeof row === 'string') return trimText(row);
    if (typeof row !== 'object') return trimText(row);
    const desc = trimText(row.desc || row.descripcion || row.nombre || '');
    if (!desc) return '';
    const cant = trimText(row.cant != null ? row.cant : row.cantidad);
    const unidad = trimText(row.unidad);
    const obs = trimText(row.obs || row.observacion || '');
    const parts = [desc];
    if (cant) parts.push(cant);
    if (unidad) parts.push(unidad);
    if (obs) parts.push(obs);
    return parts.join(' ').trim();
  }

  function formatearMateriales(list) {
    if (!Array.isArray(list)) return [];
    return list.map(formatearMaterial).filter(Boolean);
  }

  function otDesdeCampos(campos) {
    const c = campos && typeof campos === 'object' ? campos : {};
    return {
      numero_ot: c.numero_ot || c.numero || '',
      fecha: c.fecha || '',
      cliente: c.cliente || '',
      ubicacion: componerUbicacion(c),
      tecnico: trimText(c.tecnico || c.tecnico_responsable || ''),
      oficio: c.oficio || c.oficio_id || '',
      tipo_servicio: c.tipo_servicio || c.tipo || '',
      equipo: c.equipo || '',
      marca: c.marca || '',
      modelo: c.modelo || c.referencia || '',
      descripcion_trabajo: c.descripcion_trabajo || c.descripcion || '',
      sintomas: Array.isArray(c.sintomas) ? c.sintomas.slice() : [],
      hallazgos: Array.isArray(c.hallazgos) ? c.hallazgos.slice() : [],
      trabajos_realizados: Array.isArray(c.trabajos_realizados) ? c.trabajos_realizados.slice() : [],
      materiales: formatearMateriales(c.materiales),
      observaciones: c.observaciones || '',
      resultado: c.resultado || '',
      recomendaciones: Array.isArray(c.recomendaciones) ? c.recomendaciones.slice() : [],
      estado: c.estado || '',
      ia_tecnica: c.ia_tecnica || null
    };
  }

  function leerObservaciones() {
    const lines = [];
    if (!global.document) return lines;
    global.document.querySelectorAll('#formato-section-observaciones .obs-lines input').forEach(function (el) {
      const v = String(el.value || '').trim();
      if (v) lines.push(v);
    });
    return lines;
  }

  function leerDireccion() {
    const byId = val('formato-cliente-direccion');
    if (byId) return byId;
    if (!global.document) return '';
    const el = global.document.querySelector('#view-formato input[data-i18n-placeholder="formato.placeholder.direccion"]');
    return el && el.value != null ? String(el.value).trim() : '';
  }

  function leerTecnicoResponsable() {
    return val('campo-tecnico-responsable');
  }

  function leerMateriales() {
    if (global.ArpaOT && typeof global.ArpaOT.collectMateriales === 'function') {
      return formatearMateriales(global.ArpaOT.collectMateriales() || []);
    }
    return [];
  }

  function leerEquipo() {
    const oficioId = oficioActivo();
    let tipos = [];
    if (global.ArpaOficios && typeof global.ArpaOficios.getFormatoCheckedLabels === 'function') {
      tipos = global.ArpaOficios.getFormatoCheckedLabels(oficioId) || [];
    }
    const otra = val('formato-tipo-otra-texto');
    const bits = tipos.slice();
    if (otra && bits.join(' ').indexOf(otra) === -1) bits.push(otra);
    return bits.join(', ');
  }

  function leerMarcaModelo() {
    const marcaSel = val('sel-marca');
    const marcaTxt = val('formato-equipo-marca-text');
    const marca = marcaTxt || (marcaSel && marcaSel !== 'Otra' ? marcaSel : '');
    const modelo = val('formato-equipo-ref-text') || val('ref-manual') || val('sel-referencia');
    return { marca: marca, modelo: modelo };
  }

  function leerIaTecnica() {
    const raw = val('formato-ia-tecnica-json');
    if (!raw) return null;
    if (global.ArpaIaTecnica && typeof global.ArpaIaTecnica.parseDesdeOt === 'function') {
      return global.ArpaIaTecnica.parseDesdeOt(raw);
    }
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function recogerOtDesdeFormato() {
    const tipoEl = global.document
      ? global.document.querySelector('#view-formato input[name="tipo"]:checked')
      : null;
    const tipo = tipoEl ? String(tipoEl.value || '').trim() : '';
    const obs = leerObservaciones();
    const mm = leerMarcaModelo();
    const tipoLabel = TIPO_LABEL[tipo] || tipo;
    const equipo = leerEquipo();
    const descBits = [];
    if (tipoLabel) descBits.push(tipoLabel);
    if (equipo) descBits.push(equipo);
    return otDesdeCampos({
      numero_ot: val('numero-formato'),
      fecha: val('formato-fecha'),
      cliente: val('formato-cliente-nombre'),
      direccion: leerDireccion(),
      ciudad: val('formato-cliente-ciudad'),
      tecnico: leerTecnicoResponsable(),
      oficio: oficioActivo(),
      tipo_servicio: tipo,
      equipo: equipo,
      marca: mm.marca,
      modelo: mm.modelo,
      descripcion_trabajo: descBits.join(' — '),
      trabajos_realizados: obs.slice(),
      materiales: leerMateriales(),
      observaciones: obs.join(' '),
      estado: val('formato-ot-estado'),
      ia_tecnica: leerIaTecnica()
    });
  }

  function setStatus(text, kind) {
    const el = $('arpa-ia-inf-status');
    if (!el) return;
    el.hidden = !text;
    el.className = 'arpa-ia-tec-status' + (kind ? ' is-' + kind : '');
    el.textContent = text || '';
  }

  function setBusy(busy) {
    const btn = $('arpa-ia-inf-run');
    if (btn) btn.disabled = !!busy;
  }

  function renderInforme(informe) {
    const box = $('arpa-ia-inf-resultado');
    const titulo = $('arpa-ia-inf-titulo');
    const resumen = $('arpa-ia-inf-resumen');
    const hechos = $('arpa-ia-inf-hechos');
    const jsonEl = $('formato-ia-informe-json');
    if (!informe) return;
    if (jsonEl) jsonEl.value = JSON.stringify(informe);
    if (box) box.hidden = false;
    if (titulo) {
      titulo.hidden = false;
      titulo.textContent = informe.titulo || 'Informe técnico';
    }
    if (resumen) resumen.textContent = informe.resumen_cliente || informe.nota_tecnica || '';
    if (hechos) {
      const mats = informe.materiales_utilizados || [];
      hechos.innerHTML =
        '<p><strong>Oficio:</strong> ' + escapeHtml(informe.oficio || '') +
        ' · <strong>Tipo:</strong> ' + escapeHtml(informe.tipo_servicio || '') +
        ' · <strong>OT:</strong> ' + escapeHtml(informe.numero_ot || '—') + '</p>' +
        listHtml(informe.trabajos_realizados, 'Sin trabajos registrados.') +
        '<p class="arpa-ia-tec-empty">Materiales: ' +
        escapeHtml(mats.length ? mats.join('; ') : 'ninguno registrado') + '</p>' +
        '<p class="arpa-ia-tec-empty">causa_confirmada: ' + (informe.causa_confirmada ? 'true' : 'false') + '</p>';
    }
  }

  function statusFromInforme(informe) {
    if (!informe) {
      setStatus('No se obtuvo informe.', 'warn');
      return;
    }
    if (informe.estado_llm === 'ok') {
      setStatus('Informe listo (LLM DEV + motor local). PDF tradicional sin cambios.', 'ok');
    } else if (informe.estado_llm === 'bloqueado_produccion') {
      setStatus('Se bloqueó un endpoint de producción. Se usó el informe local.', 'warn');
    } else if (informe.estado_llm === 'error') {
      const msg = informe.error_llm && informe.error_llm.mensaje
        ? informe.error_llm.mensaje
        : 'LLM DEV no respondió. Se usó el informe local.';
      setStatus(msg, 'warn');
    } else {
      setStatus('Informe local listo. LLM desconectado.', 'ok');
    }
  }

  async function generarDesdeOt() {
    const api = global.ArpaIaInformes;
    if (!api || typeof api.generarAsync !== 'function') {
      setStatus('El motor de informes no está cargado.', 'warn');
      return null;
    }
    const ot = recogerOtDesdeFormato();
    setBusy(true);
    setStatus('Generando informe con los datos de esta OT…', 'busy');
    try {
      const informe = await api.generarAsync(ot);
      renderInforme(informe);
      statusFromInforme(informe);
      return informe;
    } catch (err) {
      const local = api.generar(ot);
      renderInforme(local);
      setStatus('El LLM no respondió. Se usó el informe local. El PDF no cambia.', 'warn');
      return local;
    } finally {
      setBusy(false);
    }
  }

  function bind() {
    const btn = $('arpa-ia-inf-run');
    if (btn) btn.addEventListener('click', function () { generarDesdeOt(); });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
  }

  global.ArpaIaInformesUi = {
    otDesdeCampos: otDesdeCampos,
    recogerOtDesdeFormato: recogerOtDesdeFormato,
    generarDesdeOt: generarDesdeOt,
    componerUbicacion: componerUbicacion,
    formatearMaterial: formatearMaterial
  };
})(typeof window !== 'undefined' ? window : globalThis);
