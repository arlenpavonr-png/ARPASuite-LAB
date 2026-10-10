# LAB_LOG — bitácora de experimentos LAB

## 2026-10-10 — Cuenta de Cobro: número al generar PDF/compartir (`agent/cuenta-cobro-numero-al-guardar`)

Mismo arreglo que Cotización. Entrar a Cuenta de Cobro o abrir la app ya no gasta
número CC-XXX: se asigna al generar el PDF o compartir por WhatsApp (o con
"+ NUEVO N°") y queda guardado al instante en el borrador. Si el borrador ya tiene
número se conserva; un número reservado se reutiliza. Sin licencia: aviso, no hay
PDF ni Historial.

- Archivos: `js/arpa-cuenta-cobro.js`, `js/arpa-views.js`, `tests/cuenta-cobro-numero.test.js`, `package.json`.
- Pruebas: `npm test` 86/86, Fence PASS, regresión 8/8. Solo camino local (sin nube).
- Al terminar (PDF guardado o compartido con éxito) el campo de número queda vacío
  (decisión de Arlen): la siguiente cuenta no sale con el número repetido. En el camino
  "adjunte el PDF a mano" el número se conserva, por si hay que generar el PDF.
- Pendiente: probar en la app LAB con licencia.

## 2026-10-10 — Cotización: el número se asigna al guardar/PDF/compartir (`agent/cotizacion-numero-al-guardar`)

### Qué hace
Entrar a Cotización ya no gasta número. El COT-XXX se asigna justo antes de generar el
PDF o compartir por WhatsApp (que es cuando pasa al Historial). Si el borrador ya tiene
número, se conserva; si hay uno reservado, se reutiliza; si no, se pide (nube o local)
y se guarda de inmediato en el borrador. Sin número no se genera PDF ni Historial.
"+ NUEVO N°" sigue igual (y ahora también guarda el número en el borrador al instante).

### Archivos
`js/arpa-views.js`, `js/arpa-cotizacion.js` (protegido, autorizado por Arlen para este
punto), prueba nueva `tests/cotizacion-numero.test.js` (en `npm test`).

### Pruebas
- `npm test` verde (incluye la nueva prueba, camino local sin nube).
- Fence PASS, regresión 8/8.

### Pendiente
- Probar en la app LAB completa (imprimir PDF y WhatsApp) y con licencia real.
- Cuenta de Cobro tiene el mismo problema (pide número al entrar y al abrir sin
  borrador); no se tocó.

## 2026-10-10 — El LAB ya no llama a producción al abrirse (`agent/lab-sin-produccion`)

### Qué
Resuelve el CRÍTICO del 2026-09-27. Licencia y trial (`index.html`), datos de empresa
(`arpa-brand.js`), respaldo y numeración en la nube (`arpa-cloud-sync.js`), registro de trial
(`arpa-trial-capture.js`) y Google Analytics solo se usan en `arpa.arpatechnologyglobal.com`.
En cualquier otra dirección la llamada se rechaza como "sin red" antes de salir.
`LICENSE_API` no se tocó. Archivos protegidos modificados con autorización de Arlen.

### Pruebas
- Fence: marcó solo los 4 archivos autorizados antes del commit; PASS después. Regresión 8/8.
- `npm test`: 77/77.
- Navegador en 127.0.0.1: cero peticiones a `script.google.com` y a Google Analytics.
  Sin licencia muestra "No se pudo verificar la licencia" (igual que sin internet);
  con `?labdemo=1` entra al demo.

### Ojo
- Para probar en el LAB el camino con licencia real (numeración en la nube) hará falta
  un Apps Script de pruebas y permitir su dirección; hoy el LAB no habla con ningún servidor.
- Error de consola en `arpa-cuenta-cobro.js:804` al cargar: es el que producción arregló en
  el PR #36 (Formato-Arlenpav); llega al LAB con la próxima sincronización.
- Al pasar este cambio a producción no cambia nada allí (el dominio coincide).

## 2026-10-07 — Checklist de mantenimiento preventivo (`agent/checklist-mantenimiento`)

### Qué hace
Sección "Checklist de Mantenimiento Preventivo" en el Formato de Servicio, entre
"Registro Fotográfico" y "Observaciones". Solo aparece con tipo de servicio
**Mantenimiento** y oficio automatismos. Puntos generales (motor y sistema eléctrico)
más los del tipo de puerta marcado (corrediza, batiente, levadiza/seccional, barrera,
techo corredizo, cortina). Cada punto: OK / Ajustado / Requiere cambio; resumen de conteos
y "próximo mantenimiento sugerido". En el PDF solo salen los puntos revisados.

### Cómo se integra
Módulo `js/arpa-ia/checklist/` registrado en `arpa-ia-registry.js` (slot formato).
**No toca** `index.html`, `service-worker.js` ni ningún archivo protegido.
Guarda en `localStorage` propio (`arpa_checklist_mant_v1`), una entrada por número de formato;
no entra al borrador ni al historial del formato. Orden cerrada = solo lectura.

### Pruebas
- `node js/arpa-ia/checklist/checklist-tests.mjs` (lógica pura) — OK.
- Prueba visual en página aislada (sin cargar la app, sin llamadas a producción).
- Fence PASS, regresión 8/8.

### Pendiente antes de producción
- Probar dentro de la app LAB completa (PDF imprimir y PDF WhatsApp).
- Decidir si el checklist debe guardarse también en el historial del servicio.
- Los archivos nuevos no están en la caché offline del service worker (archivo protegido).

## 2026-10-09 — LAB actualizado con producción otra vez + ramas unidas (`agent/integracion-2026-10`)

### Qué
- Una sola rama con todo el trabajo del LAB: fecha-hoy → sync-produccion → licencia-actualizaciones
  → cerrajeria → next-numero → next-oficios (ya estaban en cadena) + producción `235da2c` (PR #22–#29).
- Snapshot `05f9ef5` (árbol de producción 235da2c, padre = snapshot anterior `728c331`) y merge de tres vías.
- Ya incluidas por otro camino: checklist de mantenimiento (864019d) y catálogos/m² (producción #21 + 6ab38b7).

### Criterio
- `next/`: producción (más nueva; incluye respaldo en la nube `next/js/cloud.js`).
- `arpa-licencias-apps-script.gs`: producción (trae los handlers `respaldoguardar/listar/leer`; mismo SHEET_ID que ya tenía el LAB).
- `service-worker.js`: esquema del LAB (arpa-ia-cache.js) + precache de producción; versión `v20261009-sync-produccion-2`.
- `package.json`: nombre `arpasuite-lab`. Sin `CNAME` ni `package-lock.json`.

### Pruebas
- Producción `npm test`: 77/77. NEXT: 115 ok + etapas 49 ok. Fence: PASS. Regresión: 8/8.

### Ramas que quedan contenidas en esta (se pueden archivar)
`agent/fecha-hoy`, `agent/sync-produccion`, `agent/licencia-actualizaciones`, `agent/cerrajeria`,
`agent/next-numero`, `agent/next-oficios`, `agent/checklist-mantenimiento`, `agent/unidad-m2`, `agent/catalogos-paso1`.

### Ojo
- El respaldo en la nube del LAB usa el mismo servidor de licencias de producción (igual que la licencia,
  ver 2026-09-27). Probar el LAB sin licencia real o con `?labdemo=1`.

## 2026-10-08 — LAB actualizado con producción (`agent/sync-produccion`)

### Por qué
El LAB se creó el 26-ago como copia suelta (sin historia común) y producción recibió 66
arreglos después (licencia, numeración reservada, PDF de WhatsApp, fecha local, México,
decimales/m²). Lo que se mejoraba en el LAB ya no se podía pasar directo a producción.

### Cómo (repetible)
- La copia inicial del LAB (`d5efdc3` "BASE") es idéntica a producción `acbfffc` (50/50 archivos).
- Remoto de solo lectura `produccion` → Formato-Arlenpav (push deshabilitado).
- Commit "snapshot" = árbol de `produccion/main` con padre `d5efdc3`, y merge de tres vías
  sobre `agent/fecha-hoy`. Próxima vez: snapshot nuevo con padre = snapshot anterior.

### Criterio de resolución
- Lógica de la app (cotización, cuenta de cobro, marca, i18n, impresión, fechas, numeración):
  **producción**. Arreglos que el LAB había hecho por su lado se descartaron a favor de los de producción.
- Se conservan las funciones propias del LAB: Orden de Trabajo (`arpa-ot.js`, materiales, `OT-001`),
  slots y módulos `js/arpa-ia/`, modo demo (`ArpaLabDemo`), entrada a `next/`, Taller de motos,
  `pages.yml` del demo Next Gen, versión de caché por `arpa-ia-cache.js`.
- `i18n`: archivo de producción + `supplementLabKeys()` que solo rellena claves que falten.
- No se trajeron: `CNAME` (dominio de producción), `landing-nueva.html`,
  `arpa-licencias-apps-script.gs`, `package-lock.json`; `package.json` renombrado `arpasuite-lab`.
- Arreglado: `service-worker.js` no precacheaba `js/arpa-ia/arpa-ia-bootstrap.js` (lo detectó la prueba de producción).

### Pruebas
- Pruebas de producción (`tests/*.test.js`) sobre el LAB: 46/46.
- Suites del LAB: 8/8.
- Fence antes del commit: solo archivos protegidos de la app (index.html, service-worker.js,
  manifest.json, arpa-brand/cloud-sync/cotizacion/trial-capture) — esperado: vienen de producción.

### Sigue pendiente
- El LAB sigue llamando a producción al abrirse (ver 2026-09-27). Ahora es aún más importante resolverlo.
- Reaplicar sobre esta rama: checklist de mantenimiento y Taller de motos con precios.

## 2026-09-06 — Experimento controlado Fase B (módulo IA dummy)

### Objetivo
Validar empíricamente que una IA nueva puede integrarse **sin modificar Capa A**
(`index.html`, `service-worker.js`, Fence), usando solo anclas genéricas ya presentes.

### Commit de prueba (luego retirado del tip de trabajo)
- SHA: `350d5c6a9950d68db5bf08f7980e40fbda67c121`
- Mensaje: `test(ai): valida Fase B con modulo IA dummy`
- Rama: `agent/ci-lab-validation`
- Push autorizado a `origin/agent/ci-lab-validation` (sin merge, sin PR nuevo, sin deploy)

### Qué se hizo
1. Creó `js/arpa-ia/nueva-ia-prueba.js` (módulo ficticio).
2. Registró el módulo en `js/arpa-ia/arpa-ia-registry.js` (`id: prueba`).
3. Añadió plantilla en `js/arpa-ia/arpa-ia-panels.js` (`panel: prueba`).
4. Montaje en slot existente `#arpa-ia-slot-historial`.
5. **No** se tocó `index.html`, `service-worker.js` ni el Fence.

### UI
- Verificado en servidor local: panel `#historial-ia-prueba` dentro del slot historial.
- Botón dummy funcional; status: `Fase B OK — módulo dummy activo`.
- Init al cargar el script (tras `host.mountPanel`). **No** se usó `ArpaIaHost.onViewOpen`
  ni el atajo de `arpa-views.js`. Para paneles estáticos la deuda de `onViewOpen` no bloquea.

### Fence / regresión (local)
| Prueba | Resultado |
|--------|-----------|
| Fence vs HEAD limpio | PASS |
| Soft-reset vs parent `cbe38a5` (solo este commit) | PASS — solo archivos `js/arpa-ia/*` |
| Soft-reset vs base PR `ef15748` (tip completo) | FAIL Capa A — `index.html` + `service-worker.js` (anclas one-time previas; esperado) |
| Regresión | OK: 8/8 suites |

### GitHub (post-push de `350d5c6`)
- Workflow: `ARPASuite LAB CI` / job `fence-and-regression`
- Conclusión: **failure**
- Motivo alineado con soft-reset vs base: Capa A por anclas previas de Fase B, **no** por el dummy.
- Run: https://github.com/arlenpavonr-png/ARPASuite-LAB/actions/runs/34048292453

### Conclusión
**Promesa de Fase B VALIDADA** para IAs nuevas en slots existentes:
no hace falta volver a tocar Capa A.

### Retiro del dummy
El módulo de prueba no es código permanente. Tras documentar este resultado se elimina
en un commit separado (registry + panels + `nueva-ia-prueba.js`).

## 2026-09-27 — PENDIENTE: Cotización cambia el número del borrador al abrir

### Síntoma
Al abrir la app con un borrador de Cotización guardado (ej. `COT-0003`), el número pasa
a uno nuevo (ej. `COT-004`) y la fecha se pone en hoy, aunque el borrador se haya guardado hoy
con una fecha puesta a mano.

### Causa probable
En `initCotizacion()` (`js/arpa-cotizacion.js`), `ensureCotNumero()` se llama **antes** de
`applyCotDraft()`. En ese momento el campo número aún está vacío, así que pide un número nuevo
en segundo plano; cuando llega, sobrescribe el número (y la fecha) que puso el borrador.

### Estado
Corregido en `agent/fecha-hoy`: `initCotizacion()` ya no pide número al abrir la app; el
borrador conserva el suyo. Si no hay número, se asigna al entrar a Cotización o con
"+ NUEVO N°", y se guarda de inmediato en el borrador.
Nota: el "COT-0003" (4 cifras) fue un valor de prueba escrito a mano; la app usa 3 cifras.
Lo mismo en Cuenta de Cobro (al abrir sin borrador, `initCuentaCobro()` pedía número; en prueba
llegó a CC-006 tras 6 aperturas): corregido en `9d5d85e` con la misma lógica.
Falta probar la numeración con licencia (camino que pide números a la nube): requiere un Apps
Script de pruebas, nunca el de producción.

## 2026-09-27 — PENDIENTES detectados durante `agent/fecha-hoy`

### CRÍTICO — La app LAB llama a producción y a Analytics al cargar
Al abrir `index.html` en un servidor local (127.0.0.1), la app llama sola a:
- Apps Script de **producción** (`LICENSE_API`): `accion=provision_trial&device_id=...` (`index.html`, `provisionTrialJsonp`).
- Google Analytics / Google Tag Manager (`page_view`).

El Fence **no lo detecta** (revisa cambios en archivos, no lo que la app hace al ejecutarse).
Verificado con el usuario: esta vez el servidor no creó ninguna fila (device_id de prueba
no aparece en "Hoja 1", "Dispositivos" ni "Trials").
Solución futura (otra rama): si el host es `127.0.0.1` / `localhost`, no llamar a producción ni a Analytics.
Mientras tanto: probar solo con esas direcciones bloqueadas en el navegador.

### NEGOCIO — `provision_trial` no tiene límite
Crea un trial de 7 días por cada `device_id` nuevo, sin límite. Una ventana de incógnito o
borrar los datos del navegador genera un `device_id` nuevo, y con él un trial nuevo. Evaluar un límite.

### VERIFICAR — Apps Script publicado vs repo
Confirmar que el Apps Script publicado en producción sea igual a `arpa-licencias-apps-script.gs` del repo.

### REVISAR — 4 errores de consola al cargar scripts
Al cargar la app aparecen 4 veces "An unknown error occurred when fetching the script".
Averiguar si son propios del LAB (servidor local) o si también ocurren en producción.
Observación: en las pruebas con bloqueo aparece uno por carga, justo después de la llamada
a `provision_trial`, así que probablemente son esa llamada fallando.

### PENDIENTE ANTES DE PRODUCCIÓN — Test 15 roto + bump de caché
El test `15 service worker actualizado` (`js/arpa-ia/tests/comercial-run.mjs`) lo rompió el
commit `0acda6c` ("fix(pdf): cotizacion Mexico...", rama `fix/pdf-mexico`), que cambió el nombre
de caché de `service-worker.js`. Resolverlo junto con el bump de caché antes de pasar a producción.

### MEJORA FUTURA — Número de Cotización al guardar/generar PDF
Hoy el número se asigna al entrar al módulo Cotización (`arpa-views.js`). Mejor asignarlo al
guardar o generar el PDF, para no gastar números en cotizaciones que no se terminan.

### PROCESO — LAB y producción son repos distintos
LAB = `ARPASuite-LAB`; producción = `Formato-Arlenpav` (arpa.arpatechnologyglobal.com,
publicado a mano con `pages.yml` / workflow_dispatch). Falta definir el proceso para pasar
cambios del LAB a producción.

### PENDIENTE DECISIÓN — Duplicados sin internet
Duplicados sin internet: pendiente decisión de Arlen.
Sin conexión, la app usa su contador local + 1 y puede repetir un número que ya existe en la nube
(otro celular con la misma licencia, respuesta perdida, app reinstalada). Opciones propuestas en la sesión del 2026-09-27.

### 2026-10-08 — Licencia de actualizaciones anuales (rama `agent/licencia-actualizaciones`)
Modelo: licencia de por vida + actualización anual paga. NEXT es la primera actualización.
- La fecha de vencimiento que ya guarda el servidor para Pro / PYME / White Label (PMA, 365 días)
  se usa como "actualizaciones hasta". No se tocó el Apps Script.
- `js/arpa-actualizaciones.js`: cada actualización tiene fecha de salida (`RELEASES`; NEXT =
  `2027-01-01`, fecha provisional). Se tiene si el PMA estaba vigente ese día. Quien no renueva
  conserva lo que ya tenía. Fundador: siempre. Prueba gratis vigente: sí (`TRIAL_INCLUYE_ACTUALIZACIONES`).
  Demo del LAB (`?labdemo=1` en localhost/red local): sí.
  Antes de la fecha de salida solo la usa el fundador (Arlen la prueba en campo).
- NEXT muestra una pantalla de "Actualización anual" con botón de WhatsApp de ventas si no la tiene.
- Pruebas: `tests/actualizaciones.test.js` (12); e2e de NEXT usa la demo del LAB.
- Limitación: se decide en el navegador con los datos guardados al validar (igual que hoy el
  fundador). Basta para el cliente normal; no frena a alguien que edite el almacenamiento.
- Para renovar a un cliente: cambiar la fecha VENCIMIENTO de su fila en la hoja de licencias;
  la app la toma la próxima vez que abra con internet.
