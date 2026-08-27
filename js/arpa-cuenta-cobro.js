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
        cant: parseInt(s.cant, 10) || 1,
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
          cant: parseInt(s.cant, 10) || 1,
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
    if (!global.ArpaNumeracion?.blockIfPymeMissingCode?.()) return;
    const { value, sincronizado } = await global.ArpaNumeracion.nextNumberAsync('cc', document.getElementById('cc-numero')?.value);
    if (!sincronizado) console.warn('[ARPA] Número de cuenta de cobro generado offline, no sincronizado con la nube todavía.');
    const badge = document.getElementById('sync-status-cc');
    if (badge) {
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
  }

  async function ensureCcNumero() {
    const el = document.getElementById('cc-numero');
    if (el && !el.value.trim()) await nuevoCcNumero();
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
        <td class="td-cant"><input type="number" class="cc-svc-cant" min="1" value="${row.cant}" inputmode="numeric"></td>
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
    row.cant = parseInt(tr.querySelector('.cc-svc-cant')?.value, 10) || 1;
    row.unit = parseNum(tr.querySelector('.cc-svc-unit')?.value);
    const totalCell = tr.querySelector('.cc-svc-total');
    if (totalCell) totalCell.textContent = formatoPesos(row.cant * row.unit);
    recalcularTotales();
    scheduleCcDraftSave();
  }

  function getSubtotal() {
    return servicios.reduce((s, r) => s + (parseInt(r.cant, 10) || 1) * parseNum(r.unit), 0);
  }

  function recalcularTotales() {
    const subtotal = getSubtotal();
    const conIva = document.getElementById('cc-iva-check')?.checked;
    const conRet = document.getElementById('cc-ret-check')?.checked;
    const retPct = parseNum(document.getElementById('cc-ret-pct')?.value) || 0;
    const iva = conIva ? subtotal * 0.19 : 0;
    const retencion = conRet ? subtotal * (retPct / 100) : 0;
    const total = subtotal + iva - retencion;

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
    const iva = conIva ? subtotal * 0.19 : 0;
    const retencion = conRet ? subtotal * (retPct / 100) : 0;
    const total = subtotal + iva - retencion;
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
        tel: (r.phone || '').trim(),
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
        cant: parseInt(s.cant, 10) || 1,
        unit: parseNum(s.unit),
        total: (parseInt(s.cant, 10) || 1) * parseNum(s.unit)
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
    if (em) em.value = hoy.toISOString().split('T')[0];
    if (ven) {
      const v = new Date(hoy);
      v.setDate(v.getDate() + 15);
      ven.value = v.toISOString().split('T')[0];
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
        clearCcDraft();
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.warn('[arpa-cuenta-cobro] share', err);
    }

    alert(window.ArpaI18n.t('alert.pdf.adjuntar_manual'));
    global.ArpaWhatsApp?.openWhatsAppWithMessage?.(
      d.cliente.tel,
      msg + ' (Adjunte el PDF desde su dispositivo.)'
    );
    global.ArpaHistorial?.captureFromCuentaCobro?.(d);
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

  async function renderCcToPdf(d, jsPDF) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 14;
    let y = 0;

    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pw, 38, 'F');

    const logoData = await loadImageDataUrl(d.logo);
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', m, 6, 22, 22);
      } catch (e) { /* skip logo */ }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const company = d.cobrador.empresa || 'Empresa';
    doc.text(company, m + (logoData ? 26 : 0), 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let hy = 20;
    if (d.cobrador.nit) { doc.text(`NIT: ${d.cobrador.nit}`, m + (logoData ? 26 : 0), hy); hy += 5; }
    if (d.cobrador.tel) { doc.text(`Tel: ${d.cobrador.tel}`, m + (logoData ? 26 : 0), hy); }

    doc.setFillColor(...GOLD);
    doc.rect(0, 38, pw, 1.2, 'F');
    y = 46;

    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CUENTA DE COBRO', pw / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(14);
    doc.setTextColor(...GOLD);
    doc.text(d.numero || 'CC-000', pw / 2, y, { align: 'center' });
    y += 10;

    const colW = (pw - m * 2 - 6) / 2;
    const leftX = m;
    const rightX = m + colW + 6;

    function blockTitle(x, by, title) {
      doc.setFillColor(232, 237, 245);
      doc.rect(x, by - 4, colW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...NAVY);
      doc.text(title, x + 2, by);
    }

    function blockLines(x, by, lines) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      lines.forEach(([label, val]) => {
        if (!val) return;
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, x + 2, by);
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(String(val), colW - 28);
        doc.text(wrapped, x + 24, by);
        by += wrapped.length * 4 + 1;
      });
      return by;
    }

    blockTitle(leftX, y, 'COBRADOR');
    blockTitle(rightX, y, 'CLIENTE');
    let yL = y + 6;
    let yR = y + 6;
    yL = blockLines(leftX, yL, [
      ['Nombre', d.cobrador.nombre],
      ['C.C. / NIT', d.cobrador.doc],
      ['Empresa', d.cobrador.empresa],
      ['NIT', d.cobrador.nit],
      ['Tel', d.cobrador.tel],
      ['Dir', d.cobrador.dir],
      ['Web', d.cobrador.web]
    ]);
    yR = blockLines(rightX, yR, [
      ['Nombre', d.cliente.nombre],
      ['NIT / C.C.', d.cliente.doc],
      ['Dir', d.cliente.dir],
      ['Tel', d.cliente.tel]
    ]);
    y = Math.max(yL, yR) + 6;

    if (d.ciudad || d.fechaEmision) {
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      const meta = [d.ciudad, d.fechaEmision ? `Emisión: ${d.fechaEmision}` : '', d.fechaVencimiento ? `Vence: ${d.fechaVencimiento}` : ''].filter(Boolean).join('  ·  ');
      doc.text(meta, m, y);
      y += 6;
    }

    const cols = [m, m + 78, m + 92, m + 118, m + 148];
    doc.setFillColor(...NAVY);
    doc.rect(m, y, pw - m * 2, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    ['Descripción', 'Cant.', 'V. Unit.', 'Total'].forEach((h, i) => {
      const x = [cols[0] + 2, cols[1] + 2, cols[2] + 2, cols[3] + 2][i];
      doc.text(h, x, y + 4.5);
    });
    y += 7;

    d.servicios.forEach((row, i) => {
      const descLines = doc.splitTextToSize(row.desc || '—', 72);
      const rowHeight = Math.max(7, descLines.length * 4 + 2);
      if (y + rowHeight > ph - 70) {
        doc.addPage();
        y = m;
      }
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(m, y, pw - m * 2, rowHeight, 'F');
      }
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(descLines, cols[0] + 2, y + 4.5);
      doc.text(String(row.cant), cols[1] + 2, y + 4.5);
      doc.text(formatoPesos(row.unit), cols[2] + 2, y + 4.5);
      doc.text(formatoPesos(row.total), cols[3] + 2, y + 4.5);
      y += rowHeight;
    });
    y += 4;

    const totX = pw - m - 62;
    doc.setFontSize(9);
    const totales = [
      ['Subtotal', formatoPesos(d.subtotal)],
      ...(d.conIva ? [['IVA (19%)', formatoPesos(d.iva)]] : []),
      ...(d.conRet ? [[`Retención (${d.retPct}%)`, '- ' + formatoPesos(d.retencion)]] : [])
    ];
    totales.forEach(([label, val]) => {
      doc.setTextColor(...MUTED);
      doc.setFont('helvetica', 'normal');
      doc.text(label, totX, y);
      doc.setTextColor(26, 58, 110);
      doc.setFont('helvetica', 'bold');
      doc.text(val, pw - m, y, { align: 'right' });
      y += 5;
    });
    y += 2;
    doc.setDrawColor(...NAVY);
    doc.line(totX, y, pw - m, y);
    y += 5;
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text('TOTAL A COBRAR', totX, y);
    doc.text(formatoPesos(d.total), pw - m, y, { align: 'right' });
    y += 10;

    const consigLines = [
      d.pago.bankName && `Banco: ${d.pago.bankName}`,
      d.pago.accountType && `Tipo: ${d.pago.accountType}`,
      d.pago.accountNumber && `Cuenta N°: ${d.pago.accountNumber}`,
      d.pago.accountHolder && `Titular: ${d.pago.accountHolder}`,
      d.pago.accountHolderDocument && `NIT/C.C.: ${d.pago.accountHolderDocument}`
    ].filter(Boolean);
    const consigBoxH = 10 + consigLines.length * 4.5 + 4;
    if (y > ph - (consigBoxH + 15)) { doc.addPage(); y = m; }
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(22, 163, 74);
    doc.roundedRect(m, y, pw - m * 2, consigBoxH, 2, 2, 'FD');
    doc.setTextColor(21, 128, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DATOS PARA CONSIGNACIÓN', m + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    let py = y + 12;
    consigLines.forEach((line) => {
      doc.text(line, m + 4, py);
      py += 4.5;
    });
    y += consigBoxH + 6;

    if (d.observaciones) {
      const obsLines = doc.splitTextToSize(d.observaciones, pw - m * 2);
      const obsHeight = obsLines.length * 4 + 13;
      if (y + obsHeight > ph - m) { doc.addPage(); y = m; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text('Observaciones', m, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(obsLines, m, y);
      y += obsLines.length * 4 + 8;
    }

    if (y > ph - 35) { doc.addPage(); y = m; }
    const sigW = (pw - m * 2 - 10) / 2;
    const sigH = 14;
    const sigCobrador = global.ArpaSignature?.getDataUrl?.('canvas-cc-cobrador');
    const sigCliente = global.ArpaSignature?.getDataUrl?.('canvas-cc-cliente');
    if (sigCobrador) {
      try { doc.addImage(sigCobrador, 'PNG', m + 2, y, sigW * 0.85, sigH); } catch (e) { /* skip */ }
    }
    if (sigCliente) {
      try { doc.addImage(sigCliente, 'PNG', m + sigW + 12, y, sigW * 0.85, sigH); } catch (e) { /* skip */ }
    }
    y += sigH + 2;
    doc.setDrawColor(180, 180, 180);
    doc.line(m, y + 12, m + sigW, y + 12);
    doc.line(m + sigW + 10, y + 12, pw - m, y + 12);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Firma cobrador', m + sigW / 2, y + 17, { align: 'center' });
    doc.text('Firma cliente', m + sigW + 10 + sigW / 2, y + 17, { align: 'center' });
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(d.cobrador.nombre || '—', m + sigW / 2, y + 22, { align: 'center' });
    doc.text(d.cliente.nombre || '—', m + sigW + 10 + sigW / 2, y + 22, { align: 'center' });

    doc.setFillColor(...NAVY);
    doc.rect(0, ph - 14, pw, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const arpaFooter = global.ArpaBrand?.GLOBAL_FOOTER_TEXT
      || '© 2026 ARPA Technology Global · arpatechnologyglobal.com · Todos los derechos reservados.';
    doc.text(arpaFooter, pw / 2, ph - 5.5, { align: 'center' });

    const filename = `CuentaCobro_${d.numero || 'CC'}_${sanitizeFilename(d.cliente.nombre)}.pdf`;
    return { doc, filename };
  }

  async function generarPDF() {
    const jsPDF = getJsPDF();
    if (!jsPDF) {
      scheduleCcDraftSave(true);
      alert(window.ArpaI18n.t('alert.pdf.jspdf_no_cargo'));
      return;
    }

    const d = getFormSnapshot();
    try {
      const { doc, filename } = await renderCcToPdf(d, jsPDF);
      doc.save(filename);
      global.ArpaHistorial?.captureFromCuentaCobro?.(d);
      clearCcDraft();
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
      ensureCcNumero();
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
      if (telEl && !telEl.value.trim()) {
        telEl.value = settings.phone || '';
      }
    })();
  }

  global.ArpaCuentaCobro = {
    initCuentaCobro,
    refreshView,
    nuevoCcNumero,
    ensureCcNumero,
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
