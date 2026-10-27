# Pruebas de integración
Requieren Node.js, Playwright y Chromium. La aplicación sigue funcionando sin npm ni backend.
En este entorno, desde `/workspace/Codex-Sistema-ERP`:
```sh
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node --test tests/integracion.cjs
```
En otro equipo, `PLAYWRIGHT_MODULE` puede apuntar al módulo Playwright instalado; si es resoluble como `playwright`, basta `node --test tests/integracion.cjs`. `CHROMIUM_PATH` permite seleccionar el ejecutable (predeterminado `/usr/bin/chromium`). Aquí se verificó Playwright 1.62.1 con Chromium del entorno.
El runner crea su propio servidor HTTP en un puerto libre y perfiles efímeros de navegador; no toca los datos del usuario ni necesita el servidor de desarrollo. Cierra servidor y navegador al terminar. Cada prueba usa IndexedDB real.
Cubre pantallas, compras/ventas, edición/eliminación, stock, transacciones abortadas, concurrencia entre pestañas, snapshots obsoletos, corrupción de datos y recuperación, IVA, depreciación idempotente, BI mensual y CSV con confirmación/duplicados/fechas locales. No certifica los anexos fiscales contra normativa oficial ni simula apagado del sistema operativo.
