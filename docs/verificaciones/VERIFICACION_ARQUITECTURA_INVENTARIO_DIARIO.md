# Verificación — inventario derivado del Libro Diario

- `inventario.html`: reporte únicamente.
- `inventario_ui.js`: no contiene formularios de compra/venta ni crea movimientos.
- `libro_diario.js`: captura `Entrada/Salida`, `SKU` y `CantidadInventario` en líneas 1104.
- `partidas_worker.js`: reconoce esas tres columnas en CSV.
- `importador_partidas.js`: aplica valuación secuencial antes de persistir el lote.
- `inventario_costos.js`: calcula promedio ponderado, costo de salida y reconstrucción.
- `datos/plantilla_partidas.csv`: incluye ejemplo de compra y venta con unidades.
- La cuenta 5001 está habilitada para recibir la línea automática de costo.

Regla central: `Inventario = f(MovimientosLibroDiario)`.
