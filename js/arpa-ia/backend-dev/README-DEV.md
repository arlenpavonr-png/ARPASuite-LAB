# ARPA IA — backend DEV (Apps Script)

Este directorio es **solo laboratorio**. El proyecto Apps Script ya creado se llama **ARPA IA — DEV**.

No uses este código sobre el script de licencias, cloud o cotizaciones.
No pegues la API key en el código, en Git ni en el frontend.

## 1. Instalar en Apps Script DEV

1. Abre el proyecto **ARPA IA — DEV** (el que ya creaste).
2. Si existe un `Code.gs` de ejemplo, bórralo o déjalo vacío.
3. Crea/abre `Code.gs` y pega **todo** el contenido de:

   `js/arpa-ia/backend-dev/arpa-ia-llm-DEV.gs`

4. Guarda el proyecto. No pegues ningún otro `.gs` de producción.

## 2. Propiedades necesarias

En el editor: **Project Settings → Script properties → Add script property**.

| Nombre | Valor de ejemplo | Notas |
|---|---|---|
| `ARPA_IA_LLM_PROVIDER` | `openai` | Obligatorio. Este backend solo implementa OpenAI. |
| `ARPA_IA_LLM_MODEL` | `gpt-4o-mini` | El modelo que quieras usar en Responses API. |
| `ARPA_IA_LLM_KEY` | *(tu clave)* | Solo aquí. Nunca en `index.html`, JS del navegador ni Git. |

No agregues Sheet IDs, URLs de licencias ni datos de producción.

## 3. Desplegar como Web App DEV

1. **Deploy → New deployment**.
2. Tipo: **Web app**.
3. Description: `ARPA IA DEV`.
4. Execute as: **Me**.
5. Who has access: **Anyone** (el PWA LAB no inicia sesión de Google; no abras Gmail/Drive/Sheets).
6. Deploy y autoriza solo el alcance de **UrlFetchApp** (conectar a servicios externos / OpenAI).
7. Copia la URL que termina en `/exec`. Esa es la URL DEV. **No la pegues todavía** en el frontend hasta la siguiente fase.

Si vuelves a editar `Code.gs`, crea una **nueva versión** del mismo deployment DEV. No actualices el Web App de licencias.

## 4. Cómo probarlo

**GET** (salud, sin LLM):

Abre la URL `/exec` en el navegador. Debe devolver:

```json
{ "ok": true, "service": "ARPA IA DEV", "modos": ["cotizador", "tecnica", "informe"] }
```

**POST** (extracción). El cuerpo debe incluir oficio + texto. Desde PowerShell, reemplaza `URL_DEV`:

```powershell
Invoke-RestMethod -Method Post -Uri "URL_DEV" -ContentType "text/plain;charset=utf-8" -Body '{"oficio":"automatizacion","text":"Puerta corrediza residencial de 500 kg, 5 metros, Medellín."}'
```

Respuesta esperada (forma):

```json
{
  "ok": true,
  "extraido": {
    "oficio": "automatizacion",
    "tipo_de_trabajo": "instalación",
    "datos": {
      "tipo_de_puerta": "corrediza",
      "uso": "residencial",
      "peso_kg": 500,
      "ancho_m": 5,
      "ciudad": "Medellín"
    },
    "materiales_mencionados": [],
    "observaciones": [],
    "datos_faltantes": [],
    "tipo_de_puerta": "corrediza",
    "uso": "residencial",
    "peso_kg": 500,
    "ancho_m": 5,
    "ciudad": "Medellín"
  }
}
```

Electricidad:

```powershell
Invoke-RestMethod -Method Post -Uri "URL_DEV" -ContentType "text/plain;charset=utf-8" -Body '{"oficio":"electricidad","text":"Instalar 8 puntos eléctricos, 40 metros de cable, Medellín."}'
```

Si OpenAI falla:

```json
{ "ok": false, "error": "..." }
```

Casos útiles:

1. `Puerta corrediza residencial de 500 kg, 5 metros, Medellín.`
2. `Necesito motor para una puerta de 800 kilos.`
3. `Quiero automatizar una puerta batiente residencial.`
4. `Motor para puerta corrediza de 1200 kg.`

Usa `Content-Type: text/plain` (JSON en el cuerpo). Así el navegador no dispara preflight CORS. No uses el Web App de licencias ni el de cotizaciones.

**POST informe** (`modo: "informe"`). No inventa marca, modelo, materiales ni resultado si no vienen en la OT:

```powershell
Invoke-RestMethod -Method Post -Uri "URL_DEV" -ContentType "text/plain;charset=utf-8" -Body '{"modo":"informe","oficio":"automatizacion","ot":{"numero_ot":"OT-DEV-001","oficio":"automatizacion","tipo_servicio":"mantenimiento","equipo":"motor para puerta corrediza","marca":"BFT","modelo":"600","descripcion_trabajo":"la puerta no cierra","hallazgos":["fotoceldas sucias"],"trabajos_realizados":["limpieza y alineación de fotoceldas"],"resultado":"la puerta realiza correctamente el cierre"}}'
```

Respuesta esperada: `{ "ok": true, "modo": "informe", "informe": { ... } }`.

Si el LLM falla: `{ "ok": false, "error": "..." }` para que LAB use el fallback local.

Si vuelves a editar `Code.gs`, **no crees otro Web App**. Actualiza la implementación existente (lápiz → New version).

## 5. Conectar después `cotizador-config.js`

Aún no lo hagas. Cuando toque la siguiente fase, en LAB:

`js/arpa-ia/cotizador-config.js`

```js
api.configure({
  mode: 'remote',
  endpoint: 'PEGA_AQUI_SOLO_LA_URL_DEV_DE_ARPA_IA'
});
```

Reglas:

- Solo la URL `/exec` del proyecto **ARPA IA — DEV**.
- Nunca `LICENSE_API` ni `COT_SHEETS_URL`.
- El cliente LAB ya bloquea esos IDs de producción.
- El cliente enviará `{ "oficio": "...", "text": "..." }` y no seleccionará productos en el LLM.
- No hace falta tocar la pantalla de Cotizaciones en este paso.

## Seguridad

- La key vive solo en Script Properties del proyecto DEV.
- El backend llama a `https://api.openai.com/v1/responses` con `store: false`.
- No escribe Sheets, no loguea textos, no devuelve la key.
- Si un mensaje de error trajera un fragmento de key, se redacta.
