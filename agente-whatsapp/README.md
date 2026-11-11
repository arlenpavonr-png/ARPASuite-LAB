# Contestador de WhatsApp de Automatismos ARPA

Guía para Arlen. Estado: **programado y ensayado en el LAB, sin instalar todavía.**
Nada de esto le escribe a ningún cliente hasta que usted haga los pasos de abajo.

## Qué es

Un asistente que responde solo, las 24 horas, el WhatsApp de Automatismos (300 568 3914):

- Contesta de **usted**, en mensajes cortos, con lo que dice la ficha (qué hacemos, zonas, visita de $80.000,
  garantía, pagos, preguntas frecuentes y los precios "desde" de la web, con la instalación aparte; el IVA, ya incluido, solo se menciona si el cliente pregunta).
- **Nunca da precios de instalación ni de mano de obra.** Si la respuesta trae un valor en pesos que no está en la
  ficha, no se envía: se manda un mensaje de "le paso su caso a Arlen".
- **Le pasa el caso a usted** (y le manda un correo con nombre, número, resumen y el link para responder) cuando el
  cliente pide precio de instalación, quiere visita, quiere comprar o agendar, manda fotos con medidas, está molesto
  o pide hablar con una persona. Al cliente le dice cuándo le responde usted ("hoy mismo", "mañana a primera hora",
  "el lunes a primera hora", según el día y la hora en Colombia, con festivos).
- **Fotos, audios, ubicaciones:** acusa recibo ("Recibimos su foto, gracias...") y le avisa a usted. No las interpreta.
- **No lo pisa a usted:** si usted escribe en un chat desde su celular, el asistente se calla en **ese** chat por
  12 horas. Los demás chats siguen atendidos.
- Guarda todas las conversaciones en una hoja de Google **propia** (no toca las hojas de ARPA Suite).

## Cómo funciona (en palabras simples)

```
Cliente escribe por WhatsApp
   → Meta (WhatsApp Cloud API) avisa al intermediario (Cloudflare, gratis)
   → el intermediario confirma que el aviso es de Meta y se lo pasa a Apps Script
   → Apps Script guarda el mensaje, le pregunta a Claude con la ficha y el historial
   → revisa la respuesta (usted, sin precios prohibidos) y la envía por WhatsApp
   → si hay que pasarle el caso, le manda un correo a usted
```

Por qué el intermediario: Apps Script responde a Meta con una redirección (código 302) y no deja revisar la firma
de seguridad de Meta. Meta reintenta todo lo que no reciba un "200" durante hasta 7 días, así que sin intermediario
habría reintentos y no se podría comprobar que los mensajes vienen de Meta. El intermediario responde "200" al
instante, revisa la firma y le pasa el mensaje a Apps Script.

## Qué necesita tener antes (lo crea usted, yo no creo cuentas)

1. **Cuenta de la API de Claude** en console.anthropic.com, con saldo prepagado (con USD 10 alcanza para empezar)
   y una **clave** (API key).
2. **App de Meta** en el portafolio "Arlen Pavon" con el producto WhatsApp, el número 300 568 3914 conectado en
   **coexistencia** (sigue usando su app WhatsApp Business en el celular), un **token permanente** de usuario del
   sistema con permisos `whatsapp_business_messaging` y `whatsapp_business_management`, y un **medio de pago**
   en la cuenta de WhatsApp (desde el 1-oct-2026 Meta cobra también las respuestas, ver costos; sin medio de pago,
   Meta no deja enviar).
3. **Cuenta gratis de Cloudflare** (para el intermediario).
4. Su cuenta de Google (la misma de siempre) para Apps Script y la hoja.

## Instalación paso a paso

### 1. Apps Script
1. Entre a script.google.com → **Nuevo proyecto**. Nómbrelo "ARPA Contestador WhatsApp".
2. Cree estos archivos (botón **+** → Secuencia de comandos) y pegue el contenido de la carpeta `apps-script/`:
   `Config`, `Cerebros`, `Logica`, `Webhook`, `Configurar` (sin el ".gs"; borre el `Código.gs` vacío).
3. Configuración del proyecto (engranaje) → marque **Mostrar el archivo de manifiesto "appsscript.json"** y pegue
   el contenido de `apps-script/appsscript.json` (zona horaria de Bogotá).
4. Configuración del proyecto → **Propiedades del script** → agregue:

   | Propiedad | Valor |
   |---|---|
   | `CLAUDE_API_KEY` | su clave de Claude |
   | `META_TOKEN` | el token permanente de Meta |
   | `PHONE_ID_AUTOMATISMOS` | el "Identificador del número de teléfono" del 300 568 3914 (en Meta → WhatsApp → Configuración de la API) |
   | `CORREO_ARLEN` | el correo donde quiere los avisos |

5. Arriba elija la función **`configurar`** y dele **Ejecutar**. Acepte los permisos (es su propia cuenta).
   Esto crea la hoja "ARPA - Contestador WhatsApp (conversaciones)" y agrega solas: `VERIFY_TOKEN`, `RELAY_TOKEN`,
   `ASISTENTE_ACTIVO=NO` y `MODO_BORRADOR=SI`. En el registro de ejecución le dice si falta algo.
6. (Opcional) Ejecute **`probarClaude`**: en el registro debe aparecer una respuesta de prueba sobre un motor
   corredizo. No envía nada por WhatsApp.
7. **Implementar → Nueva implementación → Aplicación web.** Ejecutar como: **Yo**. Quién tiene acceso:
   **Cualquier usuario**. Copie la URL que termina en `/exec`.

### 2. Intermediario (Cloudflare Worker)
1. En dash.cloudflare.com → Workers & Pages → **Crear** → "Hello World" → nómbrelo `arpa-contestador-whatsapp`.
2. **Editar código**: borre lo que trae y pegue `intermediario-cloudflare/worker.js`. Implementar.
3. Settings → **Variables y secretos** → agregue como *secreto*:
   `VERIFY_TOKEN` y `RELAY_TOKEN` (copie los mismos de las Propiedades del script),
   `META_APP_SECRET` (Meta → su app → Configuración → Básica → Clave secreta de la app),
   `APPS_SCRIPT_URL` (la URL `/exec` del paso 1.7).
4. Copie la dirección del Worker (algo como `https://arpa-contestador-whatsapp.<su-cuenta>.workers.dev`).

### 3. Meta
1. Su app → WhatsApp → **Configuración** → Webhook → **Editar**:
   URL de devolución de llamada = la dirección del Worker; Token de verificación = el `VERIFY_TOKEN`. Verificar y guardar.
2. En "Campos del webhook" suscríbase a **`messages`** y **`smb_message_echoes`** (este último es el que avisa cuando
   usted escribe desde el celular; sin él, el asistente no sabe que usted ya está atendiendo).

### 4. Prueba y encendido
1. Ejecute **`encenderAsistente`**. Como sigue en `MODO_BORRADOR=SI`, no le escribe a nadie: le llega a usted por
   correo cada respuesta que **enviaría**. Escríbale al 300 568 3914 desde otro celular y revise los correos.
2. Cuando le guste cómo responde, cambie `MODO_BORRADOR` a `NO`. Desde ese momento responde solo.

### 5. Contador de clientes (informe diario y semanal)
Ejecute **`activarInformes`** una sola vez. Desde ese día le llega al `CORREO_ARLEN`:
- **Cada día a las 7 p. m.** (solo si escribió alguien): cuántos clientes escribieron, cuántos son nuevos, qué
  preguntaron, a cuántos se les cotizó, cuántos compraron y cuántos solo preguntaron (mirones).
- **Los lunes a las 7 a. m.**: lo mismo de la semana, la lista de las ventas "casi seguras" por si alguna no fue,
  y un renglón **solo con números** para pasarle a Gemini (sin nombres ni teléfonos).

Usted no marca nada. El asistente detecta la venta solo:
- **Usted le manda al cliente la cuenta de cobro de ARPA Suite** (`CuentaCobro_…pdf`): venta.
- **Usted escribe** "gracias por su compra", "quedó instalado" o "recibí el pago": venta.
- **Usted le manda la cotización** (`Cotizacion_…pdf`, o un mensaje con el valor): cotizado.
- **El cliente escribe** "ya le consigné", "¿cuándo vienen?" o "mi dirección es…", o manda una foto después de la
  cotización (posible comprobante): venta casi segura.

Para probarlo sin esperar: ejecute `informeDiario` o `informeSemanal`.

## Cómo apagarlo

- **Rápido:** en el editor de Apps Script ejecute **`apagarAsistente`** (o cambie `ASISTENTE_ACTIVO` a `NO` en las
  Propiedades del script). Sigue guardando los mensajes, pero no responde a nadie.
- **En un solo chat:** escríbale usted al cliente desde su celular; el asistente se calla en ese chat 12 horas
  (se cambia con `SILENCIO_HORAS`).
- **Números que nunca se responden** (familia, proveedores, instaladores): póngalos en `NUMEROS_EXCLUIDOS`,
  separados por coma, con el 57 adelante. Ej.: `573001112233, 573104445566`.
- **Del todo:** en Meta, quite la URL del webhook. Su WhatsApp Business sigue funcionando normal.

## Cuánto cuesta (aprox., octubre de 2026)

- **Claude (modelo `claude-sonnet-5-5`, USD 2 por millón de tokens —pedacitos de texto— que lee y USD 10 por millón que escribe):** cada
  respuesta usa unos 2.500 tokens de entrada (ficha + historial) y unos 300 de salida → **aprox. USD 0,01 por
  respuesta (unos $30–40 pesos)**. Con 500 respuestas al mes: **unos USD 4–5 (≈ $16.000–20.000)**.
- **Meta:** desde el **1 de octubre de 2026** Meta volvió a cobrar los mensajes de servicio (las respuestas dentro de
  las 24 horas a un mensaje del cliente). Cada número tiene **1.000 mensajes de servicio gratis al mes**; del 1.001
  en adelante se cobra por mensaje entregado, a la tarifa "utility" de Colombia (fracciones de centavo de dólar; ver
  la tarjeta de tarifas de Meta). Los mensajes que llegan por un anuncio "clic a WhatsApp" tienen ventana gratis.
  Fuente: developers.facebook.com/docs/whatsapp/pricing. **Con el volumen de Automatismos, lo normal es quedar dentro
  de los 1.000 gratis.**
- **Apps Script, la hoja de Google y Cloudflare (plan gratis):** $0.
- Total esperado: **menos de USD 10 al mes** (≈ $40.000) con el volumen actual.

## Para cambiar lo que sabe

Lo que sabe está en `apps-script/Cerebros.gs` (copiado de "Ficha asistente WhatsApp Automatismos.md").
Si cambia un precio "desde", hay que cambiarlo en el texto **y** en la lista `preciosPermitidos`; si no, el filtro
bloqueará el precio nuevo (y le pasará el caso a usted, que es lo seguro).

## Para el programador

- `apps-script/` código de Apps Script (V8). `Logica.gs` es puro y se prueba en Node.
- `intermediario-cloudflare/` Worker que valida `X-Hub-Signature-256`, responde 200 y reenvía con `?relay_token=`.
- `ensayo/ensayo.mjs` ensayo de punta a punta con Google, Meta y Claude simulados (`node ensayo/ensayo.mjs`);
  `--real` usa Claude de verdad con `ANTHROPIC_API_KEY` del entorno (la clave no se guarda).
- `tests/contestador.test.mjs` pruebas unitarias (`node --test tests/contestador.test.mjs`).
- Varios números: `NEGOCIOS` en `Cerebros.gs` + propiedad `PHONE_ID_<NEGOCIO>`; ARPA Suite ya tiene su lugar
  (`arpasuite`, inactivo hasta que su cerebro esté aprobado). Token distinto por negocio: `META_TOKEN_<NEGOCIO>`.
- La petición a Claude usa `output_config.effort: "low"` (chat) y `fallbacks: "default"` (beta
  `server-side-fallback-2026-07-01`): si los filtros de seguridad de Claude rechazan un mensaje inocente, la API lo
  reintenta sola con otro modelo; si igual lo rechaza, se envía el mensaje de "le paso su caso a Arlen".
