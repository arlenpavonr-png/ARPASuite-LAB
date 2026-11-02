/**
 * Chat de prueba: Arlen le escribe al robot como si fuera un cliente, desde el navegador.
 * Usa el mismo cerebro, las mismas reglas y el mismo filtro de precios que WhatsApp,
 * pero no envía WhatsApp, no guarda en la hoja y no manda correos.
 * Se abre con  <URL de la app web>?chat=<CHAT_PRUEBA_TOKEN>  (lo da linkChatPrueba()).
 */

/** Una vez, desde el editor: crea la clave del chat de prueba y muestra el link. */
function linkChatPrueba() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('CHAT_PRUEBA_TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('CHAT_PRUEBA_TOKEN', token);
  }
  console.log('Chat de prueba: ' + ScriptApp.getService().getUrl() + '?chat=' + token);
}

function chatPruebaValido_(token) {
  var bueno = prop_('CHAT_PRUEBA_TOKEN');
  return !!bueno && token === bueno;
}

function chatPrueba_(token) {
  if (!chatPruebaValido_(token)) return ContentService.createTextOutput('ARPA contestador');
  var html = HTML_CHAT_PRUEBA.replace('__TOKEN__', token);
  return HtmlService.createHtmlOutput(html)
    .setTitle('Prueba del robot · Automatismos ARPA')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Lo llama la página. historial: [{ rol: 'cliente'|'asistente', tipo, texto }], ya con el
 * último mensaje del cliente al final. Devuelve { texto, nota }.
 */
function responderPrueba(token, historial) {
  if (!chatPruebaValido_(token)) throw new Error('Link de prueba no válido');
  var config = leerConfig_();
  var negocio = NEGOCIOS.automatismos;
  var ahora = Date.now();
  var horario = cuandoResponde_(ahora, negocio.horario, config.festivosExtra);
  var ultimo = historial[historial.length - 1] || {};

  if (TIPOS_MEDIA.indexOf(ultimo.tipo) !== -1) {
    return {
      texto: (negocio.acuseMedia[ultimo.tipo] || 'Recibimos su mensaje, gracias.') + ' Arlen le responde ' + horario.cuando + '.',
      nota: 'A Arlen le llegaría un correo con la foto.'
    };
  }

  var tieneFotos = historial.some(function (f) { return f.rol === 'cliente' && f.tipo === 'image'; });
  var h = decidirHandoff_(ultimo.texto, { tieneFotos: tieneFotos });
  var plan = { handoff: h.pasar ? h.motivo : '' };
  var sistema = construirSistema_(negocio, {
    fecha: fechaLegible_(ahora), enHorario: horario.enHorario, cuando: horario.cuando, handoff: plan.handoff
  });
  var claude = llamarClaude_(config, sistema, construirMensajes_(historial, CONTESTADOR_DEFAULTS.HISTORIAL_MENSAJES));
  var revision = revisarRespuesta_(negocio, claude.texto, plan, horario.cuando);
  var notas = [];
  if (revision.bloqueada) notas.push('El filtro frenó un precio no permitido; se envió el mensaje de respaldo.');
  if (revision.handoff) notas.push('A Arlen le llegaría un correo para que tome el caso.');
  if (claude.error) notas.push('No hubo respuesta de Claude (revise la hoja Registro).');
  return { texto: revision.enviar, nota: notas.join(' ') };
}

var HTML_CHAT_PRUEBA = [
  '<!doctype html><html><head><meta charset="utf-8"><style>',
  ':root{--fondo:#efeae2;--yo:#d9fdd3;--el:#fff;--texto:#111b21;--gris:#667781;--verde:#008069}',
  '*{box-sizing:border-box}body{margin:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;background:var(--fondo);color:var(--texto);height:100vh;display:flex;flex-direction:column}',
  'header{background:var(--verde);color:#fff;padding:12px 16px}header b{display:block;font-size:17px}header span{font-size:13px;opacity:.85}',
  '#chat{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:6px}',
  '.m{max-width:80%;padding:7px 10px;border-radius:8px;white-space:pre-wrap;line-height:1.35;font-size:15px;box-shadow:0 1px .5px rgba(0,0,0,.13)}',
  '.yo{align-self:flex-end;background:var(--yo)}.el{align-self:flex-start;background:var(--el)}',
  '.nota{align-self:center;background:#fff3c4;color:#5c4a00;font-size:12.5px;padding:5px 10px;border-radius:8px;max-width:90%;text-align:center}',
  'form{display:flex;gap:8px;padding:10px 12px;background:#f0f2f5}',
  'textarea{flex:1;resize:none;border:0;border-radius:20px;padding:10px 14px;font:inherit;font-size:15px;height:44px}',
  'button{border:0;border-radius:22px;background:var(--verde);color:#fff;font-size:15px;padding:0 16px;cursor:pointer}',
  'button.sec{background:#fff;color:var(--verde);border:1px solid var(--verde)}button:disabled{opacity:.5}',
  '</style></head><body>',
  '<header><b>Prueba del robot · Automatismos ARPA</b><span>Escriba como si fuera un cliente. No se envía nada por WhatsApp.</span></header>',
  '<div id="chat"><div class="nota">Mismas reglas y precios que tendrá en WhatsApp. Para empezar de cero, recargue la página.</div></div>',
  '<form id="f"><button type="button" class="sec" id="foto" title="Simular que el cliente manda una foto">📷</button>',
  '<textarea id="t" placeholder="Escriba un mensaje"></textarea><button id="b">Enviar</button></form>',
  '<script>',
  'var TOKEN="__TOKEN__",hist=[],chat=document.getElementById("chat"),t=document.getElementById("t"),b=document.getElementById("b"),fb=document.getElementById("foto");',
  'function burbuja(cls,txt){var d=document.createElement("div");d.className=cls;d.textContent=txt;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;return d;}',
  'function ocupado(s){b.disabled=fb.disabled=s;}',
  'function mandar(tipo,txt){hist.push({rol:"cliente",tipo:tipo,texto:txt});burbuja("m yo",tipo==="image"?"📷 (foto de la puerta)":txt);',
  ' var esp=burbuja("m el","escribiendo…");ocupado(true);',
  ' google.script.run.withSuccessHandler(function(r){esp.textContent=r.texto;hist.push({rol:"asistente",tipo:"text",texto:r.texto});if(r.nota)burbuja("nota",r.nota);ocupado(false);t.focus();})',
  ' .withFailureHandler(function(e){esp.textContent="(Error: "+e.message+")";ocupado(false);}).responderPrueba(TOKEN,hist);}',
  'document.getElementById("f").addEventListener("submit",function(e){e.preventDefault();var x=t.value.trim();if(!x||b.disabled)return;t.value="";mandar("text",x);});',
  't.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();document.getElementById("f").requestSubmit();}});',
  'fb.addEventListener("click",function(){if(!fb.disabled)mandar("image","");});',
  '</script></body></html>'
].join('\n');
