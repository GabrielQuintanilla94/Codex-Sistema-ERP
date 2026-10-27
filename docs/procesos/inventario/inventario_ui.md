# Proceso — inventario_ui.js

## Qué es este archivo
Es la capa de presentación del inventario. No registra compras ni ventas.

## Propósito
Reconstruir y mostrar existencias, costo promedio, valor del inventario e historial de unidades a partir de las partidas almacenadas en el Libro Diario.

## Flujo
1. Lee `movimientos` desde IndexedDB.
2. Ejecuta `reconstruirInventarioDesdeMovimientos(movimientos)`.
3. Renderiza existencias actuales y el historial Entrada/Salida por SKU.
4. El botón **Actualizar** vuelve a derivar el reporte desde el Diario.

## Invariante
`inventario_ui.js` no es fuente de verdad: `Inventario = f(LibroDiario)`.
