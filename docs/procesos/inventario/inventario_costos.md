# Proceso — inventario_costos.js

## Qué es este archivo
Motor de valuación de inventario por promedio ponderado perpetuo.

## Propósito
Interpretar las líneas de la cuenta `1104 Inventario de materiales` que incluyan `tipoInventario`, `sku` y `cantidadInventario`; calcular entradas, salidas y costo de venta; y reconstruir el estado derivado del inventario.

## Reglas
- Entrada: `1104` al Debe + SKU + unidades.
- Salida: `1104` con tipo `Salida` + SKU + unidades; el costo se calcula automáticamente.
- Costo promedio: `CP_n = (V_{n-1} + C_entrada) / (Q_{n-1} + Q_entrada)`.
- Costo de salida: `CV = Q_salida × CP_vigente`.
- La salida genera automáticamente el Debe en `5001 Materiales` y el Haber en `1104`.
- No se permite una salida superior a la existencia.

## Fuente de verdad
El Libro Diario. El store `inventario` funciona como proyección/cache reconstruible.
