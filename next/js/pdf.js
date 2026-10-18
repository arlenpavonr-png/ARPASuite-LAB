/**
 * PDF nativo con jsPDF (archivo vendido en /js/jspdf.umd.min.js).
 * No usa Apps Script ni servicios de producción.
 */
import { money } from './quote.js';
import { documentFilename } from './share.js';

const NAVY = [15, 32, 68];
const MUTED = [100, 116, 139];
const TEXT = [30, 41, 59];
const GOLD = [180, 83, 9];

export function getJsPdfConstructor() {
  if (typeof window !== 'undefined') {
    return window.jspdf?.jsPDF || window.jsPDF || null;
  }
  return null;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-arpa-jspdf]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('jsPDF no cargó')));
      if (getJsPdfConstructor()) resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.dataset.arpaJspdf = '1';
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
    document.head.appendChild(el);
  });
}

export async function ensureJsPdf() {
  const have = getJsPdfConstructor();
  if (have) return have;
  if (typeof document === 'undefined') {
    throw new Error('jsPDF no está disponible fuera del navegador');
  }
  const src = new URL('../../js/jspdf.umd.min.js', import.meta.url).href;
  await loadScript(src);
  const ctor = getJsPdfConstructor();
  if (!ctor) throw new Error('jsPDF no quedó expuesto');
  return ctor;
}

function imageHeader(dataUrl) {
  const m = String(dataUrl || '').match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!m) return null;
  try {
    const b64 = m[2].replace(/\s/g, '');
    let bytes;
    if (typeof Buffer !== 'undefined') bytes = Buffer.from(b64.slice(0, 64), 'base64');
    else {
      const bin = atob(b64.slice(0, 64));
      bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    }
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'PNG';
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'JPEG';
    return null;
  } catch (e) {
    return null;
  }
}

function tryAddImage(doc, dataUrl, x, y, w, h) {
  const format = imageHeader(dataUrl);
  if (!format) return false;
  try {
    doc.addImage(dataUrl, format, x, y, w, h);
    return true;
  } catch (e) {
    return false;
  }
}

function ensureY(doc, y, need, margin, pageH) {
  if (y + need > pageH - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

function heading(doc, label, y, margin, pageW) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(String(label).toUpperCase(), margin, y);
  doc.setDrawColor(232, 237, 245);
  doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
  return y + 7;
}

function bullets(doc, items, empty, y, margin, pageW, pageH) {
  const width = pageW - margin * 2 - 4;
  const list = (items || []).filter(Boolean);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (!list.length) {
    doc.setTextColor(...MUTED);
    y = ensureY(doc, y, 6, margin, pageH);
    doc.text(empty, margin, y);
    return y + 6;
  }
  doc.setTextColor(...TEXT);
  for (const item of list) {
    const lines = doc.splitTextToSize('• ' + String(item), width);
    y = ensureY(doc, y, lines.length * 5 + 1, margin, pageH);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 1;
  }
  return y + 2;
}

export function drawReportPdf(doc, model) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 14;
  let y = 0;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(model.companyName || 'ARPASuite', m, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (model.companyLine) doc.text(model.companyLine, m, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('INFORME DE SERVICIO', pageW - m, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(String(model.number || ''), pageW - m, 18, { align: 'right' });
  doc.text(String(model.date || ''), pageW - m, 23, { align: 'right' });

  y = 36;
  doc.setTextColor(...TEXT);
  y = heading(doc, 'Cliente y equipo', y, m, pageW);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const meta = [
    `Cliente: ${model.clientName || '—'}`,
    model.clientMeta || '',
    `Equipo: ${model.equipmentLabel || '—'}`,
    `Serie ${model.serial || '—'}`,
    `Tipo: ${model.type || '—'}`,
    `Técnico: ${model.technician || '—'}`,
    `Estado: ${model.status || '—'}`,
  ].filter(Boolean);
  for (const line of meta) {
    const wrapped = doc.splitTextToSize(line, pageW - m * 2);
    y = ensureY(doc, y, wrapped.length * 5, m, pageH);
    doc.text(wrapped, m, y);
    y += wrapped.length * 5;
  }
  y += 3;

  y = heading(doc, 'Hallazgos', y, m, pageW);
  y = bullets(doc, model.findings, 'Sin hallazgos registrados.', y, m, pageW, pageH);
  y = heading(doc, 'Trabajo realizado', y, m, pageW);
  y = bullets(doc, model.workDone, 'Sin trabajo registrado.', y, m, pageW, pageH);
  y = heading(doc, 'Repuestos', y, m, pageW);
  y = bullets(doc, model.parts, 'Sin repuestos registrados.', y, m, pageW, pageH);
  y = heading(doc, 'Recomendaciones', y, m, pageW);
  y = bullets(doc, model.recommendations, 'Sin recomendaciones.', y, m, pageW, pageH);

  if ((model.quoteItems || []).length) {
    y = heading(doc, 'Borrador de cotización', y, m, pageW);
    doc.setFontSize(9);
    for (const item of model.quoteItems) {
      const line = `${item.name}  ×${item.qty || 1}  ${money(item.unitPrice)} + MO ${money(item.labor)}`;
      const wrapped = doc.splitTextToSize(line, pageW - m * 2);
      y = ensureY(doc, y, wrapped.length * 4.5 + 1, m, pageH);
      doc.setTextColor(...TEXT);
      doc.text(wrapped, m, y);
      y += wrapped.length * 4.5 + 1;
    }
    doc.setFont('helvetica', 'bold');
    y = ensureY(doc, y, 6, m, pageH);
    doc.text('Total sugerido: ' + (model.quoteTotal || ''), m, y);
    y += 8;
  }

  if ((model.checklistDone || []).length) {
    y = heading(doc, 'Checklist', y, m, pageW);
    y = bullets(doc, model.checklistDone, '', y, m, pageW, pageH);
  }

  const photos = (model.photos || []).filter((p) => p?.dataUrl).slice(0, 8);
  if (photos.length) {
    y = heading(doc, 'Registro fotográfico', y, m, pageW);
    const colW = (pageW - m * 2 - 6) / 2;
    const imgH = 42;
    for (let i = 0; i < photos.length; i += 2) {
      y = ensureY(doc, y, imgH + 10, m, pageH);
      const left = photos[i];
      const right = photos[i + 1];
      tryAddImage(doc, left.dataUrl, m, y, colW, imgH);
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(left.kind === 'after' ? 'Después' : left.kind === 'before' ? 'Antes' : 'Foto', m, y + imgH + 4);
      if (right) {
        tryAddImage(doc, right.dataUrl, m + colW + 6, y, colW, imgH);
        doc.text(right.kind === 'after' ? 'Después' : right.kind === 'before' ? 'Antes' : 'Foto', m + colW + 6, y + imgH + 4);
      }
      y += imgH + 10;
    }
  }

  if (model.notes) {
    y = heading(doc, 'Notas', y, m, pageW);
    const notes = doc.splitTextToSize(String(model.notes), pageW - m * 2);
    y = ensureY(doc, y, notes.length * 5, m, pageH);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT);
    doc.text(notes, m, y);
    y += notes.length * 5 + 4;
  }

  y = heading(doc, 'Aceptación', y, m, pageW);
  const sigW = (pageW - m * 2 - 8) / 2;
  y = ensureY(doc, y, 36, m, pageH);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Cliente', m, y);
  doc.text('Técnico', m + sigW + 8, y);
  y += 3;
  if (model.clientSignature) tryAddImage(doc, model.clientSignature, m, y, sigW, 22);
  if (model.technicianSignature) tryAddImage(doc, model.technicianSignature, m + sigW + 8, y, sigW, 22);
  y += 24;
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(String(model.clientSignedName || ''), m, y);
  doc.text(String(model.technicianSignedName || ''), m + sigW + 8, y);

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `ARPASuite NEXT · ${model.number || ''} · ${i}/${pageCount}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
  }
  return doc;
}

export function drawQuotePdf(doc, model) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 14;
  let y = 0;

  doc.setFillColor(...GOLD);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(model.companyName || 'ARPASuite', m, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (model.companyLine) doc.text(model.companyLine, m, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('COTIZACIÓN BORRADOR', pageW - m, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(String(model.number || ''), pageW - m, 18, { align: 'right' });
  doc.text(String(model.date || ''), pageW - m, 23, { align: 'right' });

  y = 38;
  doc.setTextColor(...TEXT);
  doc.setFontSize(10);
  doc.text(`Cliente: ${model.clientName || '—'}`, m, y);
  y += 5;
  if (model.clientMeta) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.text(model.clientMeta, m, y);
    y += 5;
  }
  doc.setTextColor(...TEXT);
  doc.setFontSize(10);
  doc.text(`Técnico: ${model.technician || '—'}`, m, y);
  y += 8;

  const items = model.items || [];
  doc.setFillColor(...NAVY);
  doc.rect(m, y, pageW - m * 2, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Ítem', m + 2, y + 4.8);
  doc.text('Cant.', m + 88, y + 4.8);
  doc.text('Precio', m + 108, y + 4.8);
  doc.text('M.O.', m + 138, y + 4.8);
  doc.text('Total', pageW - m - 2, y + 4.8, { align: 'right' });
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT);

  if (!items.length) {
    doc.text('No hay ítems cotizables.', m, y);
    y += 8;
  } else {
    items.forEach((item, idx) => {
      const lineTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0) + (Number(item.labor) || 0);
      const nameLines = doc.splitTextToSize(String(item.name || 'Ítem'), 80);
      const rowH = Math.max(7, nameLines.length * 4 + 2);
      y = ensureY(doc, y, rowH, m, pageH);
      if (idx % 2) {
        doc.setFillColor(248, 250, 252);
        doc.rect(m, y - 3.5, pageW - m * 2, rowH, 'F');
      }
      doc.setTextColor(...TEXT);
      doc.text(nameLines, m + 2, y);
      doc.text(String(item.qty || 1), m + 88, y);
      doc.text(money(item.unitPrice), m + 108, y);
      doc.text(money(item.labor), m + 138, y);
      doc.text(money(lineTotal), pageW - m - 2, y, { align: 'right' });
      y += rowH;
    });
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text('Total sugerido: ' + (model.quoteTotal || money(0)), pageW - m, y, { align: 'right' });
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const note = model.notes || 'Borrador generado en el dispositivo. Revise precios antes de formalizar.';
  const noteLines = doc.splitTextToSize(note, pageW - m * 2);
  doc.text(noteLines, m, y);

  return doc;
}

export function pdfBlobFromDoc(doc) {
  const blob = doc.output('blob');
  return blob;
}

export function renderReportPdf(model, JsPDF) {
  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  drawReportPdf(doc, model || {});
  const filename = documentFilename('report', model?.number, model?.clientName);
  return { doc, blob: pdfBlobFromDoc(doc), filename };
}

export function renderQuotePdf(model, JsPDF) {
  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  drawQuotePdf(doc, model || {});
  const filename = documentFilename('quote', model?.number, model?.clientName);
  return { doc, blob: pdfBlobFromDoc(doc), filename };
}

export async function pdfFileFromModel(kind, model, JsPDF) {
  const ctor = JsPDF || (await ensureJsPdf());
  const built = kind === 'quote' ? renderQuotePdf(model, ctor) : renderReportPdf(model, ctor);
  if (typeof File === 'function') {
    return new File([built.blob], built.filename, { type: 'application/pdf' });
  }
  built.blob.name = built.filename;
  return built.blob;
}

export function isPdfMagic(bytes) {
  if (!bytes || bytes.length < 5) return false;
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46;
}
