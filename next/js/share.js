/**
 * Envío local: Web Share, descarga y wa.me (cliente).
 * No usa WhatsApp Business API, Apps Script ni producción.
 */

export function sanitizeFilenamePart(text) {
  return String(text || '')
    .replace(/[^\w\s-áéíóúÁÉÍÓÚñÑ]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40) || 'Documento';
}

export function documentFilename(kind, number, clientName, ext) {
  const prefix = kind === 'quote' ? 'Cotizacion' : 'Informe';
  const suffix = ext || 'pdf';
  return `${prefix}_${sanitizeFilenamePart(number)}_${sanitizeFilenamePart(clientName)}.${suffix}`;
}

export function htmlDocumentToFile(html, filename) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const name = filename || 'ARPASuite.html';
  if (typeof File === 'function') {
    return new File([blob], name, { type: 'text/html' });
  }
  blob.name = name;
  return blob;
}

export function downloadFile(file) {
  if (typeof document === 'undefined') return 'downloaded';
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name || 'ARPASuite.pdf';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
  return 'downloaded';
}

function canShareFiles(file) {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  if (navigator.webdriver) return false;
  if (typeof navigator.canShare !== 'function') return true;
  try {
    return navigator.canShare({ files: [file] });
  } catch (e) {
    return false;
  }
}

/**
 * @returns {Promise<'shared'|'downloaded'|'aborted'>}
 */
export async function shareOrDownload({ file, title, text }) {
  if (!file) return 'aborted';
  if (canShareFiles(file)) {
    try {
      await navigator.share({
        files: [file],
        title: title || file.name,
        text: text || '',
      });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'aborted';
    }
  }
  downloadFile(file);
  return 'downloaded';
}

export function shareMessage(kind, number, clientName, companyName) {
  const who = clientName || 'Cliente';
  const company = companyName || 'ARPASuite';
  if (kind === 'quote') {
    return `Cotización ${number || ''} de ${company} para ${who}. Documento generado en el dispositivo.`;
  }
  return `Informe de servicio ${number || ''} de ${company} para ${who}. Documento generado en el dispositivo.`;
}

/**
 * Misma regla que js/arpa-whatsapp.js: Colombia +57 si el número tiene 10 dígitos.
 */
export function buildWaMeUrl(telRaw, message) {
  const tel = String(telRaw || '').replace(/\D/g, '');
  const text = encodeURIComponent(message || '');
  const phone = tel.length >= 10 ? (tel.startsWith('57') ? tel : '57' + tel) : '';
  return phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://wa.me/?text=${text}`;
}

export function whatsAppMessage(kind, number, clientName, companyName) {
  const nombre = String(clientName || 'Cliente').trim() || 'Cliente';
  const company = companyName || 'ARPASuite';
  const nro = number || '—';
  if (kind === 'quote') {
    return `Hola ${nombre}, le comparto la cotización ${nro} de ${company}. Adjunte el PDF generado en el dispositivo y confírmenos su recepción.`;
  }
  return `Hola ${nombre}, le comparto el informe de servicio ${nro} de ${company}. Adjunte el PDF generado en el dispositivo y confírmenos su recepción.`;
}

export function openWhatsApp(telRaw, message) {
  const url = buildWaMeUrl(telRaw, message);
  if (typeof window === 'undefined') return url;
  window.open(url, '_blank', 'noopener,noreferrer');
  return url;
}
