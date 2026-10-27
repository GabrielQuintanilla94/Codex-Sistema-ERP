# Revisión breve — módulo Ventas

- `ventas.html`: solo estructura y controles; sin cálculo contable.
- `js/ventas/ventas.js`: fuente única del resumen de venta, validación agregada por SKU y triple verificación antes de persistir.
- `js/ventas/ventas_ui.js`: ya no recalcula IVA por su cuenta; consume el dominio, bloquea botones y refresca inventario/ventas tras mutaciones.
- `js/inventario/inventario_costos.js`: calcula costo de salida por promedio ponderado y valida el estado resultante.
- `js/impuestos/iva.js`: fuente única del 13%.

Hallazgo corregido: varias líneas del mismo SKU podían superar en conjunto la existencia aunque cada línea individual no la superara. Ahora se valida la cantidad acumulada por SKU.
