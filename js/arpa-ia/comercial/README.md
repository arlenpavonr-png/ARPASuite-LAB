# ARPA IA COMERCIAL (LAB)

Motor local de oportunidades comerciales a partir de datos que ya existen en ARPASuite.

**Solo laboratorio.** Panel visual en Historial. Sin LLM, WhatsApp ni producción.

## Qué hace

Lee solo datos ya existentes:

- `arpa_suite_servicio_historial` vía `ArpaHistorial.getRecords()`
- `arpa_suite_clientes` vía `ArpaHistorial.getClientes()`
- borrador `arpa_cot_draft` si existe

Campos reales usados: `modulo`, `cliente` / `formato-cliente-nombre`, `fecha` / `formato-fecha` / `fechaHoraFinalizacion`, `_tipo` / `subtipo`, `numero`, `total`, `sel-marca`, `ref-manual`. No usa `savedAt` como fecha de servicio. No escribe en esas claves.

- No inventa clientes, fechas, servicios ni precios.
- Si falta un dato, lo declara en `faltantes`.
- Una instalación con fecha real recomienda mantenimiento a **6 meses**.
- Sin fecha de instalación o mantenimiento, no crea esa fecha.

## Tipos

| Tipo | Cuándo |
|---|---|
| `mantenimiento_proximo` | Hay fecha real y los 6 meses aún no vencen. |
| `mantenimiento_vencido` | Hay fecha real y los 6 meses ya pasaron. |
| `seguimiento_cliente` | El cliente tiene servicios y el último es de hace 180+ días. |
| `cotizacion_sin_cierre` | Cotización (guardada o borrador) sin formato ni cuenta de cobro posterior. |
| `oportunidad_recurrente` | El mismo cliente tiene 2 o más formatos. |

Prioridad: `ALTA`, `MEDIA`, `BAJA`. Cada oportunidad trae un `motivo`.

## Archivos

| Archivo | Rol |
|---|---|
| `comercial-datos.js` | Extrae y normaliza historial/clientes existentes. |
| `comercial-reglas.js` | Tipos, 6 meses, prioridad. |
| `comercial-analizador.js` | Cruza datos y arma oportunidades. |
| `comercial-api.js` | `analizar(entrada)` y `analizarDesdeArpaSuite()`. |
| `comercial-ui.js` | Panel compacto en Historial: resumen, faltantes y localizar documento. |

## Uso

```js
const resultado = ArpaIaComercial.analizar({
  hoy: '2026-09-02',
  historial: records,
  clientes: clientes
});
```

No hay API key. No hay fetch. No hay LLM en esta fase.

## Pruebas

```
node js/arpa-ia/tests/comercial-run.mjs
```

La suite cubre instalación con/sin fecha, próximo y vencido, recurrente, seguimiento a 180 días, cotización sin cierre, varias oportunidades sin duplicar, datos incompletos o vacíos, fechas inválidas, prioridades y que el motor no use red, API key ni LLM.
