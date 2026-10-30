# Consulta mensual de Operaciones
Se agregó `ops-periodo` (Período de consulta). `opsRefrescarResumen` usa ese mes en lugar de forzar el mes actual; los listados de Compras/Ventas y el selector de IVA consultan el mismo período. Se conservan los identificadores DOM y los nombres públicos existentes.
Sin preferencia explícita se elige el mes más reciente con operaciones; en una base vacía se usa el mes actual. La selección explícita se recuerda en almacenamiento local. Consultar no modifica documentos, movimientos ni fechas de captura.
El consumidor `operaciones` del router relee los datos tras altas, ediciones, eliminaciones y cierre IVA, incluso entre pestañas. Las invalidaciones del resumen se agrupan mientras hay una lectura en curso.
## Evidencia ejecutada
**50 pruebas aprobadas, 0 fallidas, 0 omitidas** en Chromium con IndexedDB real, incluidas las 46 anteriores. Sintaxis correcta en los 31 JavaScript y sin errores de whitespace.
Los nuevos casos prueban septiembre/octubre con indicadores y tablas independientes, alineación con IVA, persistencia de selección al recargar, pestaña Ventas, fechas de formularios intactas, meses vacíos sin cambios en BD, recepción desde otra pestaña y rechazo de períodos inválidos. Las consultas comerciales usan los registros de sus módulos; no convierten partidas manuales en compras/ventas automáticamente.
Reproducción: `tests/README.md`.
