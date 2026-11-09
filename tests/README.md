# Pruebas automatizadas

Desde VS Code: `npm.cmd ci` una vez y `npm.cmd run qa` para ejecutar y abrir el reporte HTML. Requiere Node.js 24.8 o posterior. Instrucciones: [QA práctico](../docs/QA_PRACTICO.md).

Para ejecutar solo integración: `node --test tests/integracion.cjs`. Solo HTML5 estático: `npm.cmd run qa:html` o `node --test tests/html/estatico.test.cjs` (criterios en `docs/QA_ESTATICO_HTML5.md`). El navegador se detecta automáticamente; `CHROMIUM_PATH` permite indicar otro ejecutable y `PLAYWRIGHT_MODULE` otro módulo compatible.

El runner crea su propio servidor HTTP en un puerto libre y perfiles efímeros de navegador; no toca los datos del usuario ni necesita el servidor de desarrollo. Cierra servidor y navegador al terminar. Cada prueba usa IndexedDB real.
Cubre pantallas, compras/ventas, edición/eliminación, stock, transacciones abortadas, concurrencia entre pestañas, snapshots obsoletos, corrupción de datos y recuperación, IVA, depreciación idempotente, BI mensual y CSV con confirmación/duplicados/fechas locales. Incluye comparaciones de columnas de Anexos 1/2/3 DTE 01/03 con el manual aportado, identidad fiscal, agrupación diaria, reglas históricas, importación/edición y descarga real. No realiza una presentación ante Hacienda ni simula apagado del sistema operativo.

Las pruebas de routing verifican enlaces únicos, rechazo de ciclos y consumidores ausentes, proyección → Reportes, Inventario sin escrituras desde su vista, conciliación numérica entre pestañas, filtros, reintentos transitorios, Circuit Breaker con Half-Open y trazas persistidas al recargar.

Las pruebas visuales comparan estilos calculados en ocho vistas, incluidos diálogos, y verifican el ancho móvil. Para guardar capturas, definir `ERP_TEST_ARTIFACTS`; el directorio se crea automáticamente.
