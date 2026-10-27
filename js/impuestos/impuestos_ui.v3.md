# impuestos_ui.js — reflejo técnico v3
A. Objetivo: presentar resumen mensual de IVA y libros fiscales. B. Entrada: compras, ventas y período. C. Validación: filtra por `YYYY-MM`. D. Procesamiento: resume débito/crédito y separa libros por tipo de cliente. E. Decisión: exporta anexo 1, 2 o 3 y permite cierre mensual. F. Recuperación: muestra errores. G. Verificación: recarga datos desde stores al iniciar. H. Telemetría: mensaje visible del resultado de exportación/cierre.


## Refactor 2026-09-28 — eliminación consistente
Las operaciones de compra y venta pueden eliminarse desde su módulo de origen y desde los libros fiscales. La eliminación es en cascada controlada: elimina el registro comercial y su partida, reconstruye inventario desde los movimientos restantes y elimina cualquier cierre de IVA del mismo período para evitar saldos tributarios obsoletos. Antes de mutar IndexedDB se simula la reconstrucción de inventario; si una compra es necesaria para sostener salidas posteriores o costos históricos, la eliminación se rechaza. Ante un fallo durante la mutación, se intenta restaurar registro, movimiento, cierre e inventario original.
