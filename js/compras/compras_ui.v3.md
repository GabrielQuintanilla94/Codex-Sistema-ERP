# compras_ui.js — reflejo técnico v3

## A. Objetivo
Controlar exclusivamente presentación e interacción del módulo Compras.

## B. Entrada
Formulario manual, selector de proveedor, líneas dinámicas y archivo CSV.

## C. Validación
La UI no replica fórmulas contables. `actualizarTotalesCompra()` llama `calcularResumenCompra(..., { estricto:false })`; la validación estricta permanece en `compras.js`.

## D. Procesamiento
Renderiza proveedores, líneas, totales y compras recientes. La lista se ordena por fecha y, como desempate, por id para mantener salida estable.

## E. Decisión
Registrar, importar y eliminar llaman únicamente funciones de dominio. Los botones se bloquean durante I/O para evitar dobles envíos.

## F. Recuperación
Los errores se muestran en los mensajes de la página. Los botones se rehabilitan mediante `finally` o tras fallo controlado.

## G. Verificación
Los totales solo se renderizan si el resumen reporta tres niveles de verificación válidos. Después de registrar/importar/eliminar se vuelve a leer IndexedDB con `refrescarCompras()`.

## H. Telemetría
El mensaje visible informa el resultado de cada acción; no se introdujo un segundo estado de negocio en la UI.

## Eliminación consistente
La eliminación en cascada sigue delegada a `eliminarCompra()`: registro, partida, inventario y eventual cierre IVA se tratan como una sola operación lógica con restauración compensatoria ante fallos.
