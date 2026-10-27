# Verificación — carátula y Libro Diario por cuenta

- `index.html` contiene únicamente el dashboard/resumen y no contiene el panel general del Libro Diario.
- La captura manual, importación CSV, edición y eliminación existentes se conservan en `libro_diario.html` usando los mismos módulos JavaScript.
- La barra lateral mantiene los módulos existentes y el acceso a Libro Diario apunta a `libro_diario.html`.
- Balanza de comprobación, Balance General y Estado de Resultados convierten cada cuenta calculada en una fila seleccionable.
- Al seleccionar una cuenta, `reportes.js` filtra `movimientosReporte` por código exacto de cuenta y por el mismo período del reporte.
- El detalle expandido muestra exclusivamente las líneas de esa cuenta: Fecha, Partida, Concepto, Descripción, Debe y Haber.
- No se crea una segunda fórmula contable ni se modifica `motor_contable.js`.
- `node --check js/reportes/reportes.js` y `node --check js/dashboard.js` finalizan sin errores de sintaxis.
