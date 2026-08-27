/**
 * Firmas digitales: mouse + touch, borrar, captura en PDF
 */
(function (global) {
  const initialized = new Set();
  const printBackups = [];

  function initCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas || initialized.has(id)) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0f2044';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let drawing = false;

    function getPoint(e) {
      const rect = canvas.getBoundingClientRect();
      const source = e.touches ? e.touches[0] : e;
      return {
        x: (source.clientX - rect.left) * (canvas.width / rect.width),
        y: (source.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function start(e) {
      drawing = true;
      const p = getPoint(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }

    function move(e) {
      if (!drawing) return;
      const p = getPoint(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    function end() {
      drawing = false;
    }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); move(e); }, { passive: false });
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);

    initialized.add(id);
  }

  function clear(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  function canvasHasInk(canvas) {
    const ctx = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] > 0) return true;
    }
    return false;
  }

  function prepareForPrint(canvasIds) {
    restoreAfterPrint();
    const pending = [];

    canvasIds.forEach((id) => {
      const canvas = document.getElementById(id);
      if (!canvas || !canvasHasInk(canvas)) return;

      const dataUrl = canvas.toDataURL('image/png');
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = 'Firma';
      img.className = 'firma-print-img';
      img.setAttribute('data-firma-for', id);
      img.style.width = '100%';
      img.style.height = '110px';
      img.style.objectFit = 'contain';

      canvas.classList.add('firma-canvas-hidden-print');
      canvas.parentNode.insertBefore(img, canvas.nextSibling);
      printBackups.push({ canvas, img });

      pending.push(new Promise((resolve) => {
        if (img.complete) {
          resolve();
          return;
        }
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }));
    });

    if (!pending.length) return Promise.resolve();
    return Promise.all(pending);
  }

  function restoreAfterPrint() {
    printBackups.forEach(({ canvas, img }) => {
      img.remove();
      canvas.classList.remove('firma-canvas-hidden-print');
    });
    printBackups.length = 0;
  }

  function initAll(ids) {
    ids.forEach(initCanvas);
  }

  const DEFAULT_CANVASES = [
    'canvas-firma-cliente',
    'canvas-firma-tecnico',
    'canvas-cot-cliente',
    'canvas-cot-elaborado',
    'canvas-cc-cobrador',
    'canvas-cc-cliente'
  ];

  function hasSignature(id) {
    const canvas = document.getElementById(id);
    return canvas ? canvasHasInk(canvas) : false;
  }

  function getDataUrl(id) {
    const canvas = document.getElementById(id);
    if (!canvas || !canvasHasInk(canvas)) return '';
    return canvas.toDataURL('image/png');
  }

  function restoreDataUrl(id, dataUrl) {
    if (!dataUrl) return;
    const canvas = document.getElementById(id);
    if (!canvas) return;
    initCanvas(id);
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  }

  global.ArpaSignature = {
    initCanvas,
    initAll,
    clear,
    hasSignature,
    getDataUrl,
    restoreDataUrl,
    prepareForPrint,
    restoreAfterPrint,
    DEFAULT_CANVASES
  };

  global.limpiarFirma = clear;

  document.addEventListener('DOMContentLoaded', () => {
    initAll(DEFAULT_CANVASES);
  });
})(window);
