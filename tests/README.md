# Pruebas de integración
Requieren Node.js, Playwright y Chromium. La aplicación sigue funcionando sin npm ni backend.
En este entorno, desde `/workspace/Codex-Sistema-ERP`:
```sh
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node --test tests/integracion.cjs
```
En otro equipo, `PLAYWRIGHT_MODULE` puede apuntar al módulo Playwright instalado; si es resoluble como `playwright`, basta `node --test tests/integracion.cjs`. `CHROMIUM_PATH` permite seleccionar el ejecutable (predeterminado `/usr/bin/chromium`). Aquí se verificó Playwright 1.62.1 con Chromium del entorno.
El runner crea su propio servidor HTTP en un puerto libre y perfiles efímeros de navegador; no toca los datos del usuario ni necesita el servidor de desarrollo. Cierra servidor y navegador al terminar. Cada prueba usa IndexedDB real.
Cubre pantallas, compras/ventas, edición/eliminación, stock, transacciones abortadas, concurrencia entre pestañas, snapshots obsoletos, corrupción de datos y recuperación, IVA, depreciación idempotente, BI mensual y CSV con confirmación/duplicados/fechas locales. Incluye comparaciones de columnas de Anexos 1/2/3 DTE 01/03 con el manual aportado, identidad fiscal, agrupación diaria, reglas históricas, importación/edición y descarga real. No realiza una presentación ante Hacienda ni simula apagado del sistema operativo.

Las pruebas de routing verifican enlaces únicos, rechazo de ciclos y consumidores ausentes, proyección → Reportes, Inventario sin escrituras desde su vista, conciliación numérica entre pestañas, filtros, reintentos transitorios, Circuit Breaker con Half-Open y trazas persistidas al recargar.

Las pruebas visuales comparan estilos calculados en ocho vistas, incluidos diálogos, y verifican el ancho móvil. Para guardar capturas, definir `ERP_TEST_ARTIFACTS`; el directorio se crea automáticamente.
