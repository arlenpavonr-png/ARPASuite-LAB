export function createVoiceCapture(options) {
  const Speech = typeof window !== 'undefined'
    && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!Speech) {
    return {
      supported: false,
      start() { options?.onError?.(new Error('Este navegador no soporta dictado.')); },
      stop() {},
    };
  }
  const rec = new Speech();
  rec.lang = options?.lang || 'es-CO';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.onresult = (ev) => {
    let finalText = '';
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const piece = ev.results[i][0]?.transcript || '';
      if (ev.results[i].isFinal) finalText += piece;
      else interim += piece;
    }
    options?.onResult?.({ finalText: finalText.trim(), interim: interim.trim() });
  };
  rec.onerror = (ev) => {
    if (ev.error === 'aborted' || ev.error === 'no-speech') return;
    options?.onError?.(new Error(ev.error || 'voice-error'));
  };
  rec.onend = () => options?.onEnd?.();
  return {
    supported: true,
    start() {
      try { rec.start(); } catch (e) { options?.onError?.(e); }
    },
    stop() {
      try { rec.stop(); } catch (e) { /* ignore */ }
    },
  };
}
