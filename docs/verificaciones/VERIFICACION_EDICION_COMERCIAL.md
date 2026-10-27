# Verificación de edición comercial

- Compras y ventas registradas manualmente o por CSV pueden cargarse nuevamente al formulario mediante **Editar**.
- La edición reemplaza la operación de origen y recalcula inventario, IVA, partida contable, costo de venta y datos F07 derivados.
- IVA/F07 no se edita directamente: **Editar origen** abre la compra o venta correspondiente.
- Si el período original o el período destino tiene una partida `IVA-CIERRE-AAAA-MM`, la edición se bloquea.
- Antes de mutar IndexedDB se simula el inventario completo con la operación editada.
- Si una escritura falla, se restaura la operación, movimiento e inventario originales.
- Se mantienen las verificaciones matemáticas existentes de compras, ventas e IVA.
