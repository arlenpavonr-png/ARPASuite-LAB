# LAB_LOG — bitácora de experimentos LAB

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
Sigue pendiente lo mismo en Cuenta de Cobro: al abrir sin borrador, `initCuentaCobro()` pide número.

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
