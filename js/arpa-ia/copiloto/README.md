# ARPA IA COPILOTO (LAB) — núcleo

Motor local de consultas en lenguaje natural sobre datos que **ya existen** en ARPASuite-LAB.

**Solo laboratorio. Solo lectura.** El motor local es la fuente de verdad. El LLM DEV, si está configurado, solo redacta sobre resultados ya filtrados. Sin WhatsApp ni producción.

## Qué hace

1. Recibe una pregunta.
2. Clasifica la intención (parser local, enum cerrado).
3. Consulta únicamente historial, clientes y borrador de cotización existentes.
4. Arma la respuesta estructurada local.
5. Si hay LLM DEV, redacta solo con ese paquete filtrado y se valida anti-invención.
6. Si falta el dato, no entiende la pregunta o el LLM inventa, responde `NO DISPONIBLE EN LAB` o el resumen local. Nunca inventa.

## Fuentes reales (lectura)

| Fuente | Uso |
|---|---|
| `arpa_suite_servicio_historial` (`ArpaHistorial.getRecords`) | Formatos, cotizaciones, cuentas de cobro |
| `arpa_suite_clientes` (`ArpaHistorial.getClientes`) | Agenda de clientes |
| `arpa_cot_draft` | Borrador de cotización, si existe |
| Oficio ya configurado (`activeOficios` / `ArpaOficios`) | Se reporta; no se cambia ni se infiere otro |

Fecha de servicio: `fecha` → `fechaHoraFinalizacion` → `fechaHoraInicio` → snapshot `formato-fecha` / `cot-fecha` / `fechaEmision`. No usa `savedAt`. Solo `YYYY-MM-DD` válida.

## Intenciones

| Intención | Ejemplo |
|---|---|
| `trabajos_hoy` | ¿Qué trabajos tengo hoy? |
| `trabajos_periodo` | ¿Cuántos trabajos hice este mes? |
| `mantenimientos_proximos` | ¿Qué mantenimientos tengo pendientes? |
| `mantenimientos_vencidos` | ¿Tengo mantenimientos vencidos? |
| `clientes_sin_seguimiento` | ¿Qué clientes llevan más de 6 meses sin servicio? |
| `cotizaciones_pendientes` | ¿Qué cotizaciones están pendientes? |
| `cotizaciones_cerradas` | ¿Qué cotizaciones están cerradas? |
| `cuentas_cobro_pendientes` | ¿Qué cuentas de cobro tengo pendientes? |
| `cliente_historial` | ¿Qué servicios tiene este cliente? |
| `resumen_ventas` | ¿Cuánto vendí este mes? |
| `desconocida` | Si no se puede clasificar. No se inventa intención. |

## API

```js
const r = ArpaIaCopiloto.consultar('¿Qué trabajos tengo hoy?', {
  hoy: '2026-09-02',
  historial: records,
  clientes: clientes,
  oficio: 'automatismos'
});
```

Respuesta:

```js
{
  ok: true,
  intencion: 'trabajos_hoy',
  datos_disponibles: true,
  resultados: [],
  resumen: '...',
  advertencias: []
}
```

No hay `fetch`. No hay API key. No hay escritura (`setItem`, `saveRecords`, etc.).

## Pruebas

```
node js/arpa-ia/copiloto/copiloto-tests.mjs
```

## Archivos

| Archivo | Rol |
|---|---|
| `copiloto-parser.js` | Clasifica la pregunta |
| `copiloto-consultas.js` | Consultas de solo lectura |
| `copiloto-respuesta.js` | Arma el objeto de respuesta y aplica redacción validada |
| `copiloto-llm.js` | Payload controlado, validación y llamada al LLM DEV |
| `copiloto-api.js` | `consultar` / `consultarAsync` / `consultarDesdeArpaSuite` |
| `copiloto-ui.js` | Panel visual (llama `consultarDesdeArpaSuiteAsync`) |
| `copiloto-tests.mjs` | Suite exhaustiva |
