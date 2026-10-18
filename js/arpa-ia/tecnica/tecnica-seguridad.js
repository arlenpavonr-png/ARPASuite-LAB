/**
 * Reglas de seguridad: nunca recomendar eliminar ni puentear protecciones.
 */
(function (global) {
  const BYPASS_RE = /puente(?:ar|o)?|bypasse?ar|bypass|jumper|anular\s+(?:la\s+|el\s+|los\s+|las\s+)?(?:foto|segur|protecci|sensor|tierra|termostato)|desactivar\s+(?:la\s+|el\s+|los\s+|las\s+)?(?:foto|segur|protecci|sensor|tierra)|quitar\s+(?:la\s+|el\s+|las\s+)?(?:foto|protecci[oó]n|tierra|sensor de seguridad)|saltar(?:se)?\s+(?:la\s+)?(?:segur|protecci|foto)/i;

  const PROHIBIDO = 'No puentear, anular, quitar ni desactivar fotoceldas, sensores ni otros dispositivos de seguridad.';

  const BASE_POR_OFICIO = {
    automatismos: [
      'Verificar fotoceldas, bordes de seguridad y parada de emergencia antes de operar.',
      PROHIBIDO
    ],
    electricidad: [
      'Cortar energía, comprobar ausencia de tensión y bloquear el circuito antes de intervenir.',
      'No trabajar sobre tableros con olor a quemado o signos de arco sin evaluación de riesgo.'
    ],
    gas: [
      'Si hay olor a gas, ventilar, no generar chispas ni accionar interruptores, y cerrar la llave de paso.',
      'No operar el equipo hasta confirmar hermeticidad.'
    ],
    refrigeracion: [
      'No manipular refrigerante sin recuperación adecuada ni ventilar gas a la atmósfera.',
      'Desenergizar el equipo antes de abrir paneles eléctricos.'
    ],
    taller_motos: [
      'Hay vapores inflamables: no generar chispas ni fumar cerca del tanque o carburador.',
      'Asegurar la moto antes de cualquier prueba de arranque.'
    ],
    plomeria: [
      'Cerrar el suministro de agua antes de abrir tuberías a presión.'
    ],
    solar: [
      'Los circuitos DC pueden permanecer energizados con luz solar. Usar EPP y procedimientos de aislamiento.'
    ],
    cctv: [
      'No desactivar alarmas o sensores de seguridad para “hacer funcionar” el sistema.'
    ],
    linea_blanca: [
      'Desconectar el electrodoméstico de la red antes de inspeccionar partes internas.'
    ],
    metalmecanica: [
      'Usar protección visual y verificar ausencia de gases inflamables antes de soldar.'
    ],
    plagas: [
      'Aplicar solo productos autorizados y ventilar el área. No mezclar químicos sin ficha técnica.'
    ]
  };

  function textoTieneBypass(texto) {
    return BYPASS_RE.test(String(texto || ''));
  }

  function advertencias(texto, oficioId) {
    const out = [];
    const base = BASE_POR_OFICIO[oficioId] || [
      'Aplicar los procedimientos de seguridad del oficio antes de cualquier prueba.'
    ];
    base.forEach((item) => {
      if (out.indexOf(item) === -1) out.push(item);
    });
    if (textoTieneBypass(texto)) {
      out.unshift(
        'Se detectó la intención de puentear o anular un dispositivo de seguridad. Eso no es una solución aceptable: puede causar aplastamiento, incendio o lesión. ' + PROHIBIDO
      );
    }
    if (/energizad|con tensi[oó]n|equipo vivo|circuito vivo/i.test(texto)) {
      out.unshift('Equipo o circuito posiblemente energizado: no intervenir sin comprobar ausencia de tensión, EPP y bloqueo.');
    }
    if (/olor a quemado|humo|chispa|arco el[eé]ctrico/i.test(texto)) {
      out.unshift('Olor a quemado, humo o arco: riesgo de incendio. No reenergizar hasta inspeccionar el circuito.');
    }
    if (/olor a gasolina|fuga de gasolina|vapores?/i.test(texto) && oficioId === 'taller_motos') {
      out.unshift('Olor a gasolina: riesgo de incendio. Ventilar y no generar chispas.');
    }
    if (/olor a gas\b|fuga de gas/i.test(texto)) {
      out.unshift('Posible fuga de gas: ventilar, no encender llamas ni interruptores, cerrar suministro.');
    }
    return out;
  }

  function esPasoInseguro(paso) {
    const t = String(paso || '');
    if (!BYPASS_RE.test(t)) return false;
    if (/no\s+(?:se\s+debe\s+)?(?:puente|anular|quitar|desactivar)|nunca|prohibido/i.test(t)) return false;
    return true;
  }

  global.ArpaIaTecnicaSeguridad = {
    PROHIBIDO,
    textoTieneBypass,
    advertencias,
    esPasoInseguro
  };
})(typeof window !== 'undefined' ? window : globalThis);
