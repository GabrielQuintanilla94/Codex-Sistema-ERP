# Verificación del routing EDA — 30 de octubre de 2026
Se agregó `js/eventos/routing_eventos.js` y su documento individual `docs/instrucciones/js/eventos/routing_eventos.md`. Tiene fase 0 y cuatro fases delimitadas, con nomenclatura A–H exacta en las instrucciones. No se renombraron funciones públicas existentes ni se alteraron las cinco fases del dominio.

## Resultado ejecutado
**40 pruebas aprobadas, 0 fallidas, 0 omitidas**, en Chromium con IndexedDB real. Las 33 pruebas previas siguen pasando. `node --check` valida los 31 archivos JavaScript y `git diff --check` no presenta errores.

## Rutas comprobadas
- Cobertura de todos los eventos, ausencia de ciclos y rechazo de dependencias desconocidas.
- Inicialización repetida sin duplicar suscripciones; error ante consumidores locales requeridos ausentes.
- Compra/venta → bus → router → proyección → Reportes; Inventario y BI reciben sus rutas en sus respectivas pestañas.
- Reportes mantiene filtros y Inventario no escribe su almacén mientras actualiza la vista.
- Dos reintentos transitorios; los errores de invariantes no se reintentan. Tras dos fallos se abre el circuito; se verifica el sondeo Half-Open y su cierre tras éxito.
- Traza con resultado fallido/omitido para dependencias; estado en-proceso antes del consumidor y registro final legible después de recargar.

## Conciliación independiente
En una base efímera: compra 10 × $10, IVA $13; venta 2 × $20, IVA $5.20. Se exige inventario 8 unidades/$80, costo $20, ventas $40, resultado $20, activos $138.20 y pasivos $118.20. La suma de pasivos y resultado da $138.20. Se verifican cifras literales del balance visible, su proyección y el inventario; tras eliminar la venta, inventario 10/$100 y activos $113. No se pulsa Actualizar entre operaciones.

## Reproducción
Desde la raíz, ejecutar el comando de `tests/README.md`. Para inspeccionar una página: `obtenerEstadoRoutingEventos()` y `verificarEnlacesRoutingEventos()`. La traza usa `routing:<pagina>:<eventoId>` en `proyecciones`.

## Límites declarados
La entrega entre pestañas depende de `BroadcastChannel` y mismo origen. Una pestaña cerrada recalcula al abrirse, no reproduce automáticamente el historial. Trazas de pestañas con el mismo perfil/evento comparten clave. El router no introduce un broker externo ni entrega exactamente una vez. Los documentos declaran estos límites y distinguen el event loop del navegador de Epoll, y `Map` de hashing perfecto.
