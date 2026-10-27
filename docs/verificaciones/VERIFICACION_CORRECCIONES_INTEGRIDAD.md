# Correcciones de integridad — 27 de octubre de 2026
## Cambios
- Activos fijos y matriz usan `depreciacion_ui.js` con controles específicos de cada vista; se eliminó la referencia al archivo ausente. Activos carga tipos/bus para publicar depreciación verificada.
- `estadoPersistidoCoincide` compara contenido completo; compras, ventas, partidas manuales, importación, IVA y depreciación releen sus escrituras antes de publicar.
- `aplicarCambioContableBD` agrupa cambios entre almacenes en una transacción atómica. Contrasta el snapshot de movimientos antes de escribir. `ejecutarConBloqueoContable` serializa las rutas de mutación entre pestañas mediante Web Locks, desde lectura/validación hasta verificación/evento.
- Los errores de fase 5 recuperan altas, ediciones, eliminaciones, importaciones y depreciación sin emitir eventos. Las recuperaciones fallidas se propagan en lugar de ocultarse. Un fallo al publicar después de verificar conserva la operación; no se revierte después de notificar consumidores.
- El inventario reconstruido usa la marca temporal del movimiento, no el reloj de cada cálculo. Se conserva `actualizadoEn` y el promedio ponderado.
- La confirmación del CSV relee IndexedDB, valida nuevamente duplicados y calcula IDs desde estado persistido. Worker: `dd/mm/yyyy` e ISO. Se mantiene prevalidación → confirmación → persistencia → refresco.
- La edición de venta valida stock sin su versión anterior. Nuevas compras/ventas se rechazan en un período con cierre IVA, igual que las ediciones. La eliminación comercial conserva la regla existente de retirar el cierre asociado.
- El BI conserva el período seleccionado y repite la lectura si recibe otra invalidación mientras refresca.
## Validación
Suite reproducible: `tests/integracion.cjs`; instrucciones: `tests/README.md`. Ejecutada en Chromium con IndexedDB real: **20 pruebas aprobadas, 0 fallidas, 0 omitidas**. También se revisa sintaxis con `node --check` y whitespace con `git diff --check`.
## Límites
F07/DTE: el exportador aún reutiliza `documento` en campos de identificación fiscal. Quedan pendientes la captura separada de identificadores reales y el contraste de cada columna con el manual oficial vigente. Los cambios del cierre IVA no certifican esos anexos.
Web Locks requiere un contexto seguro (HTTPS o localhost); sin soporte se rechazan mutaciones en vez de ejecutar escrituras concurrentes sin protección. Los consumidores EDA existentes no constituyen una cola durable con reintentos: una publicación fallida requiere diagnóstico y reconstrucción de proyecciones desde estado persistido. Las pruebas no simulan cierre del navegador entre commit y fase 5; no se garantiza recuperación automática de ese intervalo ante caída del proceso.
