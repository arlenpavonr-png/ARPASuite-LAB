/**
 * Registro de módulos IA activos en LAB.
 * Añadir un panel anual = editar aquí + módulo bajo js/arpa-ia/.
 * No requiere tocar index.html ni service-worker.js.
 */
(function (global) {
  global.ArpaIaRegistry = {
    css: ['./js/arpa-ia/arpa-ia.css'],
    modules: [
      {
        id: 'cotizador',
        slot: 'arpa-ia-slot-cotizacion',
        panel: 'cotizador',
        scripts: [
          './js/arpa-ia/perfiles.js',
          './js/arpa-ia/cotizador-parser.js',
          './js/arpa-ia/cotizador-llm.js',
          './js/arpa-ia/cotizador-api.js',
          './js/arpa-ia/cotizador-catalogo.js',
          './js/arpa-ia/cotizador-matcher.js',
          './js/arpa-ia/cotizador.js',
          './js/arpa-ia/cotizador-config.js',
          './js/arpa-ia/cotizador-ui.js'
        ]
      },
      {
        id: 'tecnica',
        slot: 'arpa-ia-slot-formato',
        panel: 'tecnica',
        scripts: [
          './js/arpa-ia/tecnica/tecnica-parser.js',
          './js/arpa-ia/tecnica/tecnica-seguridad.js',
          './js/arpa-ia/tecnica/tecnica-conocimiento.js',
          './js/arpa-ia/tecnica/tecnica-llm.js',
          './js/arpa-ia/tecnica/tecnica.js',
          './js/arpa-ia/tecnica/tecnica-ui.js'
        ]
      },
      {
        id: 'informes',
        slot: 'arpa-ia-slot-formato',
        panel: 'informes',
        scripts: [
          './js/arpa-ia/informes/informes-parser.js',
          './js/arpa-ia/informes/informes-prompts.js',
          './js/arpa-ia/informes/informes-generador.js',
          './js/arpa-ia/informes/informes-api.js',
          './js/arpa-ia/informes/informes-ui.js'
        ]
      },
      {
        id: 'comercial',
        slot: 'arpa-ia-slot-historial',
        panel: 'comercial',
        scripts: [
          './js/arpa-ia/comercial/comercial-datos.js',
          './js/arpa-ia/comercial/comercial-reglas.js',
          './js/arpa-ia/comercial/comercial-analizador.js',
          './js/arpa-ia/comercial/comercial-api.js',
          './js/arpa-ia/comercial/comercial-ui.js'
        ]
      },
      {
        id: 'prueba',
        slot: 'arpa-ia-slot-historial',
        panel: 'prueba',
        scripts: [
          './js/arpa-ia/nueva-ia-prueba.js'
        ]
      }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
