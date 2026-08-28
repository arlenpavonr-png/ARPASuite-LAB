# ARPA Suite — LAB

PWA de marca blanca para formatos de servicio, cotizaciones y reportes en campo.

**Rama `arpa-suite-next-gen`:** incluye **ARPASuite NEXT** (`next/`), el flujo de campo para el técnico (voz → datos → informe), además de la suite clásica de documentos.

Este repositorio es **laboratorio**. No desplegar ni fusionar hacia producción sin autorización explícita.

## Entrada

- **ARPASuite NEXT (flujo de campo):** `next/` o `next.html`
- **Suite clásica (documentos PDF):** `index.html`
- **Alias:** `arpa-suite.html` → `index.html`

## Estructura

```
index.html          Suite clásica (PWA de documentos)
next/               ARPASuite NEXT — servicio de campo
next.html           Redirección a NEXT
js/                 Módulos de la suite clásica
service-worker.js   Caché PWA (NEXT usa red-primero)
```

## Pruebas NEXT

```
node next/tests/run.mjs
```

Sirva el repo con un servidor local para abrir la app (módulos ES):

```
npx --yes serve -l 4173
```

Luego `http://localhost:4173/next/`
