/**
 * Módulo: Cuenta de Cobro (formulario, PDF jsPDF, WhatsApp)
 */
(function (global) {
  const CC_NUM_KEY = 'arpa_cc_num';
  const SETTINGS_KEY = 'arpa_suite_user_settings';
  const DRAFT_KEY = 'arpa_cuenta_cobro_draft';
  const NAVY = [15, 32, 68];
  const GOLD = [217, 119, 6];
  const MUTED = [100, 116, 139];

  let servicios = [{ desc: '', cant: 1, unit: 0 }];
  let draftSaveTimer = null;

  // Link de pago opcional (js/arpa-link-pago.js): se carga desde aquí para no tocar index.html.
  if (typeof document !== 'undefined' && !global.ArpaLinkPago && !document.querySelector('script[data-arpa-link-pago]')) {
    try {
      const s = document.createElement('script');
      s.src = './js/arpa-link-pago.js';
      s.async = false;
      s.setAttribute('data-arpa-link-pago', '1');
      (document.head || document.documentElement).appendChild(s);
    } catch (e) { /* sin link de pago */ }
  }

  // Cara nueva de cotización e informe en PDF (js/arpa-doc-estilo.js): solo estilos al imprimir; mismo camino para no tocar index.html.
  if (typeof document !== 'undefined' && !global.ArpaDocEstilo && !document.querySelector('script[data-arpa-doc-estilo]')) {
    try {
      const s2 = document.createElement('script');
      s2.src = './js/arpa-doc-estilo.js';
      s2.async = false;
      s2.setAttribute('data-arpa-doc-estilo', '1');
      (document.head || document.documentElement).appendChild(s2);
    } catch (e) { /* sin estilo nuevo: queda el de siempre */ }
  }

  // Idioma del documento para el cliente (ArpaDocLang en arpa-i18n.js). Con Español devuelven el texto
  // y la fecha exactamente como antes; con English, el PDF y el mensaje salen en inglés.
  function dt(key, esText) {
    return global.ArpaDocLang?.text?.(key, esText) ?? esText;
  }

  function fd(value) {
    return global.ArpaDocLang?.date?.(value) ?? value;
  }

  function getJsPDF() {
    return global.jspdf?.jsPDF || global.jsPDF || null;
  }

  function collectCcDraft() {
    return {
      numero: document.getElementById('cc-numero')?.value || '',
      ciudad: document.getElementById('cc-ciudad')?.value || '',
      fechaEmision: document.getElementById('cc-fecha-emision')?.value || '',
      fechaVencimiento: document.getElementById('cc-fecha-vencimiento')?.value || '',
      clienteNombre: document.getElementById('cc-cliente-nombre')?.value || '',
      clienteDoc: document.getElementById('cc-cliente-doc')?.value || '',
      clienteDir: document.getElementById('cc-cliente-dir')?.value || '',
      clienteTel: document.getElementById('cc-cliente-tel')?.value || '',
      obs: document.getElementById('cc-obs')?.value || '',
      conIva: !!document.getElementById('cc-iva-check')?.checked,
      conRet: !!document.getElementById('cc-ret-check')?.checked,
      retPct: document.getElementById('cc-ret-pct')?.value || '11',
      pago: getPaymentData(),
      servicios: servicios.map((s) => ({
        desc: s.desc || '',
        cant: parseCant(s.cant),
        unit: parseNum(s.unit)
      })),
      firmaCobrador: global.ArpaSignature?.getDataUrl?.('canvas-cc-cobrador') || '',
      firmaCliente: global.ArpaSignature?.getDataUrl?.('canvas-cc-cliente') || ''
    };
  }

  function applyCcDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return false;

      const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
      set('cc-numero', d.numero);
      set('cc-ciudad', d.ciudad);
      set('cc-fecha-emision', d.fechaEmision);
      set('cc-fecha-vencimiento', d.fechaVencimiento);
      set('cc-cliente-nombre', d.clienteNombre);
      set('cc-cliente-doc', d.clienteDoc);
      set('cc-cliente-dir', d.clienteDir);
      set('cc-cliente-tel', d.clienteTel);
      set('cc-obs', d.obs);
      set('cc-ret-pct', d.retPct);

      const ivaCheck = document.getElementById('cc-iva-check');
      const retCheck = document.getElementById('cc-ret-check');
      if (ivaCheck) ivaCheck.checked = !!d.conIva;
      if (retCheck) retCheck.checked = !!d.conRet;

      if (d.pago) {
        set('cc-pago-banco', d.pago.bankName);
        set('cc-pago-numero', d.pago.accountNumber);
        set('cc-pago-titular', d.pago.accountHolder);
        set('cc-pago-titular-doc', d.pago.accountHolderDocument);
        set('cc-pago-tipo', d.pago.accountType);
      }

      if (Array.isArray(d.servicios) && d.servicios.length) {
        servicios = d.servicios.map((s) => ({
          desc: s.desc || '',
          cant: parseCant(s.cant),
          unit: parseNum(s.unit)
        }));
      }

      if (d.firmaCobrador) global.ArpaSignature?.restoreDataUrl?.('canvas-cc-cobrador', d.firmaCobrador);
      if (d.firmaCliente) global.ArpaSignature?.restoreDataUrl?.('canvas-cc-cliente', d.firmaCliente);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * La cuenta de cobro quedó terminada (PDF guardado o compartido y en el Historial):
   * se libera el número y se vacía el campo, para que la siguiente no salga repetida.
   */
  function cerrarCcTerminada(d) {
    global.ArpaNumeracion?.clearReserved?.('cc', d && d.numero);
    const el = document.getElementById('cc-numero');
    if (el) el.value = '';
    clearCcDraft();
  }

  function clearCcDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function scheduleCcDraftSave(immediate) {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    const delay = immediate ? 0 : 1500;
    draftSaveTimer = setTimeout(() => {
      draftSaveTimer = null;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(collectCcDraft()));
      } catch (e) { /* quota */ }
    }, delay);
  }

  /** Guarda el borrador ya (sin esperar el temporizador). */
  function saveCcDraftNow() {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(collectCcDraft()));
    } catch (e) { /* quota */ }
  }

  function bindCcDraftListeners() {
    const root = document.getElementById('view-cuenta-cobro');
    if (!root || root.__ccDraftBound) return;
    root.__ccDraftBound = true;
    root.addEventListener('input', () => scheduleCcDraftSave());
    root.addEventListener('change', () => scheduleCcDraftSave());
    ['canvas-cc-cobrador', 'canvas-cc-cliente'].forEach((id) => {
      const canvas = document.getElementById(id);
      canvas?.addEventListener('mouseup', () => scheduleCcDraftSave());
      canvas?.addEventListener('touchend', () => scheduleCcDraftSave());
    });
  }

  function getRawSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  const PAGO_FIELD_IDS = ['cc-pago-banco', 'cc-pago-numero', 'cc-pago-titular', 'cc-pago-titular-doc'];

  function loadPagoFields() {
    global.ArpaBrand?.applyCuentaCobroFromSettings?.(undefined, { fillPago: 'always' });
  }

  function savePagoToSettings() {
    if (!global.ArpaBrand?.saveSettings) return;
    const current = global.ArpaBrand.getSettings();
    global.ArpaBrand.saveSettings({
      ...current,
      bankName: document.getElementById('cc-pago-banco')?.value.trim() || '',
      accountType: document.getElementById('cc-pago-tipo')?.value.trim() || 'Ahorros',
      accountNumber: document.getElementById('cc-pago-numero')?.value.trim() || '',
      accountHolder: document.getElementById('cc-pago-titular')?.value.trim() || '',
      accountHolderDocument: document.getElementById('cc-pago-titular-doc')?.value.trim() || ''
    });
  }

  function loadCiudadFromConfig() {
    global.ArpaBrand?.applyCuentaCobroFromSettings?.(undefined, { fillPago: 'always' });
  }

  function formatoPesos(n) {
    return global.ArpaPricing?.formatoPesos(n) || ('$ ' + (Number(n) || 0).toLocaleString('es-CO'));
  }

  function roundMoney(n) {
    if (typeof global.ArpaPricing?.roundMoney === 'function') return global.ArpaPricing.roundMoney(n);
    return Number(n) || 0;
  }


  // Cantidades con decimales (7,5 m²); antes parseInt truncaba a 7.
  function parseCant(value) {
    if (global.ArpaPricing?.parseCantidad) return global.ArpaPricing.parseCantidad(value);
    const n = Number(String(value == null ? '' : value).trim().replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 1;
  }

  function parseNum(v) {
    const n = Number(String(v).replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function formatCcNumero(n) {
    return global.ArpaNumeracion?.formatCcNumber?.(n) || ('CC-' + String(n).padStart(3, '0'));
  }

  function getUltimoCc() {
    const N = global.ArpaNumeracion;
    if (!N) return 0;
    return N.getMaxCounter(CC_NUM_KEY, document.getElementById('cc-numero')?.value);
  }

  async function nuevoCcNumero() {
    if (!global.ArpaNumeracion?.blockIfNoLicense?.()) return false;
    if (!global.ArpaNumeracion?.blockIfPymeMissingCode?.()) return false;
    const result = await global.ArpaNumeracion.nextNumberAsync('cc', document.getElementById('cc-numero')?.value);
    if (!result || result.blocked || !result.value) return false;
    const { value, sincronizado } = result;
    if (!sincronizado) console.warn('[ARPA] Número de cuenta de cobro generado offline, no sincronizado con la nube todavía.');
    const badge = document.getElementById('sync-status-cc');
    // LAB: en modo demo el aviso lo pinta ArpaLabDemo (no muestra licencia real).
    if (badge && !global.ArpaLabDemo?.paintLocalBadge?.(badge)) {
      badge.style.display = 'inline-block';
      const licActiva = (localStorage.getItem('arpa_suite_license_code') || '(vacio)').trim();
      badge.title = 'Licencia activa: ' + licActiva;
      if (sincronizado) {
        badge.textContent = '☁️ ' + licActiva.slice(-6);
        badge.style.background = 'rgba(76,175,128,0.15)';
        badge.style.color = '#2e7d4f';
      } else {
        badge.textContent = '⚠️ ' + licActiva.slice(-6) + ' (local)';
        badge.style.background = 'rgba(224,82,82,0.15)';
        badge.style.color = '#c0392b';
      }
    }
    const el = document.getElementById('cc-numero');
    if (el) el.value = value;
    global.ArpaNumeracion?.setReserved?.('cc', value);
    // Guardar el número de inmediato en el borrador: al reabrir no se pide otro.
    saveCcDraftNow();
    return true;
  }

  /** Pone número si falta (reusa el reservado si hay). Devuelve true si queda con número. */
  async function ensureCcNumero() {
    const el = document.getElementById('cc-numero');
    if (!el) return false;
    if (el.value.trim()) return true;
    if (!global.ArpaNumeracion?.hasActiveLicenseCode?.()) return false;
    const reservado = global.ArpaNumeracion?.getReserved?.('cc');
    if (reservado) {
      el.value = reservado;
      saveCcDraftNow();
      return true;
    }
    return (await nuevoCcNumero()) === true && !!el.value.trim();
  }

  /**
   * El número se asigna al generar el PDF o compartir, no al entrar a Cuenta
   * de Cobro ni al abrir la app: así no se gastan números en cuentas que no se
   * terminan. Si ya tiene número, se conserva. Sin número no se genera nada.
   */
  async function asegurarNumeroCc() {
    const el = document.getElementById('cc-numero');
    if (el?.value.trim()) return true;
    if (!global.ArpaNumeracion?.blockIfNoLicense?.()) return false;
    return ensureCcNumero();
  }

  function renderCobrador() {
    global.ArpaBrand?.applyCuentaCobroFromSettings?.(undefined, { fillPago: 'never' });
  }

  function renderServicios() {
    const tbody = document.getElementById('cc-servicios-body');
    if (!tbody) return;

    tbody.innerHTML = servicios.map((row, idx) => `
      <tr class="cc-row" data-idx="${idx}">
        <td class="td-desc"><input type="text" class="cc-svc-desc" value="${escAttr(row.desc)}" placeholder="Descripción del servicio"></td>
        <td class="td-cant"><input type="number" class="cc-svc-cant" min="0.01" step="0.01" value="${row.cant}" inputmode="decimal"></td>
        <td class="td-precio"><input type="number" class="cc-svc-unit" min="0" step="1000" value="${row.unit || ''}" inputmode="numeric" placeholder="0"></td>
        <td class="td-total cc-svc-total">${formatoPesos(row.cant * row.unit)}</td>
        <td class="td-action">${servicios.length > 1 ? `<button type="button" class="btn-quitar cc-svc-remove" data-idx="${idx}">✕</button>` : ''}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.cc-svc-desc, .cc-svc-cant, .cc-svc-unit').forEach((input) => {
      input.addEventListener('input', onServicioChange);
    });
    tbody.querySelectorAll('.cc-svc-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        servicios.splice(Number(btn.dataset.idx), 1);
        renderServicios();
        recalcularTotales();
        scheduleCcDraftSave();
      });
    });
    recalcularTotales();
  }

  function escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function onServicioChange(e) {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const idx = Number(tr.dataset.idx);
    const row = servicios[idx];
    if (!row) return;
    row.desc = tr.querySelector('.cc-svc-desc')?.value || '';
    row.cant = parseCant(tr.querySelector('.cc-svc-cant')?.value);
    row.unit = parseNum(tr.querySelector('.cc-svc-unit')?.value);
    const totalCell = tr.querySelector('.cc-svc-total');
    if (totalCell) totalCell.textContent = formatoPesos(row.cant * row.unit);
    recalcularTotales();
    scheduleCcDraftSave();
  }

  function getSubtotal() {
    return servicios.reduce((s, r) => s + parseCant(r.cant) * parseNum(r.unit), 0);
  }

  function getTaxRate() {
    const rate = Number(global.ArpaPricing?.getTaxRate?.());
    return Number.isFinite(rate) ? rate : 0;
  }

  function getTaxLabelInfo() {
    return global.ArpaPricing?.getTaxLabelText?.() || { labelWord: 'IVA', pct: 0, full: 'IVA (0%)' };
  }

  function applyTaxLabels() {
    const tax = getTaxLabelInfo();
    const lang = global.ArpaI18n?.getLang?.() || 'es';
    const toggleText = lang === 'en'
      ? ('Include ' + tax.labelWord + ' ' + tax.pct + '%')
      : ('Incluir ' + tax.labelWord + ' ' + tax.pct + '%');
    const ivaCheck = document.getElementById('cc-iva-check');
    const toggleSpan = ivaCheck?.parentElement?.querySelector('span');
    if (toggleSpan) toggleSpan.textContent = toggleText;
    const ivaLabel = document.querySelector('#cc-iva-row .total-label');
    if (ivaLabel) ivaLabel.textContent = tax.full;
  }

  function recalcularTotales() {
    applyTaxLabels();
    const subtotal = getSubtotal();
    const conIva = document.getElementById('cc-iva-check')?.checked;
    const conRet = document.getElementById('cc-ret-check')?.checked;
    const retPct = parseNum(document.getElementById('cc-ret-pct')?.value) || 0;
    const iva = conIva ? roundMoney(subtotal * getTaxRate()) : 0;
    const retencion = conRet ? roundMoney(subtotal * (retPct / 100)) : 0;
    const total = roundMoney(subtotal + iva - retencion);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('cc-subtotal-val', formatoPesos(subtotal));
    set('cc-iva-val', formatoPesos(iva));
    set('cc-ret-val', formatoPesos(retencion));
    set('cc-total-val', formatoPesos(total));

    const ivaRow = document.getElementById('cc-iva-row');
    const retRow = document.getElementById('cc-ret-row');
    const retField = document.getElementById('cc-ret-pct-wrap');
    if (ivaRow) ivaRow.style.display = conIva ? 'flex' : 'none';
    if (retRow) retRow.style.display = conRet ? 'flex' : 'none';
    if (retField) retField.style.display = conRet ? 'flex' : 'none';
  }

  function getPaymentData() {
    return {
      bankName: document.getElementById('cc-pago-banco')?.value.trim() || '',
      accountType: document.getElementById('cc-pago-tipo')?.value.trim() || '',
      accountNumber: document.getElementById('cc-pago-numero')?.value.trim() || '',
      accountHolder: document.getElementById('cc-pago-titular')?.value.trim() || '',
      accountHolderDocument: document.getElementById('cc-pago-titular-doc')?.value.trim() || ''
    };
  }

  function getFormSnapshot() {
    const subtotal = getSubtotal();
    const conIva = document.getElementById('cc-iva-check')?.checked;
    const conRet = document.getElementById('cc-ret-check')?.checked;
    const retPct = parseNum(document.getElementById('cc-ret-pct')?.value) || 0;
    const iva = conIva ? roundMoney(subtotal * getTaxRate()) : 0;
    const retencion = conRet ? roundMoney(subtotal * (retPct / 100)) : 0;
    const total = roundMoney(subtotal + iva - retencion);
    const r = global.ArpaBrand?.getSettings?.() || getRawSettings();
    const clienteNombre = document.getElementById('cc-cliente-nombre')?.value.trim() || '';

    return {
      numero: document.getElementById('cc-numero')?.value.trim() || '',
      ciudad: document.getElementById('cc-ciudad')?.value.trim() || '',
      fechaEmision: document.getElementById('cc-fecha-emision')?.value || '',
      fechaVencimiento: document.getElementById('cc-fecha-vencimiento')?.value || '',
      cobrador: {
        nombre: (r.technicianName || '').trim(),
        doc: (r.technicianDocument || '').trim(),
        empresa: (r.companyName || '').trim(),
        nit: (r.nit || '').trim(),
        tel: global.ArpaPricing?.formatCompanyPhone?.(r.phone) || (r.phone || '').trim(),
        dir: (r.address || '').trim(),
        web: (r.website || '').trim()
      },
      cliente: {
        nombre: clienteNombre,
        doc: document.getElementById('cc-cliente-doc')?.value.trim() || '',
        dir: document.getElementById('cc-cliente-dir')?.value.trim() || '',
        tel: document.getElementById('cc-cliente-tel')?.value.trim() || ''
      },
      servicios: servicios.map((s) => ({
        desc: s.desc,
        cant: parseCant(s.cant),
        unit: parseNum(s.unit),
        total: (parseCant(s.cant)) * parseNum(s.unit)
      })),
      subtotal,
      iva,
      retencion,
      retPct,
      conIva,
      conRet,
      total,
      pago: getPaymentData(),
      observaciones: document.getElementById('cc-obs')?.value.trim() || '',
      logo: global.ArpaBrand?.getLogo?.(global.ArpaBrand?.getSettings?.())
    };
  }

  function limpiarFormulario() {
    ['cc-cliente-nombre', 'cc-cliente-doc', 'cc-cliente-dir', 'cc-cliente-tel', 'cc-obs'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    loadPagoFields();
    loadCiudadFromConfig();
    document.getElementById('cc-iva-check').checked = false;
    document.getElementById('cc-ret-check').checked = false;
    const retPct = document.getElementById('cc-ret-pct');
    if (retPct) retPct.value = '11';
    servicios = [{ desc: '', cant: 1, unit: 0 }];
    initFechas();
    renderServicios();
    syncFirmaCliente();
    global.ArpaSignature?.clear?.('canvas-cc-cobrador');
    global.ArpaSignature?.clear?.('canvas-cc-cliente');
    clearCcDraft();
  }

  function initFechas() {
    const hoy = new Date();
    const em = document.getElementById('cc-fecha-emision');
    const ven = document.getElementById('cc-fecha-vencimiento');
    const toLocal = global.fechaLocalISO;
    if (em) em.value = toLocal(hoy);
    if (ven) {
      const v = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 15);
      ven.value = toLocal(v);
    }
  }

  function syncFirmaCliente() {
    const nom = document.getElementById('cc-cliente-nombre')?.value.trim() || '—';
    const el = document.getElementById('cc-firma-cliente-nombre');
    if (el) el.textContent = nom;
  }

  function sanitizeFilename(name) {
    return (name || 'Cliente').replace(/[^\w\s-áéíóúÁÉÍÓÚñÑ]/g, '').replace(/\s+/g, '_').substring(0, 40) || 'Cliente';
  }

  function buildCcShareMessage(d) {
    const enMsg = global.ArpaDocLang?.shareMessage?.('cc', {
      nombre: d.cliente.nombre, numero: d.numero, company: d.cobrador.empresa,
      total: formatoPesos(d.total), tel: d.cobrador.tel || ''
    });
    if (enMsg) return enMsg;
    const empresa = d.cobrador.empresa || 'nuestra empresa';
    const telEmp = d.cobrador.tel || '';
    return `Hola ${d.cliente.nombre || 'cliente'}, le compartimos la ${d.numero} de ${empresa} por un valor de ${formatoPesos(d.total)}. Quedamos atentos para cualquier consulta.\n${empresa} 📞 ${telEmp}`;
  }

  async function enviarWhatsApp() {
    const jsPDF = getJsPDF();
    if (!jsPDF) {
      scheduleCcDraftSave(true);
      alert(window.ArpaI18n.t('alert.pdf.jspdf_no_cargo'));
      return;
    }
    if (!(await asegurarNumeroCc())) return;

    const d = getFormSnapshot();
    const msg = buildCcShareMessage(d);

    try {
      const { doc, filename } = await renderCcToPdf(d, jsPDF);
      const file = new File([doc.output('blob')], filename, { type: 'application/pdf' });
      if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: msg
        });
        global.ArpaHistorial?.captureFromCuentaCobro?.(d);
        cerrarCcTerminada(d);
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.warn('[arpa-cuenta-cobro] share', err);
    }

    alert(window.ArpaI18n.t('alert.pdf.adjuntar_manual'));
    global.ArpaWhatsApp?.openWhatsAppWithMessage?.(
      d.cliente.tel,
      msg + dt('msg.attach_note', ' (Adjunte el PDF desde su dispositivo.)')
    );
    global.ArpaHistorial?.captureFromCuentaCobro?.(d);
    global.ArpaNumeracion?.clearReserved?.('cc', d && d.numero);
  }

  function loadImageDataUrl(src) {
    return new Promise((resolve) => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || img.width;
          c.height = img.naturalHeight || img.height;
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Fecha legible en el PDF: "24 de noviembre de 2026" (con English sigue MM/DD/YYYY de ArpaDocLang).
  const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function fdLarga(value) {
    if (global.ArpaDocLang?.isEnglish?.()) return fd(value);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
    if (!m) return fd(value);
    const mes = MESES_ES[Number(m[2]) - 1];
    return mes ? `${Number(m[3])} de ${mes} de ${m[1]}` : fd(value);
  }

  async function renderCcToPdf(d, jsPDF) {
    // En México el documento fiscal es el RFC; en los demás países, NIT / C.C.
    const taxLabel = global.ArpaPricing?.getTaxIdLabel?.() || 'NIT';
    const idLabel = taxLabel === 'NIT' ? 'C.C. / NIT' : taxLabel;
    const clientIdLabel = taxLabel === 'NIT' ? 'NIT / C.C.' : taxLabel;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 16;
    const cw = pw - m * 2;
    // Cara nueva (24-nov-2026): azul de noche y dorado, igual a cotización e informe.
    const C_NAVY = [22, 40, 75];
    const C_GOLD = [201, 168, 76];
    const C_GOLD_TXT = [226, 196, 107];
    const C_GOLD_DARK = [122, 90, 18];
    const C_INK = [28, 36, 52];
    const C_SOFT = [74, 84, 104];
    const C_LABEL = [138, 147, 166];
    const C_LINE = [227, 230, 238];
    const C_HEAD_SUB = [174, 184, 204];
    let y = 0;

    function label(text, x, ly, color) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...(color || C_LABEL));
      doc.text(String(text), x, ly);
    }

    function newPage() {
      doc.addPage();
      return m;
    }

    // ── Encabezado ──
    const headH = 34;
    doc.setFillColor(...C_NAVY);
    doc.rect(0, 0, pw, headH, 'F');
    doc.setFillColor(...C_GOLD);
    doc.rect(0, headH, pw, 1.4, 'F');

    const logoData = await loadImageDataUrl(d.logo);
    let hx = m;
    if (logoData) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(m, 7, 21, 21, 3, 3, 'F');
        doc.addImage(logoData, 'PNG', m + 1.5, 8.5, 18, 18);
        hx = m + 26;
      } catch (e) { /* sin logo */ }
    }

    // Quien cobra: la empresa si existe; si no, la persona (no las dos).
    const conEmpresa = Boolean(d.cobrador.empresa);
    const quien = conEmpresa ? d.cobrador.empresa : (d.cobrador.nombre || 'Empresa');
    const quienId = conEmpresa ? d.cobrador.nit : d.cobrador.doc;
    const quienIdLabel = conEmpresa ? dt('cc.pdf.tax_id', taxLabel) : dt('cc.pdf.id_tax', idLabel);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(doc.splitTextToSize(String(quien).toUpperCase(), 100)[0], hx, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C_HEAD_SUB);
    const headLine1 = [quienId ? `${quienIdLabel}: ${quienId}` : '', d.cobrador.tel ? `${dt('cc.pdf.tel', 'Tel')}: ${d.cobrador.tel}` : ''].filter(Boolean).join('  ·  ');
    const headLine2 = [d.cobrador.dir, d.cobrador.web].filter(Boolean).join('  ·  ');
    if (headLine1) doc.text(headLine1, hx, 21);
    if (headLine2) doc.text(doc.splitTextToSize(headLine2, 100)[0], hx, 25.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C_GOLD_TXT);
    doc.text(dt('cc.pdf.title', 'CUENTA DE COBRO'), pw - m, 14, { align: 'right' });
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(d.numero || 'CC-000', pw - m, 22, { align: 'right' });

    y = headH + 12;

    // ── Cliente y cobrador ──
    const leftW = cw * 0.6;
    const rightX = m + leftW + 8;
    const rightW = cw - leftW - 8;
    label(dt('cc.pdf.bill_to', 'CLIENTE'), m, y);
    label(dt('cc.pdf.from', 'COBRADOR'), rightX, y);
    let yL = y + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C_NAVY);
    const cliNom = doc.splitTextToSize(d.cliente.nombre || '—', leftW);
    doc.text(cliNom, m, yL);
    yL += cliNom.length * 5 + 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C_SOFT);
    [
      d.cliente.doc ? `${dt('cc.pdf.id_tax', clientIdLabel)}: ${d.cliente.doc}` : '',
      d.cliente.dir ? `${dt('cc.pdf.address', 'Dir')}: ${d.cliente.dir}` : '',
      d.cliente.tel ? `${dt('cc.pdf.tel', 'Tel')}: ${d.cliente.tel}` : ''
    ].filter(Boolean).forEach((line) => {
      const w = doc.splitTextToSize(line, leftW);
      doc.text(w, m, yL);
      yL += w.length * 4;
    });

    let yR = y + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...C_NAVY);
    const quienW = doc.splitTextToSize(quien, rightW);
    doc.text(quienW, rightX, yR);
    yR += quienW.length * 4.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C_SOFT);
    if (quienId) { doc.text(`${quienIdLabel}: ${quienId}`, rightX, yR); yR += 4; }
    y = Math.max(yL, yR) + 4;

    // ── Fechas ──
    doc.setDrawColor(...C_LINE);
    doc.setLineWidth(0.3);
    doc.line(m, y, pw - m, y);
    y += 6;
    doc.setFontSize(8.5);
    let fx = m;
    if (d.ciudad) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C_SOFT);
      doc.text(d.ciudad, fx, y);
      fx += (Number(doc.getTextWidth?.(d.ciudad)) || 22) + 8;
    }
    if (d.fechaEmision) {
      const t = `${dt('cc.pdf.issued', 'Emisión')}: ${fdLarga(d.fechaEmision)}`;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C_SOFT);
      doc.text(t, fx, y);
      fx += (Number(doc.getTextWidth?.(t)) || 60) + 8;
    }
    if (d.fechaVencimiento) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(154, 59, 30);
      doc.text(`${dt('cc.pdf.due', 'Vence')}: ${fdLarga(d.fechaVencimiento)}`, fx, y);
    }
    y += 10;

    // ── Tabla ──
    const xQty = m + cw * 0.62;
    const xUnit = m + cw * 0.81;
    const xTot = pw - m;
    function tableHead() {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...C_LABEL);
      doc.text(dt('cc.pdf.col_desc', 'Descripción'), m, y);
      doc.text(dt('cc.pdf.col_qty', 'Cant.'), xQty, y, { align: 'center' });
      doc.text(dt('cc.pdf.col_unit', 'V. Unit.'), xUnit, y, { align: 'right' });
      doc.text(dt('cc.pdf.col_total', 'Total'), xTot, y, { align: 'right' });
      y += 2.5;
      doc.setDrawColor(...C_NAVY);
      doc.setLineWidth(0.6);
      doc.line(m, y, pw - m, y);
      y += 6;
    }
    tableHead();

    d.servicios.forEach((row) => {
      doc.setFontSize(9);
      const descLines = doc.splitTextToSize(row.desc || '—', cw * 0.55);
      const rowHeight = Math.max(9, descLines.length * 4.2 + 5);
      if (y + rowHeight > ph - 60) {
        y = newPage();
        tableHead();
      }
      const neg = Number(row.total) < 0;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(neg ? C_SOFT : C_INK));
      doc.text(descLines, m, y);
      doc.setFont('helvetica', 'normal');
      doc.text(global.ArpaPricing?.formatoCantidad ? global.ArpaPricing.formatoCantidad(row.cant) : String(row.cant), xQty, y, { align: 'center' });
      doc.text(formatoPesos(row.unit), xUnit, y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatoPesos(row.total), xTot, y, { align: 'right' });
      y += rowHeight - 3;
      doc.setDrawColor(...C_LINE);
      doc.setLineWidth(0.3);
      doc.line(m, y, pw - m, y);
      y += 6;
    });
    y += 1;

    // ── Totales ──
    const totW = 82;
    const totX = pw - m - totW;
    const totales = [
      [dt('cc.pdf.subtotal', 'Subtotal'), formatoPesos(d.subtotal)],
      ...(d.conIva ? [[(global.ArpaDocLang?.taxLabel?.() || global.ArpaPricing?.getTaxLabelText?.()?.full || 'IVA (0%)'), formatoPesos(d.iva)]] : []),
      ...(d.conRet ? [[`${dt('cc.pdf.withholding', 'Retención')} (${d.retPct}%)`, '- ' + formatoPesos(d.retencion)]] : [])
    ];
    if (y + totales.length * 5 + 22 > ph - m) y = newPage();
    doc.setFontSize(9);
    totales.forEach(([lab, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C_SOFT);
      doc.text(lab, totX, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C_NAVY);
      doc.text(val, pw - m, y, { align: 'right' });
      y += 5;
    });
    y += 1;
    doc.setFillColor(...C_NAVY);
    doc.roundedRect(totX, y, totW, 14, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C_HEAD_SUB);
    doc.text(dt('cc.pdf.total', 'TOTAL A COBRAR'), totX + 5, y + 8.6);
    doc.setFontSize(14);
    doc.setTextColor(...C_GOLD_TXT);
    doc.text(formatoPesos(d.total), pw - m - 5, y + 9, { align: 'right' });
    y += 22;

    // ── Datos para consignar ──
    const consigLines = [
      d.pago.bankName && `${dt('cc.pdf.bank', 'Banco')}: ${d.pago.bankName}`,
      d.pago.accountType && `${dt('cc.pdf.account_type', 'Tipo')}: ${dt('cc.pdf.account.' + d.pago.accountType, d.pago.accountType)}`,
      d.pago.accountHolder && `${dt('cc.pdf.holder', 'Titular')}: ${d.pago.accountHolder}`,
      d.pago.accountHolderDocument && `${dt('cc.pdf.holder_doc', taxLabel === 'NIT' ? 'NIT/C.C.' : taxLabel)}: ${d.pago.accountHolderDocument}`
    ].filter(Boolean);
    const cuentaLine = d.pago.accountNumber ? `${dt('cc.pdf.account_no', 'Cuenta N°')}: ${d.pago.accountNumber}` : '';
    if (consigLines.length || cuentaLine) {
      const consigBoxH = 11 + (cuentaLine ? 7 : 0) + consigLines.length * 4.4 + 3;
      if (y + consigBoxH > ph - m) y = newPage();
      doc.setFillColor(251, 248, 238);
      doc.setDrawColor(...C_GOLD);
      doc.setLineWidth(0.5);
      doc.roundedRect(m, y, cw, consigBoxH, 2.5, 2.5, 'FD');
      label(dt('cc.pdf.payment', 'DATOS PARA CONSIGNACIÓN'), m + 5, y + 7, C_GOLD_DARK);
      let py = y + 13;
      if (cuentaLine) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...C_NAVY);
        doc.text(cuentaLine, m + 5, py + 1);
        py += 7;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C_SOFT);
      consigLines.forEach((line) => {
        doc.text(line, m + 5, py);
        py += 4.4;
      });
      y += consigBoxH + 7;
    }

    if (global.ArpaLinkPago?.get?.()) {
      y = await global.ArpaLinkPago.addToPdf(doc, { x: m, y, width: cw, pageHeight: ph, margin: m });
    }

    if (d.observaciones) {
      doc.setFontSize(8.5);
      const obsLines = doc.splitTextToSize(d.observaciones, cw);
      const obsHeight = obsLines.length * 4 + 10;
      if (y + obsHeight > ph - m) y = newPage();
      label(dt('cc.pdf.notes', 'Observaciones'), m, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C_SOFT);
      doc.text(obsLines, m, y);
      y += obsLines.length * 4 + 8;
    }

    // ── Firmas ──
    if (y > ph - 48) y = newPage();
    y = Math.max(y, ph - 62);
    const sigW = (cw - 16) / 2;
    const sigH = 14;
    const sigCobrador = global.ArpaSignature?.getDataUrl?.('canvas-cc-cobrador');
    const sigCliente = global.ArpaSignature?.getDataUrl?.('canvas-cc-cliente');
    if (sigCobrador) {
      try { doc.addImage(sigCobrador, 'PNG', m, y, sigW * 0.8, sigH); } catch (e) { /* skip */ }
    }
    if (sigCliente) {
      try { doc.addImage(sigCliente, 'PNG', m + sigW + 16, y, sigW * 0.8, sigH); } catch (e) { /* skip */ }
    }
    y += sigH + 2;
    doc.setDrawColor(...C_NAVY);
    doc.setLineWidth(0.3);
    doc.line(m, y, m + sigW, y);
    doc.line(m + sigW + 16, y, pw - m, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C_NAVY);
    doc.text(d.cobrador.nombre || quien || '—', m, y + 5);
    doc.text(d.cliente.nombre || '—', m + sigW + 16, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C_LABEL);
    doc.text(dt('cc.pdf.sig_provider', 'Firma cobrador'), m, y + 9.5);
    doc.text(dt('cc.pdf.sig_customer', 'Firma cliente'), m + sigW + 16, y + 9.5);

    // ── Pie en todas las hojas ──
    // Con English el pie sale en inglés; con Español, el mismo de siempre.
    const arpaFooter = (global.ArpaDocLang?.isEnglish?.() && dt('cc.pdf.footer', ''))
      || global.ArpaBrand?.GLOBAL_FOOTER_TEXT
      || '© 2026 ARPA Technology Global · arpatechnologyglobal.com · Todos los derechos reservados.';
    const totalPages = Number(doc.getNumberOfPages?.()) || 1;
    const pageWord = global.ArpaDocLang?.isEnglish?.() ? 'Page' : 'Página';
    const ofWord = global.ArpaDocLang?.isEnglish?.() ? 'of' : 'de';
    for (let p = 1; p <= totalPages; p += 1) {
      if (typeof doc.setPage === 'function') doc.setPage(p);
      doc.setDrawColor(...C_LINE);
      doc.setLineWidth(0.3);
      doc.line(m, ph - 13, pw - m, ph - 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C_LABEL);
      doc.text(`${d.numero || ''}  ·  ${pageWord} ${p} ${ofWord} ${totalPages}`, m, ph - 8);
      doc.text(arpaFooter, pw - m, ph - 8, { align: 'right' });
    }

    const filename = `${dt('file.cc', 'CuentaCobro')}_${d.numero || 'CC'}_${sanitizeFilename(d.cliente.nombre)}.pdf`;
    return { doc, filename };
  }

  async function generarPDF() {
    const jsPDF = getJsPDF();
    if (!jsPDF) {
      scheduleCcDraftSave(true);
      alert(window.ArpaI18n.t('alert.pdf.jspdf_no_cargo'));
      return;
    }
    if (!(await asegurarNumeroCc())) return;

    const d = getFormSnapshot();
    try {
      const { doc, filename } = await renderCcToPdf(d, jsPDF);
      doc.save(filename);
      global.ArpaHistorial?.captureFromCuentaCobro?.(d);
      cerrarCcTerminada(d);
    } catch (e) {
      scheduleCcDraftSave(true);
      alert(window.ArpaI18n.t('alert.cuenta_cobro.pdf_no_generado'));
    }
  }

  function refreshView() {
    global.ArpaBrand?.applyCuentaCobroFromSettings?.(undefined, { fillPago: 'if-empty' });
    syncFirmaCliente();
    recalcularTotales();
  }

  function initCuentaCobro() {
    global.ArpaSignature?.initCanvas?.('canvas-cc-cobrador');
    global.ArpaSignature?.initCanvas?.('canvas-cc-cliente');

    const hadDraft = applyCcDraft();
    if (!hadDraft) {
      initFechas();
      // No se pide número al abrir: se asigna al generar PDF o compartir
      // (asegurarNumeroCc) o con "+ NUEVO N°"; el borrador trae el suyo si lo tiene.
    }
    global.ArpaBrand?.applyCuentaCobroFromSettings?.(undefined, {
      fillPago: hadDraft ? 'if-empty' : 'always'
    });

    renderServicios();
    syncFirmaCliente();
    bindCcDraftListeners();

    document.getElementById('cc-pago-tipo')?.addEventListener('change', savePagoToSettings);
    PAGO_FIELD_IDS.forEach((id) => {
      document.getElementById(id)?.addEventListener('change', savePagoToSettings);
      document.getElementById(id)?.addEventListener('blur', savePagoToSettings);
    });
    document.getElementById('cc-iva-check')?.addEventListener('change', recalcularTotales);
    document.getElementById('cc-ret-check')?.addEventListener('change', recalcularTotales);
    document.getElementById('cc-ret-pct')?.addEventListener('input', recalcularTotales);
    document.getElementById('cc-cliente-nombre')?.addEventListener('input', syncFirmaCliente);
    document.getElementById('btn-cc-add-servicio')?.addEventListener('click', () => {
      servicios.push({ desc: '', cant: 1, unit: 0 });
      renderServicios();
      scheduleCcDraftSave();
    });
    document.getElementById('btn-cc-limpiar')?.addEventListener('click', function() {
      if (confirm('¿Seguro que quieres borrar toda la Cuenta de Cobro?')) {
        limpiarFormulario();
      }
    });
    document.getElementById('btn-cc-whatsapp')?.addEventListener('click', enviarWhatsApp);
    document.getElementById('btn-cc-pdf')?.addEventListener('click', generarPDF);

    // Auto-rellenar cobrador desde ajustes
    (function() {
      var settings = getRawSettings();
      var nombreEl = document.getElementById('cc-firma-cobrador-nombre');
      var telEl = document.getElementById('cc-cobrador-tel');
      if (nombreEl && !nombreEl.textContent.trim()) {
        nombreEl.textContent = settings.companyName || '';
      }
      if (telEl && typeof telEl.value === 'string' && !telEl.value.trim()) {
        telEl.value = settings.phone || '';
      }
    })();
  }

  global.ArpaCuentaCobro = {
    initCuentaCobro,
    refreshView,
    recalcularTotales,
    nuevoCcNumero,
    ensureCcNumero,
    asegurarNumeroCc,
    limpiarFormulario,
    enviarWhatsApp,
    generarPDF,
    getFormSnapshot,
    collectCcDraft,
    applyCcDraft,
    scheduleCcDraftSave
  };
  global.nuevoCcNumero = nuevoCcNumero;
})(window);
