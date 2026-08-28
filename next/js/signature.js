/**
 * Firmas táctiles para NEXT.
 * Misma lógica que js/arpa-signature.js (escala del canvas, tinta, data URL).
 * No modifica la suite clásica ni usa sus IDs globales.
 */

export function imageDataHasInk(data) {
  const pixels = data;
  if (!pixels || !pixels.length) return false;
  for (let i = 3; i < pixels.length; i += 16) {
    if (pixels[i] > 0) return true;
  }
  return false;
}

export function canvasHasInk(canvas) {
  if (!canvas) return false;
  try {
    const ctx = canvas.getContext('2d');
    return imageDataHasInk(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  } catch (e) {
    return false;
  }
}

export function isSignedDataUrl(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.startsWith('data:image/') && dataUrl.length > 800;
}

function getPoint(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const source = e.touches ? e.touches[0] : e;
  const w = rect.width || canvas.width;
  const h = rect.height || canvas.height;
  return {
    x: (source.clientX - rect.left) * (canvas.width / w),
    y: (source.clientY - rect.top) * (canvas.height / h),
  };
}

export function bindSignaturePad(canvas, options = {}) {
  if (!canvas || canvas.dataset.sigBound === '1') return canvas;
  canvas.dataset.sigBound = '1';
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = options.color || '#0f2044';
  ctx.lineWidth = options.lineWidth || 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let drawing = false;

  function start(e) {
    drawing = true;
    const p = getPoint(canvas, e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function move(e) {
    if (!drawing) return;
    const p = getPoint(canvas, e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function end() {
    if (!drawing) return;
    drawing = false;
    const dataUrl = canvasHasInk(canvas) ? canvas.toDataURL('image/png') : '';
    options.onChange?.(dataUrl);
  }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); move(e); }, { passive: false });
  canvas.addEventListener('touchend', end);
  canvas.addEventListener('touchcancel', end);
  return canvas;
}

export function clearSignature(canvas) {
  if (!canvas) return;
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

export function getSignatureDataUrl(canvas) {
  if (!canvasHasInk(canvas)) return '';
  return canvas.toDataURL('image/png');
}

export function restoreSignature(canvas, dataUrl) {
  if (!canvas || !isSignedDataUrl(dataUrl)) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = dataUrl;
}

export function emptySignatures() {
  return {
    client: { name: '', doc: '', dataUrl: '' },
    technician: { name: '', dataUrl: '' },
  };
}

export function mergeSignatures(current, patch) {
  const base = current || emptySignatures();
  return {
    client: { ...emptySignatures().client, ...base.client, ...(patch.client || {}) },
    technician: { ...emptySignatures().technician, ...base.technician, ...(patch.technician || {}) },
  };
}
