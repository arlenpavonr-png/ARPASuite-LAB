/**
 * Conocimiento local por oficio. Las causas son hipótesis, nunca diagnóstico confirmado.
 */
(function (global) {
  function s(id, re, texto, tipo) {
    return { id: id, re: re, texto: texto, tipo: tipo || 'afirma' };
  }

  function causa(id, when, hipotesis, pruebas, prioridad) {
    return {
      id: id,
      when: when,
      hipotesis: hipotesis,
      pruebas: pruebas || [],
      prioridad: prioridad == null ? 2 : prioridad
    };
  }

  function hayNegacionInmediata(before) {
    return /(?:^|[^\wáéíóúüñ])(?:no|sin|ning[uú]n[oa]?|tampoco|nunca)(?:\s+\w+){0,5}\s*$/i.test(String(before || ''));
  }

  function algunaMencionAfirmada(texto, re) {
    const src = String(texto || '');
    const flags = re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g';
    const g = new RegExp(re.source, flags);
    let m;
    while ((m = g.exec(src))) {
      const before = src.slice(Math.max(0, m.index - 56), m.index);
      if (!hayNegacionInmediata(before)) return true;
      if (!m[0]) break;
    }
    return false;
  }

  const PREGUNTAS_DEFAULT = {
    tipo_puerta: '¿Qué tipo de puerta es (corrediza, batiente, levadiza u otra)?',
    sintoma_ciclo: '¿La puerta no abre, no cierra, o no responde al control?',
    fotoceldas: '¿Las fotoceldas están limpias, alineadas y sin obstrucción?',
    alimentacion: '¿El motor tiene alimentación eléctrica y de qué voltaje?',
    circuito: '¿Qué circuito o carga falla o dispara el breaker?',
    sintoma: '¿Cuál es el síntoma concreto que observó?',
    tablero: '¿Qué se ve u huele en el tablero (marcas, humedad, quemado)?',
    tipo_equipo: '¿Qué tipo de equipo es (split, nevera, cuarto frío)?',
    capacidad: '¿Cuál es la capacidad en BTU o el modelo?',
    refrigerante: '¿Qué refrigerante usa, si se conoce?',
    marca_modelo: '¿Cuál es la marca, modelo o cilindraje?',
    condiciones: '¿Hay olor a combustible, chispa, o el fallo es en frío o en caliente?',
    equipo: '¿Qué equipo o sistema está fallando?',
    punto: '¿En qué punto está la fuga o el servicio?',
    pieza: '¿Qué pieza o estructura está afectada?',
    plaga: '¿Qué plaga observó?',
    area: '¿Cuál es el área o tipo de inmueble?',
    sistema: '¿Qué parte del sistema falla (cámaras, inversor, DVR)?'
  };

  const GENERIC_SINTOMAS = [
    s('no_funciona', /no funciona|no opera|no enciende|no responde/i, 'El equipo no funciona o no responde'),
    s('ruido', /ruido|ruidoso|zumba|golpetea/i, 'Hay ruido anómalo'),
    s('fuga', /fuga|gotea| derrame/i, 'Se reporta fuga o goteo'),
    s('sobrecalienta', /caliente|sobrecalent|olor a quemado/i, 'Hay calentamiento u olor a quemado')
  ];

  const PERFILES = {
    automatismos: {
      required: [
        { id: 'tipo_puerta', label: 'Tipo de puerta / motor' },
        { id: 'sintoma_ciclo', label: 'Si no abre, no cierra o no responde al control' },
        { id: 'fotoceldas', label: 'Estado de fotoceldas u otros dispositivos de seguridad' },
        { id: 'alimentacion', label: 'Si hay alimentación eléctrica en el motor' }
      ],
      sintomas: [
        s('no_cierra', /no cierra|queda abierta|no baja/i, 'La puerta no cierra', 'ausencia'),
        s('no_abre', /no abre|no sube|no arranca(?:\s+la puerta)?/i, 'La puerta no abre', 'ausencia'),
        s('motor_no_prende', /motor\s+no\s+(?:prende|enciende|arranca)|no\s+prende(?:\s+el\s+motor)?/i, 'El motor no prende', 'ausencia'),
        s('no_responde', /no\s+responde(?:\s+al\s+(?:control|mando|comando|remoto))?/i, 'El equipo no responde al control', 'ausencia'),
        s('sin_ruido', /no\s+(?:hace|produce|tiene|genera)\s+(?:ning[uú]n\s+)?ruido|sin\s+ruido|ning[uú]n\s+ruido|no\s+hay\s+ruido/i, 'No se reporta ruido en el motor', 'ausencia'),
        s('sin_movimiento', /no\s+(?:hace|produce|tiene)\s+(?:ning[uú]n\s+)?(?:ruido\s+ni\s+)?movimiento|sin\s+movimiento|ning[uú]n\s+movimiento|ni\s+movimiento|no\s+se\s+mueve/i, 'No se reporta movimiento', 'ausencia'),
        s('motor_lento', /lento|lentamente|lentitud|poca fuerza|se arrastra|despacio|no tiene fuerza|tarda (?:mucho )?en (?:abrir|cerrar)/i, 'El motor funciona lento o con poca fuerza'),
        s('fotoceldas_sucias', /fotoceldas?\s+est[aá]n\s+sucias|fotoceldas?\s+sucias|suciedad\s+en\s+(?:las\s+)?foto/i, 'Fotoceldas sucias'),
        s('ruido_motor', /(?:motor|puerta|port[oó]n)\s+(?:batiente|corrediza)?\s*(?:hace|produce|tiene|genera)\s+(?:un\s+)?(?:ruido|zumbido)|(?:hace|produce|tiene|genera)\s+(?:un\s+)?ruido\s+(?:fuerte|an[oó]malo)?|ruido\s+fuerte|motor\s+ruidoso|ruido\s+(?:en|del)\s+(?:el\s+)?motor|(?:ruido|zumbido).{0,40}(?:f[ií]sicamente )?(?:del|desde el)\s+motor|proviene f[ií]sicamente del motor/i, 'Hay ruido en la puerta o el motor'),
        s('control_falla', /control(?:\s+remoto)?\s+(?:no funciona|falla)/i, 'El control no funciona', 'ausencia'),
        s('ciclo_incompleto', /cierra a medias|no cierra del todo|reversa|se frena|se va despacio|contin[uú]a lentamente|se detiene.{0,60}(?:antes|faltando)|antes del final de carrera|falt[aá]ndole.{0,30}(?:metro|carrera)|avanza.{0,80}(?:se )?(?:frena|detiene|para)/i, 'El ciclo de cierre es incompleto o se detiene antes del final')
      ],
      causas: [
        causa('fotoceldas', ['fotoceldas_sucias', 'no_cierra'],
          'Fotoceldas sucias, desalineadas u obstruidas (hipótesis, no confirmado).',
          ['Limpiar lentes y verificar alineación de fotoceldas.', 'Probar el ciclo observando el LED de cada fotocelda.', 'Comprobar que no haya reflexión o deslumbramiento.'],
          1),
        causa('alimentacion', ['no_responde', 'control_falla', 'no_abre', 'no_cierra', 'no_funciona', 'motor_no_prende', 'sin_ruido', 'sin_movimiento'],
          'Falta de alimentación eléctrica, fusible o protección disparada (hipótesis, no confirmado).',
          ['Comprobar si hay alimentación eléctrica en el motor y en la central, sin asumir el voltaje.', 'Revisar fusibles y protecciones de la central, sin puentearlas.', 'Verificar que la central reciba tensión antes de abrir la tarjeta.'],
          1),
        causa('mando', ['no_responde', 'control_falla', 'no_funciona', 'sin_movimiento'],
          'Falta de señal de mando o el receptor no recibe el control (hipótesis, no confirmado).',
          ['Probar el control cerca de la central y con otro mando si existe.', 'Comprobar que el receptor reciba la orden, sin afirmar fallo de tarjeta.'],
          2),
        causa('tarjeta', ['no_responde', 'motor_no_prende', 'sin_ruido', 'sin_movimiento'],
          'Posible fallo de tarjeta o lógica de control, solo después de comprobar alimentación y mando (hipótesis, no confirmado).',
          ['Inspección visual de la tarjeta sin afirmar que esté dañada.', 'No sustituir la tarjeta hasta comprobar alimentación, fusibles y mando.'],
          3),
        causa('mecanica', ['ruido_motor', 'ruido', 'motor_lento'],
          'Desgaste o desalineación mecánica (piñón, cremallera, ruedas o guías) (hipótesis, no confirmado).',
          ['Inspeccionar piñón, cremallera y holguras sin forzar el movimiento.', 'Verificar que la hoja recorra libre, sin atascos.'],
          2),
        causa('motor_interno', ['ruido_motor', 'ruido', 'motor_lento'],
          'Falla interna del motor o de su transmisión interna (hipótesis, no confirmado).',
          ['Comprobar consumo y temperatura del motor sin afirmar daño interno.', 'Comparar el ruido con el motor acoplado y desembragado, sin desarmar de inmediato.', 'Verificar que la central entregue orden de cierre y no haya alarma de encoder o final de carrera.'],
          2)
      ],
      procedimiento: [
        'Identificar el tipo de puerta y confirmar que el área esté despejada.',
        'Comprobar dispositivos de seguridad (fotoceldas, bordes, parada) antes de cualquier ciclo.',
        'No puentear, anular ni desactivar fotoceldas u otros dispositivos de seguridad.',
        'Registrar si el síntoma ocurre al abrir, al cerrar o con el control.',
        'Solo entonces realizar las pruebas recomendadas y documentar resultados.'
      ],
      urgencia: function (ids) {
        const has = function (id) { return ids.indexOf(id) !== -1; };
        const hayRuido = (has('ruido_motor') || has('ruido')) && !has('sin_ruido');
        const hayLento = has('motor_lento');
        if (has('no_cierra')) return { nivel: 'alta', motivo: 'Una puerta que no cierra deja el predio expuesto.' };
        if (has('no_abre') || has('motor_no_prende')) return { nivel: 'media', motivo: 'Puede impedir el acceso; no hay indicios de incendio en el texto.' };
        if (has('no_responde') || has('control_falla') || has('sin_movimiento') || has('sin_ruido')) {
          return { nivel: 'media', motivo: 'El equipo no responde; conviene comprobar alimentación, protecciones y mando. No se reportó ruido ni movimiento.' };
        }
        if (hayRuido && hayLento) {
          return { nivel: 'media', motivo: 'Ruido o lentitud sugieren desgaste; conviene diagnosticar antes de forzar ciclos.' };
        }
        if (hayRuido) {
          return { nivel: 'media', motivo: 'El ruido reportado conviene diagnosticarlo antes de forzar ciclos.' };
        }
        if (hayLento) {
          return { nivel: 'media', motivo: 'La lentitud reportada conviene diagnosticarla antes de forzar ciclos.' };
        }
        return { nivel: 'media', motivo: 'Hay síntomas, pero no se describió un riesgo inmediato de lesión o incendio.' };
      }
    },
    electricidad: {
      required: [
        { id: 'circuito', label: 'Circuito o carga que falla' },
        { id: 'sintoma', label: 'Si dispara breaker, no hay tensión u olor a quemado' },
        { id: 'tablero', label: 'Estado visible del tablero (marcas, olor, humedad)' }
      ],
      sintomas: [
        s('breaker_dispara', /breaker|t[eé]rmico|interruptor.+(?:dispara|salta|tumba)|se dispara/i, 'El breaker se dispara'),
        s('olor_quemado', /olor a quemado|humo|quemad/i, 'Hay olor a quemado'),
        s('sin_tension', /no hay (?:corriente|tensi[oó]n|luz)|sin energ[ií]a/i, 'No hay tensión'),
        s('chispa', /chispa|arco/i, 'Hay chispas o arco'),
        s('calentamiento', /cable caliente|tablero caliente|sobrecalent/i, 'Hay calentamiento')
      ],
      causas: [
        causa('sobrecarga_corto', ['breaker_dispara', 'olor_quemado', 'chispa'],
          'Sobrecarga, falso contacto o principio de cortocircuito en el circuito (hipótesis, no confirmado).',
          ['No reenergizar si hay olor a quemado.', 'Inspección visual del tablero con circuitos desenergizados.', 'Medir continuidad e aislamiento del circuito afectado.', 'Identificar la carga que dispara (p. ej. aire) y su corriente nominal.']),
        causa('conexion', ['calentamiento', 'olor_quemado', 'breaker_dispara'],
          'Conexión floja o conductor subdimensionado (hipótesis, no confirmado).',
          ['Revisar apriete de bornes con ausencia de tensión.', 'Verificar calibre vs. protección, sin sustituir el breaker por uno mayor “para que no salte”.'])
      ],
      procedimiento: [
        'Tratar el tablero como riesgoso si hay olor a quemado: no reenergizar a ciegas.',
        'Cortar energía, verificar ausencia de tensión y bloquear el circuito.',
        'Inspección visual: coloración, bornes, humedad, olores.',
        'Medir y documentar; no puentear protecciones ni anular la tierra.',
        'Restablecer solo cuando la causa probable esté acotada por medición.'
      ],
      urgencia: function (ids) {
        if (ids.indexOf('olor_quemado') !== -1 || ids.indexOf('chispa') !== -1) {
          return { nivel: 'critica', motivo: 'Olor a quemado o arco indican riesgo de incendio.' };
        }
        if (ids.indexOf('breaker_dispara') !== -1) {
          return { nivel: 'alta', motivo: 'Disparo repetido puede ocultar un fallo activo.' };
        }
        return { nivel: 'media', motivo: 'Falla eléctrica descrita sin signos de incendio en el texto.' };
      }
    },
    refrigeracion: {
      required: [
        { id: 'tipo_equipo', label: 'Tipo de equipo (split, nevera, cuarto frío)' },
        { id: 'capacidad', label: 'Capacidad (BTU) o modelo' },
        { id: 'sintoma', label: 'Si no enfría, congela, fuga o ruído de compresor' },
        { id: 'refrigerante', label: 'Tipo de refrigerante, si se conoce' }
      ],
      sintomas: [
        s('no_enfria', /no enfr[ií]a|no refriger|sale aire caliente/i, 'El equipo no enfría'),
        s('evaporador_congela', /evaporador\s+se\s+congela|congel(?:a|ado)|escarcha/i, 'El evaporador se congela o hay escarcha'),
        s('fuga_ref', /fuga\s+de\s+(?:gas|refrigerante)/i, 'Posible fuga de refrigerante mencionada'),
        s('compresor_ruido', /compresor.+(?:ruido|no arranca)|no arranca el compresor/i, 'El compresor no arranca o hace ruido')
      ],
      causas: [
        causa('bajo_refrigerante', ['no_enfria', 'evaporador_congela', 'fuga_ref'],
          'Bajo nivel de refrigerante o restricción de flujo (hipótesis, no confirmado).',
          ['Medir presiones y sobrecalentamiento con manómetro, sin recargar a ciegas.', 'Buscar indicios de fuga (aceite, detector), sin ventilar gas a la atmósfera.', 'Verificar filtro/serpentín sucio como causa alternativa de congelamiento.']),
        causa('flujo_aire', ['no_enfria', 'evaporador_congela'],
          'Filtro sucio, ventilador detenido o retorno de aire insuficiente (hipótesis, no confirmado).',
          ['Inspeccionar filtro y flujo de aire en evaporador y condensador.', 'Comprobar que el ventilador del evaporador gire libre.'])
      ],
      procedimiento: [
        'Identificar equipo y síntoma (no enfría, congela, ruido) sin abrir el circuito frigorífico de inmediato.',
        'Desenergizar antes de abrir paneles eléctricos.',
        'Revisar flujo de aire y suciedad; luego mediciones de refrigeración si aplica.',
        'No recargar refrigerante sin diagnóstico de presiones y sin recuperar gas residual.',
        'Documentar lecturas; no afirmar fuga o carga hasta medir.'
      ],
      urgencia: function (ids) {
        if (ids.indexOf('fuga_ref') !== -1) return { nivel: 'alta', motivo: 'Una fuga mencionada requiere contención y no recarga a ciegas.' };
        if (ids.indexOf('no_enfria') !== -1) return { nivel: 'media', motivo: 'Pérdida de refrigeración; no se describió riesgo inmediato de incendio.' };
        return { nivel: 'media', motivo: 'Síntomas de refrigeración sin evento crítico descrito.' };
      }
    },
    taller_motos: {
      required: [
        { id: 'marca_modelo', label: 'Marca, modelo o cilindraje' },
        { id: 'sintoma', label: 'Síntoma (no arranca, se apaga, ruido, frenos)' },
        { id: 'condiciones', label: 'Si hay olor a combustible, chispa o arranque en frío/caliente' }
      ],
      sintomas: [
        s('no_arranca', /no arranca|no prende|no enciende/i, 'La moto no arranca'),
        s('olor_gasolina', /olor a gasolina|huele a gasolina|fuga de gasolina/i, 'Hay olor a gasolina'),
        s('se_apaga', /se apaga|se ahoga/i, 'Se apaga o se ahoga'),
        s('ruido_motor', /ruido\s+(?:en\s+el\s+)?motor|golpeteo/i, 'Hay ruido en el motor')
      ],
      causas: [
        causa('combustible', ['no_arranca', 'olor_gasolina', 'se_apaga'],
          'Exceso de combustible (ahogada), carburador sucio o fuga menor (hipótesis, no confirmado).',
          ['Ventilar y comprobar que no haya derrame antes de arrancar.', 'Revisar nivel de flotador / inyección sin generar chispas cerca del tanque.', 'Confirmar chispa y compresión como causas alternativas, sin afirmar cuál es.']),
        causa('ignicion', ['no_arranca'],
          'Falta de chispa (bujía, bobina, kill switch) (hipótesis, no confirmado).',
          ['Inspeccionar bujía y conexión, con precaución por combustible.', 'Verificar interruptor de parada y caballete si aplica.'])
      ],
      procedimiento: [
        'Inmovilizar la moto y ventilar si hay olor a gasolina.',
        'No generar chispas ni fumar cerca del tanque o carburador.',
        'Comprobar combustible, aire y chispa por separado; no sustituir piezas hasta acotar.',
        'Registrar kilometraje y síntoma; pedir más datos si el arranque no está descrito con detalle.'
      ],
      urgencia: function (ids) {
        if (ids.indexOf('olor_gasolina') !== -1) {
          return { nivel: 'alta', motivo: 'Vapores de gasolina: riesgo de incendio si se intenta arrancar sin ventilar.' };
        }
        if (ids.indexOf('no_arranca') !== -1) return { nivel: 'media', motivo: 'No arranca; el riesgo depende de fugas o frenos, no descritos como críticos.' };
        return { nivel: 'media', motivo: 'Falla de taller descrita sin evento de seguridad extrema.' };
      }
    },
    gas: {
      required: [
        { id: 'sintoma', label: 'Olor, llama irregular o equipo que no enciende' },
        { id: 'equipo', label: 'Equipo o tramo de tubería afectado' }
      ],
      sintomas: [
        s('olor_gas', /olor a gas|huele a gas|fuga de gas/i, 'Hay olor a gas'),
        s('no_enciende', /no enciende|no prende/i, 'El equipo no enciende'),
        s('llama', /llama amarilla|se apaga la llama/i, 'La llama es irregular o se apaga')
      ],
      causas: [
        causa('fuga', ['olor_gas'],
          'Fuga o mala hermeticidad (hipótesis, no confirmado).',
          ['Cerrar llave de paso y ventilar.', 'Prueba de hermeticidad; no buscar fugas con llama.'])
      ],
      procedimiento: [
        'Ante olor a gas: ventilar, no chispas, cerrar suministro.',
        'No operar el equipo hasta prueba de hermeticidad.',
        'Documentar; no afirmar el punto de fuga sin medición.'
      ],
      urgencia: function (ids) {
        if (ids.indexOf('olor_gas') !== -1) return { nivel: 'critica', motivo: 'Olor a gas implica riesgo de explosión.' };
        return { nivel: 'media', motivo: 'Falla de gas sin olor de fuga descrito.' };
      }
    },
    cctv: {
      required: [
        { id: 'sistema', label: 'Cámaras, DVR/NVR o alarma' },
        { id: 'sintoma', label: 'Sin imagen, sin grabación o sensor en falla' }
      ],
      sintomas: [
        s('sin_imagen', /sin imagen|no hay video|pantalla negra/i, 'No hay imagen'),
        s('no_graba', /no graba|no grabaci[oó]n/i, 'No graba')
      ],
      causas: [
        causa('alimentacion_red', ['sin_imagen', 'no_graba'],
          'Alimentación, cableado o configuración del grabador (hipótesis, no confirmado).',
          ['Verificar PoE/fuente y enlace de red.', 'Revisar disco y canales sin desactivar la alarma para “hacerlo andar”.'])
      ],
      procedimiento: [
        'Identificar si falla una cámara o todo el sistema.',
        'No desactivar sensores de seguridad para forzar operación.',
        'Probar alimentación y grabación; documentar.'
      ],
      urgencia: function () {
        return { nivel: 'media', motivo: 'Falla de vigilancia; el recinto puede quedar sin registro.' };
      }
    },
    plomeria: {
      required: [
        { id: 'punto', label: 'Punto de la fuga o del servicio' },
        { id: 'sintoma', label: 'Fuga, baja presión o tapón' }
      ],
      sintomas: [
        s('fuga_agua', /fuga de agua|gotea|chorro/i, 'Hay fuga de agua'),
        s('sin_presion', /sin presi[oó]n|no sale agua/i, 'No hay presión o no sale agua')
      ],
      causas: [
        causa('junta', ['fuga_agua'],
          'Junta, empaque o tubería dañada (hipótesis, no confirmado).',
          ['Cerrar el suministro e inspeccionar el tramo visible.', 'No afirmar el punto exacto sin ver el origen.'])
      ],
      procedimiento: [
        'Cerrar agua. Localizar el origen visible.',
        'No abrir tramos a presión. Documentar materiales vistos.'
      ],
      urgencia: function (ids) {
        if (ids.indexOf('fuga_agua') !== -1) return { nivel: 'alta', motivo: 'Una fuga activa puede causar daños al inmueble.' };
        return { nivel: 'media', motivo: 'Falla hidráulica sin inundación descrita.' };
      }
    },
    metalmecanica: {
      required: [
        { id: 'pieza', label: 'Pieza o estructura afectada' },
        { id: 'sintoma', label: 'Fisura, holgura, corrosión o desalineación' }
      ],
      sintomas: [
        s('fisura', /fisura|grieta|roto|quebr/i, 'Hay fisura o rotura'),
        s('holgura', /holgura|flojo|desalinead/i, 'Hay holgura o desalineación')
      ],
      causas: [
        causa('fatiga', ['fisura', 'holgura'],
          'Fatiga, corrosión o soldadura insuficiente (hipótesis, no confirmado).',
          ['Inspección visual de cordones y anclajes.', 'No cargar la estructura hasta evaluar.'])
      ],
      procedimiento: [
        'Asegurar la pieza. Inspeccionar soldaduras y anclajes.',
        'No afirmar causa de fatiga sin evidencia visual documentada.'
      ],
      urgencia: function (ids) {
        if (ids.indexOf('fisura') !== -1) return { nivel: 'alta', motivo: 'Una fisura estructural puede agravar la falla.' };
        return { nivel: 'media', motivo: 'Defecto mecánico descrito sin colapso inminente.' };
      }
    },
    plagas: {
      required: [
        { id: 'plaga', label: 'Tipo de plaga observada' },
        { id: 'area', label: 'Área o tipo de inmueble' }
      ],
      sintomas: [
        s('plaga_visible', /cucaracha|roedor|comej[eé]n|hormiga|plaga/i, 'Se observa plaga'),
        s('infestacion', /infestaci[oó]n|muchos|plagado/i, 'Se describe infestación')
      ],
      causas: [
        causa('acceso', ['plaga_visible', 'infestacion'],
          'Puntos de acceso, humedad o alimento disponible (hipótesis, no confirmado).',
          ['Inspeccionar cocina, desagües y rendijas.', 'Identificar especie antes de aplicar producto.'])
      ],
      procedimiento: [
        'Identificar especie y foco. No mezclar productos.',
        'Ventilar y seguir ficha técnica. Pedir área y tipo de inmueble si faltan.'
      ],
      urgencia: function () {
        return { nivel: 'media', motivo: 'Control de plagas; urgencia sanitaria depende de la especie, no confirmada.' };
      }
    },
    linea_blanca: {
      required: [
        { id: 'equipo', label: 'Electrodoméstico (lavadora, nevera, estufa)' },
        { id: 'sintoma', label: 'Falla concreta (no centrifuga, no enfría, no enciende)' }
      ],
      sintomas: [
        s('no_centrifuga', /no centrifug/i, 'No centrifuga'),
        s('no_enfria', /no enfr[ií]a/i, 'No enfría'),
        s('no_enciende', /no enciende|no prende/i, 'No enciende')
      ],
      causas: [
        causa('uso_componente', ['no_centrifuga', 'no_enfria', 'no_enciende'],
          'Componente electromecánico o sensor en falla (hipótesis, no confirmado).',
          ['Desconectar de la red antes de abrir.', 'Reproducir el síntoma y acotar sin sustituir piezas a ciegas.'])
      ],
      procedimiento: [
        'Desconectar el equipo. Identificar modelo y síntoma.',
        'No puentear termostatos ni protecciones térmicas.',
        'Pedir códigos de error si el equipo los muestra.'
      ],
      urgencia: function () {
        return { nivel: 'media', motivo: 'Electrodoméstico fuera de servicio; no se describió fuga de gas ni incendio.' };
      }
    },
    solar: {
      required: [
        { id: 'sistema', label: 'Paneles, inversor o baterías' },
        { id: 'sintoma', label: 'Sin generación, alarma de inversor o batería' }
      ],
      sintomas: [
        s('sin_generacion', /no genera|sin producci[oó]n|cero (?:kw|watts)/i, 'No hay generación'),
        s('alarma_inversor', /inversor.+(?:alarma|error|falla)|error en el inversor/i, 'Alarma o error de inversor')
      ],
      causas: [
        causa('dc_ac', ['sin_generacion', 'alarma_inversor'],
          'Sombreado, string abierto, inversor o aislamiento DC (hipótesis, no confirmado).',
          ['Medir Voc de strings con EPP y procedimientos DC.', 'Leer códigos del inversor antes de sustituir equipos.'])
      ],
      procedimiento: [
        'Tratar DC como energizado con luz solar.',
        'No puentear protecciones ni fusibles de string.',
        'Documentar códigos de inversor y condiciones de irradiancia.'
      ],
      urgencia: function () {
        return { nivel: 'media', motivo: 'Pérdida de generación; riesgo eléctrico si se interviene DC sin aislamiento.' };
      }
    }
  };

  GENERIC_SINTOMAS.forEach(function (item) {
    Object.keys(PERFILES).forEach(function (id) {
      const list = PERFILES[id].sintomas;
      if (!list.some(function (x) { return x.id === item.id; })) list.push(item);
    });
  });

  function perfil(oficioId) {
    return PERFILES[oficioId] || {
      required: [
        { id: 'equipo', label: 'Equipo o sistema afectado' },
        { id: 'sintoma', label: 'Síntoma concreto observado' }
      ],
      sintomas: GENERIC_SINTOMAS,
      causas: [
        causa('generica', ['no_funciona', 'ruido', 'fuga', 'sobrecalienta'],
          'Falla en el sistema descrito; se requiere más detalle del oficio para acotar (hipótesis, no confirmado).',
          ['Inspección visual y de seguridad.', 'Pedir marca, modelo y cuándo ocurre la falla.'])
      ],
      procedimiento: [
        'Confirmar el oficio seleccionado y no cambiarlo.',
        'Pedir datos faltantes antes de afirmar una causa.',
        'No puentear ni anular dispositivos de seguridad.'
      ],
      urgencia: function () {
        return { nivel: 'indeterminada', motivo: 'No hay un perfil detallado ni síntomas suficientes para graduar urgencia.' };
      }
    };
  }

  function detectarSintomas(texto, oficioId) {
    const p = perfil(oficioId);
    const found = [];
    const raw = String(texto || '');
    (p.sintomas || []).forEach(function (rule) {
      if (rule.re) rule.re.lastIndex = 0;
      const ok = rule.tipo === 'ausencia'
        ? rule.re.test(raw)
        : algunaMencionAfirmada(raw, rule.re);
      if (rule.re) rule.re.lastIndex = 0;
      if (ok) found.push({ id: rule.id, texto: rule.texto, fuente: 'hecho' });
    });
    return found;
  }

  function hipotesisYPruebas(sintomaIds, oficioId) {
    const p = perfil(oficioId);
    const hipotesis = [];
    const pruebas = [];
    const seenC = {};
    const seenP = {};
    const hayRuido = (sintomaIds || []).some(function (id) {
      return id === 'ruido_motor' || id === 'ruido' || id === 'motor_lento';
    });
    (p.causas || []).forEach(function (c) {
      const hit = (c.when || []).some(function (id) { return sintomaIds.indexOf(id) !== -1; });
      if (!hit || seenC[c.id]) return;
      if (c.id === 'mecanica' && !hayRuido) return;
      seenC[c.id] = true;
      const hits = (c.when || []).filter(function (id) { return sintomaIds.indexOf(id) !== -1; }).length;
      const base = typeof c.prioridad === 'number' ? c.prioridad : 2;
      hipotesis.push({
        id: c.id,
        texto: c.hipotesis,
        tipo: 'hipotesis',
        confirmado: false,
        prioridad: hits >= 2 ? Math.max(1, base - 1) : base
      });
      (c.pruebas || []).forEach(function (t) {
        if (seenP[t]) return;
        seenP[t] = true;
        pruebas.push(t);
      });
    });
    hipotesis.sort(function (a, b) { return (a.prioridad || 9) - (b.prioridad || 9); });
    return { hipotesis: hipotesis, pruebas: pruebas };
  }

  function datosFaltantes(hechos, sintomas, oficioId) {
    const p = perfil(oficioId);
    const ids = {};
    (hechos || []).forEach(function (h) { ids[h.id] = true; });
    const out = [];
    (p.required || []).forEach(function (req) {
      if (req.id === 'sintoma' || req.id === 'sintoma_ciclo' || req.id === 'sintoma_principal') {
        if (sintomas && sintomas.length) return;
      }
      if (req.id === 'tipo_puerta' && ids.tipo_puerta) return;
      if (req.id === 'tipo_equipo' && (ids.tipo_equipo || ids.tipo_puerta)) return;
      if (req.id === 'capacidad' && ids.btu) return;
      if (req.id === 'marca_modelo' && (ids.marca || ids.cilindraje)) return;
      if (req.id === 'fotoceldas' && ids.dispositivo_seguridad) return;
      if (req.id === 'tablero' && ids.ubicacion) return;
      if (req.id === 'circuito' && (ids.tipo_equipo || ids.amperaje)) return;
      if (req.id === 'equipo' && (ids.tipo_equipo || ids.tipo_puerta || ids.marca)) return;
      if (req.id === 'condiciones' && ids.marca && sintomas && sintomas.length) {
        const hasOlor = sintomas.some(function (s) { return s.id === 'olor_gasolina'; });
        if (hasOlor) return;
      }
      if (ids[req.id]) return;
      out.push(req.label);
    });
    return out;
  }

  function preguntaDe(req) {
    if (!req) return '';
    if (req.pregunta) return req.pregunta;
    return PREGUNTAS_DEFAULT[req.id] || ('¿Cuál es el dato de «' + req.label + '»?');
  }

  function preguntas(hechos, sintomas, oficioId) {
    const p = perfil(oficioId);
    const faltantes = datosFaltantes(hechos, sintomas, oficioId);
    const byLabel = {};
    (p.required || []).forEach(function (req) { byLabel[req.label] = req; });
    return faltantes.map(function (label) {
      const req = byLabel[label] || { id: label, label: label };
      return { id: req.id, pregunta: preguntaDe(req) };
    });
  }

  function procedimiento(oficioId) {
    return (perfil(oficioId).procedimiento || []).slice();
  }

  function urgencia(sintomaIds, oficioId, insuficiente) {
    if (insuficiente) {
      return { nivel: 'indeterminada', motivo: 'Información insuficiente para evaluar urgencia.' };
    }
    const fn = perfil(oficioId).urgencia;
    if (typeof fn === 'function') return fn(sintomaIds);
    return { nivel: 'indeterminada', motivo: 'No se pudo evaluar la urgencia.' };
  }

  function esSintomaEspecifico(item) {
    return item && item.id !== 'no_funciona';
  }

  const EV_OK = 'confirmado_ok';
  const EV_FALLA = 'confirmado_falla';
  const EV_DESC = 'desconocido';

  function foldEv(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function lastEstado(text, okRe, failRe) {
    const src = String(text || '');
    let pos = -1;
    let estado = EV_DESC;
    function mark(re, next) {
      if (!re) return;
      const flags = re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g';
      const g = new RegExp(re.source, flags);
      let m;
      while ((m = g.exec(src))) {
        if (m.index >= pos) {
          pos = m.index;
          estado = next;
        }
        if (!m[0]) break;
      }
    }
    mark(failRe, EV_FALLA);
    mark(okRe, EV_OK);
    return { estado: estado, hallado: pos >= 0 };
  }

  function partirTextoEvidencia(texto) {
    const src = String(texto || '');
    const idx = src.search(/respuestas del t[eé]cnico/i);
    if (idx < 0) return { general: src, respuestas: '' };
    return { general: src.slice(0, idx), respuestas: src.slice(idx) };
  }

  function estadoCheck(partes, okRe, failRe) {
    const fromAns = lastEstado(partes.respuestas, okRe, failRe);
    if (fromAns.hallado) return { estado: fromAns.estado, fuente: 'respuestas' };
    const fromGen = lastEstado(partes.general, okRe, failRe);
    if (fromGen.hallado) return { estado: fromGen.estado, fuente: 'general' };
    return { estado: EV_DESC, fuente: '' };
  }

  function extraerEvidencia(texto) {
    const partes = partirTextoEvidencia(texto);
    const foto = estadoCheck(
      partes,
      /fotoceldas?.{0,48}(limpias?|alinead|sin obstrucci)|limpias? y alinead/i,
      /fotoceldas?.{0,36}(sucias|desalinead|obstruid)|suciedad.{0,20}foto/i
    );
    const ali = estadoCheck(
      partes,
      /alimentaci[oó]n.{0,40}(s[ií]|estables?|correcta|presente|ok\b)|s[ií],?\s*\d{2,3}\s*v|\d{2,3}\s*v(?:oltios?)?\s+estables?/i,
      /sin alimentaci|no hay (?:tensi[oó]n|corriente|alimentaci)|falta (?:de )?alimentaci/i
    );
    const ten = estadoCheck(
      partes,
      /tensi[oó]n.{0,50}(?:al|en el)\s+motor|llega tensi[oó]n al motor|hay tensi[oó]n en el motor|\d{2,3}\s*v.{0,40}durante.{0,20}cierre|durante (?:el |la )?(?:intento de |la orden de )?cierre/i,
      /no (?:llega|hay) tensi[oó]n.{0,20}(?:al|en el) motor/i
    );
    const cap = estadoCheck(
      partes,
      /capacitor.{0,60}(nominal|dentro|correcto|en rango|ok\b)|dentro del valor nominal/i,
      /capacitor.{0,40}(abierto|seco|hinchado|fuera|malo|da[nñ]ad)/i
    );
    const des = estadoCheck(
      partes,
      /desbloqueo.{0,80}(asegurado|acoplad|normal)|queda completamente asegurado/i,
      /desbloqueo.{0,40}(flojo|no (?:queda )?asegurado|suelto)/i
    );
    const tra = estadoCheck(
      partes,
      /(?:pi[nñ][oó]n|cremallera).{0,50}(normal|contacto normal)|contacto normal/i,
      /(?:pi[nñ][oó]n|cremallera).{0,40}(sin contacto|desalinead|holgura|desgast)/i
    );
    const ev = {
      fotoceldas: foto.estado,
      fotoceldasFuente: foto.fuente,
      alimentacion: ali.estado,
      alimentacionFuente: ali.fuente,
      tension_motor: ten.estado,
      capacitor: cap.estado,
      desbloqueo: des.estado,
      transmision: tra.estado,
      ruido_origen: EV_DESC
    };
    const packed = partes.respuestas + '\n' + partes.general;
    if (/(?:ruido|zumbido).{0,40}(?:f[ií]sicamente )?(?:del|desde el)\s+motor|proviene f[ií]sicamente del motor/i.test(packed)) {
      ev.ruido_origen = 'motor';
    }
    return ev;
  }

  function foldCausa(causa) {
    return foldEv((causa && (causa.id + ' ' + (causa.texto || ''))) || '');
  }

  function contradiceEvidencia(causa, ev) {
    if (!causa || !ev) return false;
    const id = String(causa.id || '').toLowerCase();
    const t = foldCausa(causa);
    if (ev.fotoceldas === EV_OK && (id === 'fotoceldas' || /fotoceldas? (sucias|desalinead|obstruid)/.test(t))) {
      return true;
    }
    if ((ev.alimentacion === EV_OK || ev.tension_motor === EV_OK) &&
        (id === 'alimentacion' || /falta de alimentacion|sin alimentacion|fusible o proteccion disparada/.test(t))) {
      return true;
    }
    if (ev.capacitor === EV_OK && /capacitor/.test(t) && /falla|fuera|abierto|hinchado|da[nñ]/.test(t)) {
      return true;
    }
    if (ev.tension_motor === EV_OK && (id === 'mando' || /falta de senal de mando|receptor no recibe/.test(t))) {
      return true;
    }
    if (ev.transmision === EV_OK && ev.desbloqueo === EV_OK &&
        (id === 'mecanica' || /atasco mecanico|desalineacion mecanica/.test(t))) {
      return true;
    }
    if (ev.transmision === EV_OK && (id === 'mecanica' || (/pinon|cremallera/.test(t) && /desgaste o desalineacion/.test(t)))) {
      return true;
    }
    return false;
  }

  function ajustarPrioridad(causa, ev) {
    if (!causa) return;
    const id = String(causa.id || '').toLowerCase();
    const t = foldCausa(causa);
    let p = typeof causa.prioridad === 'number' ? causa.prioridad : 2;
    if (ev.ruido_origen === 'motor' && (id === 'motor_interno' || /falla interna del motor|transmision interna/.test(t))) {
      p = 1;
    }
    if (ev.fotoceldas === EV_OK && ev.alimentacion === EV_OK && (id === 'tarjeta' || /fallo de tarjeta|logica de control/.test(t))) {
      p = Math.min(p, 2);
    }
    causa.prioridad = p;
    causa.tipo = 'hipotesis';
    causa.confirmado = false;
    if (causa.texto && !/hip[oó]tesis|no confirmado/i.test(causa.texto)) {
      causa.texto = String(causa.texto).replace(/\.?\s*$/, '') + ' (hipótesis, no confirmado).';
    }
  }

  function pruebaYaComprobada(texto, ev) {
    const t = foldEv(texto);
    if (ev.fotoceldas === EV_OK && /fotoceld|lentes y verificar alineaci|led de cada fotocelda|reflexion o deslumbramiento/.test(t)) {
      return true;
    }
    if ((ev.alimentacion === EV_OK || ev.tension_motor === EV_OK) &&
        /alimentacion electrica en el motor|fusibles y protecciones|central reciba tension|comprobar alimentacion del/.test(t)) {
      return true;
    }
    if (ev.capacitor === EV_OK && /capacitor/.test(t)) return true;
    if (ev.transmision === EV_OK && /inspeccionar pinon|pinon, cremallera y holguras|recorra libre|sin atascos/.test(t)) return true;
    return false;
  }

  function preguntaYaResuelta(item, ev) {
    const id = String((item && item.id) || '').toLowerCase();
    const q = foldEv((item && (item.pregunta || item.texto || item)) || '');
    if (id === 'fotoceldas' || /fotoceld/.test(q)) {
      return ev.fotoceldas === EV_OK || ev.fotoceldasFuente === 'respuestas';
    }
    if (id === 'alimentacion' || /alimentaci/.test(q) || /110 o 220/.test(q)) {
      return ev.alimentacion === EV_OK || ev.tension_motor === EV_OK || ev.alimentacionFuente === 'respuestas';
    }
    return false;
  }

  function faltanteResuelto(label, ev, hechos) {
    const t = foldEv(label);
    const ids = {};
    (hechos || []).forEach(function (h) { if (h && h.id) ids[h.id] = true; });
    if (/fotoceld/.test(t) && (ev.fotoceldas !== EV_DESC || ids.fotoceldas || ids.dispositivo_seguridad)) return true;
    if (/alimentaci|voltaje/.test(t) && (ev.alimentacion !== EV_DESC || ev.tension_motor === EV_OK || ids.voltaje || ids.alimentacion)) {
      return true;
    }
    return false;
  }

  function hechosDesdeEvidencia(ev) {
    const facts = [];
    function push(id, label, valor) {
      facts.push({ id: id, label: label, valor: valor, fuente: 'evidencia' });
    }
    if (ev.fotoceldas === EV_OK) push('fotoceldas', 'Fotoceldas', 'limpias y alineadas (técnico)');
    if (ev.fotoceldas === EV_FALLA) push('fotoceldas', 'Fotoceldas', 'sucias o desalineadas (técnico)');
    if (ev.alimentacion === EV_OK) push('alimentacion', 'Alimentación', 'presente y estable (técnico)');
    if (ev.tension_motor === EV_OK) push('tension_motor', 'Tensión en motor', 'llega durante la orden de cierre (técnico)');
    if (ev.capacitor === EV_OK) push('capacitor', 'Capacitor', 'dentro de valor nominal (técnico)');
    if (ev.desbloqueo === EV_OK) push('desbloqueo', 'Desbloqueo manual', 'queda asegurado al acoplar (técnico)');
    if (ev.transmision === EV_OK) push('transmision', 'Piñón / cremallera', 'contacto normal (técnico)');
    if (ev.ruido_origen === 'motor') push('ruido_origen', 'Origen del ruido', 'proviene físicamente del motor (técnico)');
    return facts;
  }

  function mergeHechos(base, extra) {
    const out = Array.isArray(base) ? base.slice() : [];
    (extra || []).forEach(function (h) {
      if (!h) return;
      if (out.some(function (x) { return x && x.id === h.id; })) return;
      out.push(h);
    });
    return out;
  }

  function causaDesdePerfil(oficioId, id) {
    const def = (perfil(oficioId).causas || []).filter(function (c) { return c.id === id; })[0];
    if (!def) return null;
    return {
      id: def.id,
      texto: def.hipotesis,
      tipo: 'hipotesis',
      confirmado: false,
      prioridad: def.prioridad == null ? 2 : def.prioridad
    };
  }

  function aplicarEvidenciaAResultado(result) {
    if (!result) return result;
    try {
      result = JSON.parse(JSON.stringify(result));
    } catch (err) { /* se trabaja sobre el objeto recibido */ }
    const ev = extraerEvidencia(result.solicitud_original || '');
    result.sintomas = (result.sintomas || []).filter(function (s) {
      return !(s && s.id === 'fotoceldas_sucias' && ev.fotoceldas === EV_OK);
    });
    result.datos_conocidos = mergeHechos(result.datos_conocidos, hechosDesdeEvidencia(ev));
    let hip = (result.posibles_causas || []).filter(function (c) { return !contradiceEvidencia(c, ev); });
    const ids = {};
    hip.forEach(function (c) { if (c && c.id) ids[c.id] = true; });
    const idsSintoma = (result.sintomas || []).map(function (s) { return s && s.id; });
    const hayRuido = idsSintoma.indexOf('ruido_motor') >= 0 || idsSintoma.indexOf('ruido') >= 0 || ev.ruido_origen === 'motor';
    if (hayRuido && !ids.motor_interno && !contradiceEvidencia({ id: 'motor_interno', texto: 'motor interno' }, ev)) {
      const extra = causaDesdePerfil(result.oficio_id, 'motor_interno');
      if (extra) {
        hip.push(extra);
        ids.motor_interno = true;
      }
    }
    const hayCierre = idsSintoma.indexOf('no_cierra') >= 0 || idsSintoma.indexOf('ciclo_incompleto') >= 0;
    if (hayCierre && ev.fotoceldas === EV_OK && (ev.alimentacion === EV_OK || ev.tension_motor === EV_OK) &&
        !ids.tarjeta && !contradiceEvidencia({ id: 'tarjeta', texto: 'logica de control' }, ev)) {
      const extraT = causaDesdePerfil(result.oficio_id, 'tarjeta');
      if (extraT) hip.push(extraT);
    }
    hip.forEach(function (c) { ajustarPrioridad(c, ev); });
    hip.sort(function (a, b) { return (a.prioridad || 9) - (b.prioridad || 9); });
    result.posibles_causas = hip;
    result.causa_confirmada = false;

    const seenP = {};
    const pruebas = [];
    const p = perfil(result.oficio_id);
    hip.forEach(function (h) {
      const def = (p.causas || []).filter(function (c) { return c.id === h.id; })[0];
      (def && def.pruebas ? def.pruebas : []).forEach(function (t) {
        if (!t || seenP[t] || pruebaYaComprobada(t, ev)) return;
        seenP[t] = true;
        pruebas.push(t);
      });
    });
    (result.pruebas_recomendadas || []).forEach(function (t) {
      if (!t || seenP[t] || pruebaYaComprobada(t, ev)) return;
      seenP[t] = true;
      pruebas.push(t);
    });
    result.pruebas_recomendadas = pruebas;
    result.datos_faltantes = (result.datos_faltantes || []).filter(function (label) {
      return !faltanteResuelto(label, ev, result.datos_conocidos);
    });
    result.preguntas = (result.preguntas || []).filter(function (q) {
      return !preguntaYaResuelta(q, ev);
    });
    return result;
  }

  global.ArpaIaTecnicaConocimiento = {
    PERFILES,
    perfil,
    detectarSintomas,
    hipotesisYPruebas,
    datosFaltantes,
    preguntas,
    procedimiento,
    urgencia,
    esSintomaEspecifico,
    extraerEvidencia,
    aplicarEvidenciaAResultado
  };
})(typeof window !== 'undefined' ? window : globalThis);
