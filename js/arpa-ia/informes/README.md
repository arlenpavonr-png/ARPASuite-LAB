# ARPA IA INFORMES (LAB)

Motor inicial de informes técnicos a partir de una Orden de Trabajo.

**Solo laboratorio.** No toca producción, PDF ni WhatsApp.

## Qué hace

Toma los hechos ya registrados en la OT y arma un informe JSON profesional.

- No inventa marcas, modelos, materiales, mediciones, precios ni reparaciones.
- Separa **hechos registrados** de **hipótesis** (p. ej. IA Técnica).
- Conserva el oficio configurado en ARPASuite.
- Funciona en local. Si hay LLM DEV, intenta redactar y luego valida que no se hayan colado hechos nuevos.

## Archivos

| Archivo | Rol |
|---|---|
| `informes-parser.js` | Normaliza la OT. |
| `informes-generador.js` | Construye el informe y recorta invenciones del LLM. |
| `informes-prompts.js` | Prompt estricto. Sin historial. |
| `informes-api.js` | `generar` (local) y `generarAsync` (LLM + fallback). |

## Uso

```js
const informe = ArpaIaInformes.generar(ot);
const informe2 = await ArpaIaInformes.generarAsync(ot);
```

Reutiliza el endpoint DEV de `ArpaIaCotizadorApi` (`modo: "informe"`). No hay API key en el frontend. `store: false` sigue en el backend DEV.

## Pruebas

```
node js/arpa-ia/tests/informes-run.mjs
```

Esta fase no integra el informe en la pantalla de OT ni en PDF/WhatsApp.
