# ARPASuite NEXT

Aplicación de campo (laboratorio LAB). El técnico dicta o escribe; el sistema estructura hallazgos, trabajo, recomendaciones, checklist, cotización e informe.

## Abrir

Sirva el repo con un servidor local (los módulos ES no cargan bien como `file://`):

```
npx --yes serve -l 4173
```

Luego abra `http://localhost:4173/next/`.

## Probar

```
node tests/run.mjs
```

## Datos

Todo queda en IndexedDB del navegador (`arpa-suite-next`). No escribe a producción ni a los Google Apps Script de la suite clásica.

Si el navegador ya usó la suite clásica, NEXT importa clientes desde `arpa_suite_clientes`.
