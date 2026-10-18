# ARPA IA INTEGRAL (LAB)

Capa coordinadora. Recibe una intención en lenguaje natural y reutiliza un motor que **ya existe**.

No es un módulo tradicional. No inventa datos. No escribe OT, cotizaciones, clientes ni cuentas de cobro. El oficio configurado en ARPASuite es la fuente de verdad.

## Flujo

```
UI LAB
  → ARPA IA INTEGRAL
  → clasificador local (enum cerrado)
  → motor existente
  → validación
  → respuesta
```

El LLM no clasifica ni es fuente de verdad. Solo puede intervenir después, dentro del motor ya existente (Cotizador, Técnica, Informes, Copiloto).

## Intenciones (enum cerrado)

| Intención | Motor |
|---|---|
| `cotizar` | `ArpaIaCotizador.cotizarDesdeTexto` |
| `diagnosticar` | `ArpaIaTecnica.analizarFalla` |
| `informar` | `ArpaIaInformes.generar` (solo si hay OT suficiente) |
| `consultar` | `ArpaIaCopiloto.consultar` |
| `comercial` | `ArpaIaComercial.analizar` |
| `desconocida` | ninguno — pide aclaración |

## API

```js
const r = ArpaIaIntegral.ejecutar('Necesito cotizar un motor…', {
  oficio: 'automatismos',
  hoy: '2026-09-02',
  historial: [],
  clientes: [],
  ot: null
});
```

```js
{
  ok: true,
  intencion: 'cotizar',
  motor: 'cotizador',
  oficio: 'automatismos',
  datos_disponibles: true,
  resumen: '...',
  aclaracion: '',
  advertencias: [],
  resultado: { /* salida cruda del motor */ },
  fuente: 'local',
  escritura: false
}
```

## Pruebas

```
node js/arpa-ia/integral/integral-tests.mjs
```

## Archivos

| Archivo | Rol |
|---|---|
| `integral-parser.js` | Enum cerrado + sanitización de jailbreak |
| `integral-validacion.js` | Oficio, OT suficiente, no escritura, no diagnóstico confirmado |
| `integral-router.js` | Despacho a motores existentes |
| `integral-api.js` | `ejecutar` / `ejecutarDesdeArpaSuite` |
| `integral-ui.js` | Entrada LAB (no es pantalla administrativa) |
| `integral-tests.mjs` | Casos obligatorios de la FASE 9 |
