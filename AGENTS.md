# ARPASuite-LAB — reglas para agentes

## 1. ALCANCE ABSOLUTO
Este repositorio es exclusivamente ARPASuite-LAB.
Producción está FUERA DE ALCANCE.
Nunca:
- modificar producción
- desplegar producción
- llamar servicios productivos
- usar datos productivos
- modificar infraestructura productiva

## 2. PROHIBIDO
El agente NO puede:
- hacer git push
- hacer merge autónomo
- trabajar directamente sobre main
- desplegar GitHub Pages
- desplegar Apps Script
- modificar configuraciones productivas
- modificar LICENSE_API
- modificar COT_SHEETS_URL
- modificar IDs de Sheets productivos
- introducir URLs /exec productivas
- introducir API keys o secretos
- modificar manifest.json sin autorización humana
- modificar .github/workflows/pages.yml sin autorización humana
- modificar service-worker.js sin autorización humana
- saltarse el Production Fence
- saltarse la regresión
- hacer cambios masivos sin revisión
- usar git add .
- hacer git reset --hard
- hacer git clean
- borrar trabajo existente del usuario
- sobrescribir cambios M/?? que ya existían antes de comenzar

## 3. ESTADO DEL REPOSITORIO
Antes de comenzar cualquier tarea:
- ejecutar git status --short
- identificar cambios preexistentes
- NO modificar ni borrar esos cambios
- trabajar solamente sobre el alcance autorizado
Nunca asumir que un archivo M es basura.

## 4. RAMAS
Los agentes trabajarán únicamente en ramas:
agent/<tema>
La rama base prevista es:
arpa-suite-next-gen
Nunca crear una rama desde main.
Nunca trabajar directamente sobre main.
Nunca hacer push autónomo.

## 5. SEGURIDAD
Antes de considerar terminado un cambio:
node scripts/check-production-fence.mjs
Debe terminar con exit 0.
Si devuelve exit 1:
DETENER.
No intentar desactivar, modificar ni esquivar el Fence para conseguir PASS.

## 6. REGRESIÓN
Después de que el Fence pase:
node scripts/run-regression.mjs
Debe terminar con:
OK: 8/8 suites pasaron.
Si falla:
DETENER.
No declarar terminado el trabajo.

## 7. CAMBIOS PROTEGIDOS
Estos archivos requieren revisión/autorización humana:
- manifest.json
- arpa-licencias-apps-script.gs
- .github/workflows/pages.yml
- service-worker.js
- index.html
- js/arpa-brand.js
- js/arpa-cloud-sync.js
- js/arpa-trial-capture.js
- js/arpa-cotizacion.js
El Fence los trata como protegidos.

## 8. IA
La configuración versionada de cotizador debe permanecer:
mode: local
endpoint: ''
Nunca versionar endpoints remotos ni claves.

## 9. COMMITS
Los commits deben ser:
- pequeños
- temáticos
- revisables
- sin mezclar cambios no relacionados
Nunca usar:
git add .
Preferir paths explícitos.

## 10. ENTREGA DEL AGENTE
Un trabajo terminado debe reportar:
- objetivo
- archivos modificados
- archivos nuevos
- tests ejecutados
- resultado del Fence
- resultado de regresión
- commit
- rama
- confirmación de que no hubo push
- confirmación de que producción no fue tocada
El agente NO hace merge.
El agente NO hace push.

## 11. REGLA DE PARADA
DETENERSE inmediatamente si:
- aparece una posible conexión a producción
- aparece una credencial
- el Fence falla
- la regresión falla
- aparecen cambios fuera del alcance
- se requiere modificar un archivo protegido
- existe ambigüedad sobre si un cambio afecta producción
Reportar el problema y esperar instrucciones humanas.

## 12. PRINCIPIO DEL PROYECTO
ARPASuite debe ser:
MUY SIMPLE POR FUERA.
MUY POTENTE POR DENTRO.
El agente debe preservar esa filosofía.
No introducir complejidad innecesaria.
