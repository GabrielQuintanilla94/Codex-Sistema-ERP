# Revisión breve — módulo Impuestos / F07

- `js/impuestos/iva.js`: cálculo y resumen del IVA con tres verificaciones independientes.
- `js/impuestos/f07.js`: exportación separada por anexo y verificación estricta de 21/20/23 columnas antes de producir CSV.
- `js/impuestos/impuestos_ui.js`: renderiza solo resumen verificado; cierre y eliminaciones bloquean botones y refrescan la UI desde IndexedDB.

El módulo no inventa compras/ventas: proyecta los registros comerciales del período.
