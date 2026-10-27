# Verificación de eliminación de operaciones

Se incorporó eliminación controlada para Compras y Ventas desde sus pantallas y desde Impuestos/F07.

## Invariantes
- Eliminar una compra/venta elimina el registro comercial y su movimiento contable asociado.
- Inventario se reconstruye desde movimientos restantes; no se modifica como dato fuente independiente.
- Antes de eliminar se simula el inventario restante. Si una compra eliminada vuelve inválida una salida posterior, la operación se bloquea.
- Si el período tenía movimiento `IVA-CIERRE-YYYY-MM`, dicho cierre se elimina porque queda obsoleto y debe contabilizarse nuevamente.
- Si falla la eliminación, se intenta restaurar el estado original.
- Los libros F07 son proyecciones: eliminar desde Impuestos invoca la misma eliminación de la operación de origen.

## UX
- Compras, Ventas y cada libro F07 muestran botón `Eliminar`.
- Se solicita confirmación explícita antes de ejecutar la cascada.
