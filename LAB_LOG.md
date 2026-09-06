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
