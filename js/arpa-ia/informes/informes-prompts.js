/**
 * Prompts estrictos para el LLM DEV de informes.
 * El modelo solo puede redactar con hechos de la OT. store: false en el backend.
 */
(function (global) {
  function schemaJson() {
    return JSON.stringify({
      titulo: '',
      numero_ot: '',
      fecha: '',
      cliente: '',
      ubicacion: '',
      tecnico: '',
      oficio: '',
      tipo_servicio: '',
      equipo: '',
      marca: '',
      modelo: '',
      descripcion_trabajo: '',
      hallazgos: [],
      diagnostico: '',
      trabajos_realizados: [],
      materiales_utilizados: [],
      resultado: '',
      recomendaciones: [],
      observaciones: '',
      resumen_cliente: '',
      nota_tecnica: '',
      advertencias: []
    }, null, 2);
  }

  function buildSystemPrompt(parsed) {
    const oficio = parsed && parsed.oficio_id ? parsed.oficio_id : '';
    const label = parsed && parsed.oficio_label ? parsed.oficio_label : oficio;
    return [
      'Eres un redactor de informes técnicos de campo para ARPASuite.',
      'Oficio fijado por ARPASuite: ' + label + ' (' + oficio + '). NO lo cambies. NO infieras otro oficio.',
      'Trabaja SOLO con los hechos JSON de la Orden de Trabajo que te entregan.',
      'NO inventes marcas, modelos, fechas, nombres, precios, materiales, mediciones, reparaciones ni resultados.',
      'Si un campo no viene en la OT, déjalo vacío o [].',
      'Diferencia hechos registrados de hipótesis. Las hipótesis NUNCA se afirman como diagnóstico confirmado.',
      'Si causa_confirmada es false, el diagnóstico debe decir que no hay diagnóstico confirmado y listar hipótesis como tales.',
      'Redacta en español claro, profesional, específico de ESTA OT. No uses tono genérico de chatbot.',
      'No agregues Markdown. Responde únicamente con este JSON:',
      schemaJson()
    ].join('\n');
  }

  function buildInput(parsed) {
    const facts = parsed && typeof parsed === 'object' ? parsed : {};
    const seguro = {
      numero_ot: facts.numero_ot || '',
      fecha: facts.fecha || '',
      cliente: facts.cliente || '',
      ubicacion: facts.ubicacion || '',
      tecnico: facts.tecnico || '',
      oficio_id: facts.oficio_id || '',
      oficio_label: facts.oficio_label || '',
      tipo_servicio: facts.tipo_servicio || '',
      descripcion_trabajo: facts.descripcion_trabajo || '',
      equipo: facts.equipo || '',
      marca: facts.marca || '',
      modelo: facts.modelo || '',
      sintomas: facts.sintomas || [],
      hallazgos: facts.hallazgos || [],
      diagnostico_confirmado: facts.diagnostico_confirmado || '',
      causa_confirmada: !!facts.causa_confirmada,
      causas: (facts.causas || []).map(function (c) {
        return { texto: c.texto, confirmado: !!c.confirmado, tipo: c.tipo || 'hipotesis' };
      }),
      pruebas_realizadas: facts.pruebas_realizadas || [],
      trabajos_ejecutados: facts.trabajos_ejecutados || [],
      materiales: facts.materiales || [],
      observaciones: facts.observaciones || '',
      fotos: facts.fotos || { antes: [], despues: [] },
      resultado: facts.resultado || '',
      recomendaciones: facts.recomendaciones || [],
      estado: facts.estado || '',
      advertencias: facts.advertencias || []
    };
    return 'Hechos registrados de la OT (NO completar huecos):\n' + JSON.stringify(seguro, null, 2);
  }

  function buildOtPayload(parsed) {
    const facts = parsed && typeof parsed === 'object' ? parsed : {};
    return {
      numero_ot: facts.numero_ot || '',
      fecha: facts.fecha || '',
      cliente: facts.cliente || '',
      ubicacion: facts.ubicacion || '',
      tecnico: facts.tecnico || '',
      oficio: facts.oficio_id || '',
      tipo_servicio: facts.tipo_servicio || '',
      equipo: facts.equipo || '',
      marca: facts.marca || '',
      modelo: facts.modelo || '',
      descripcion_trabajo: facts.descripcion_trabajo || '',
      sintomas: facts.sintomas || [],
      hallazgos: facts.hallazgos || [],
      diagnostico: facts.diagnostico_confirmado || '',
      causa_confirmada: !!facts.causa_confirmada,
      causas: (facts.causas || []).map(function (c) {
        return {
          texto: c && c.texto ? c.texto : String(c || ''),
          confirmado: !!(c && c.confirmado),
          tipo: (c && c.tipo) || 'hipotesis'
        };
      }),
      trabajos_realizados: facts.trabajos_ejecutados || [],
      materiales_utilizados: facts.materiales || [],
      resultado: facts.resultado || '',
      recomendaciones: facts.recomendaciones || [],
      observaciones: facts.observaciones || '',
      advertencias: facts.advertencias || []
    };
  }

  global.ArpaIaInformesPrompts = {
    buildSystemPrompt: buildSystemPrompt,
    buildInput: buildInput,
    buildOtPayload: buildOtPayload
  };
})(typeof window !== 'undefined' ? window : globalThis);
