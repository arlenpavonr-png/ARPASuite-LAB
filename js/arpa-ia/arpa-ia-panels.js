/**
 * Plantillas HTML de paneles IA (fuera de index.html).
 * El host las monta en los slots genéricos.
 */
(function (global) {
  const Panels = {
    cotizador: [
      '<div class="section arpa-ia-cot-panel no-print" id="arpa-ia-cot-panel">',
      '  <div class="section-title"><span class="dot"></span><span>✨ ARPA IA — COTIZADOR</span></div>',
      '  <p class="arpa-ia-cot-lead">Asistente para preparar la cotización. Describe el trabajo en tus palabras. Extrae datos y sugiere productos reales del catálogo. No reemplaza ni guarda la cotización tradicional.</p>',
      '  <div class="field">',
      '    <label for="arpa-ia-cot-text">Solicitud</label>',
      '    <textarea id="arpa-ia-cot-text" placeholder="Ej. Necesito automatizar una puerta corrediza residencial de 500 kg, 5 metros, Medellín."></textarea>',
      '  </div>',
      '  <div class="arpa-ia-cot-actions">',
      '    <button type="button" class="btn-arpa-ia" id="arpa-ia-cot-run">Analizar con ARPA IA</button>',
      '  </div>',
      '  <div id="arpa-ia-cot-status" class="arpa-ia-cot-status" hidden></div>',
      '  <div id="arpa-ia-cot-error" class="arpa-ia-cot-error" hidden></div>',
      '  <div id="arpa-ia-cot-resultado" class="arpa-ia-cot-resultado" hidden>',
      '    <div id="arpa-ia-cot-oficio" class="arpa-ia-oficio" hidden></div>',
      '    <div>',
      '      <div class="arpa-ia-sub">Datos detectados</div>',
      '      <div id="arpa-ia-cot-datos" class="arpa-ia-datos"></div>',
      '    </div>',
      '    <div id="arpa-ia-cot-faltantes" class="arpa-ia-faltantes" hidden>',
      '      <div class="arpa-ia-sub">Datos que faltan</div>',
      '      <p class="arpa-ia-faltantes-note">Para recomendar con precisión hacen falta estos datos. No se asumieron peso, medidas ni accesorios.</p>',
      '      <ul id="arpa-ia-cot-faltantes-list"></ul>',
      '    </div>',
      '    <div>',
      '      <div class="arpa-ia-sub">Productos sugeridos por ARPA IA</div>',
      '      <div id="arpa-ia-cot-productos"></div>',
      '      <div id="arpa-ia-cot-vacio" class="arpa-ia-vacio" hidden>No encontramos un producto compatible en el catálogo.</div>',
      '      <div id="arpa-ia-cot-usar-wrap" class="arpa-ia-usar-wrap" hidden>',
      '        <button type="button" class="btn-arpa-ia-use" id="arpa-ia-cot-usar">Usar en cotización</button>',
      '        <p class="arpa-ia-usar-note">Pasa los productos seleccionados a la cotización actual. No guarda el documento.</p>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n'),

    tecnica: [
      '<div class="section arpa-ia-tec-ot-panel no-print" id="formato-ia-tecnica" data-ot-paso="diagnostico" hidden>',
      '  <div class="section-title"><span class="dot"></span><span>🔧 ARPA IA — Diagnóstico técnico</span></div>',
      '  <p class="arpa-ia-tec-lead">Usa el oficio configurado y los datos ya capturados en este trabajo. Usted agrega síntomas. Las causas son hipótesis, no un diagnóstico confirmado.</p>',
      '  <div id="arpa-ia-ot-oficio" class="arpa-ia-oficio">Oficio de la OT</div>',
      '  <div class="field">',
      '    <label for="arpa-ia-ot-text">Síntomas / observaciones del técnico</label>',
      '    <textarea id="arpa-ia-ot-text" placeholder="Describa la falla observada. No invente datos."></textarea>',
      '  </div>',
      '  <div class="arpa-ia-tec-actions">',
      '    <button type="button" class="btn-arpa-ia" id="arpa-ia-ot-run">Analizar diagnóstico</button>',
      '  </div>',
      '  <div id="arpa-ia-ot-status" class="arpa-ia-tec-status" hidden></div>',
      '  <div id="arpa-ia-ot-resultado" class="arpa-ia-tec-resultado" hidden>',
      '    <div id="arpa-ia-ot-oficio-usado" class="arpa-ia-oficio" hidden></div>',
      '    <div id="arpa-ia-ot-mensaje" class="arpa-ia-tec-mensaje" hidden></div>',
      '    <div class="arpa-ia-tec-block"><div class="arpa-ia-sub">Síntomas detectados</div><div id="arpa-ia-ot-sintomas"></div></div>',
      '    <div class="arpa-ia-tec-block"><div class="arpa-ia-sub">Datos conocidos</div><div id="arpa-ia-ot-datos"></div></div>',
      '    <div class="arpa-ia-tec-block arpa-ia-tec-faltantes-box"><div class="arpa-ia-sub">Datos faltantes</div><div id="arpa-ia-ot-faltantes"></div></div>',
      '    <div class="arpa-ia-tec-block"><div class="arpa-ia-sub">Posibles causas</div><div id="arpa-ia-ot-causas"></div></div>',
      '    <div class="arpa-ia-tec-block"><div class="arpa-ia-sub">Pruebas recomendadas</div><div id="arpa-ia-ot-pruebas"></div></div>',
      '    <div class="arpa-ia-tec-block"><div class="arpa-ia-sub">Procedimiento sugerido</div><div id="arpa-ia-ot-procedimiento"></div></div>',
      '    <div><div class="arpa-ia-sub">Nivel de urgencia</div><div id="arpa-ia-ot-urgencia" class="arpa-ia-tec-urgencia is-indet"></div></div>',
      '    <div class="arpa-ia-tec-block arpa-ia-tec-seguridad"><div class="arpa-ia-sub">Advertencias de seguridad</div><div id="arpa-ia-ot-seguridad"></div></div>',
      '    <div id="arpa-ia-ot-preguntas-wrap" class="arpa-ia-tec-block arpa-ia-tec-faltantes-box" hidden>',
      '      <div class="arpa-ia-sub">Preguntas al técnico</div>',
      '      <p class="arpa-ia-tec-empty">Responda y pulse «Volver a analizar». No se almacena un chat, solo estas respuestas en el nuevo análisis.</p>',
      '      <div id="arpa-ia-ot-preguntas"></div>',
      '      <button type="button" class="btn-arpa-ia-use" id="arpa-ia-ot-reanalizar" style="margin-top:10px;">Volver a analizar</button>',
      '    </div>',
      '    <div class="arpa-ia-tec-actions">',
      '      <button type="button" class="btn-arpa-ia-use" id="arpa-ia-ot-guardar">Guardar análisis en la OT</button>',
      '    </div>',
      '  </div>',
      '  <div id="formato-ia-tecnica-resumen" class="arpa-ia-tec-saved" hidden></div>',
      '  <textarea id="formato-ia-tecnica-json" hidden></textarea>',
      '</div>'
    ].join('\n'),

    informes: [
      '<div class="section arpa-ia-tec-ot-panel no-print" id="formato-ia-informes" data-ot-paso="cierre">',
      '  <div class="section-title"><span class="dot"></span><span>ARPA IA — Informe técnico</span></div>',
      '  <p class="arpa-ia-tec-lead">Redacta un informe con los datos ya capturados en este trabajo. No inventa materiales ni precios. El PDF tradicional no cambia.</p>',
      '  <div class="arpa-ia-tec-actions">',
      '    <button type="button" class="btn-arpa-ia" id="arpa-ia-inf-run">Generar informe IA</button>',
      '  </div>',
      '  <div id="arpa-ia-inf-status" class="arpa-ia-tec-status" hidden></div>',
      '  <div id="arpa-ia-inf-resultado" class="arpa-ia-tec-resultado" hidden>',
      '    <div id="arpa-ia-inf-titulo" class="arpa-ia-tec-mensaje"></div>',
      '    <div class="arpa-ia-tec-block"><div class="arpa-ia-sub">Resumen para el cliente</div><div id="arpa-ia-inf-resumen"></div></div>',
      '    <div class="arpa-ia-tec-block"><div class="arpa-ia-sub">Hechos de la OT</div><div id="arpa-ia-inf-hechos"></div></div>',
      '  </div>',
      '  <textarea id="formato-ia-informe-json" hidden></textarea>',
      '</div>'
    ].join('\n'),

    comercial: [
      '<div class="section arpa-ia-tec-ot-panel no-print" id="historial-ia-comercial">',
      '  <div class="section-title"><span class="dot"></span><span>ARPA IA COMERCIAL</span></div>',
      '  <p class="arpa-ia-tec-lead">Analiza clientes, historial, cotizaciones y cuentas de cobro que ya existen en ARPASuite. No inventa fechas ni precios. No envía WhatsApp.</p>',
      '  <div class="arpa-ia-tec-actions">',
      '    <button type="button" class="btn-arpa-ia" id="arpa-ia-com-run">Analizar oportunidades</button>',
      '  </div>',
      '  <div id="arpa-ia-com-status" class="arpa-ia-tec-status" hidden></div>',
      '  <div id="arpa-ia-com-resultado" class="arpa-ia-tec-resultado" hidden></div>',
      '</div>'
    ].join('\n')
  };

  global.ArpaIaPanels = Panels;
})(typeof window !== 'undefined' ? window : globalThis);
