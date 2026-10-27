# ventas_ui.js — reflejo técnico v3
A. Objetivo: captura manual e importación CSV de ventas. B. Entrada: formulario, inventario y catálogo de terceros. C. Validación: el dominio valida NRC, stock y montos. D. Procesamiento: líneas dinámicas y cálculo visual de base/IVA/total. E. Decisión: consumidor final oculta identificación; contribuyente exige tercero. F. Recuperación: muestra errores. G. Verificación: recarga inventario y ventas desde IndexedDB. H. Telemetría: mensajes visibles de éxito/error.


## Refactor 2026-09-28 — eliminación consistente
Las operaciones de compra y venta pueden eliminarse desde su módulo de origen y desde los libros fiscales. La eliminación es en cascada controlada: elimina el registro comercial y su partida, reconstruye inventario desde los movimientos restantes y elimina cualquier cierre de IVA del mismo período para evitar saldos tributarios obsoletos. Antes de mutar IndexedDB se simula la reconstrucción de inventario; si una compra es necesaria para sostener salidas posteriores o costos históricos, la eliminación se rechaza. Ante un fallo durante la mutación, se intenta restaurar registro, movimiento, cierre e inventario original.

## Afinación octubre 2026
- La UI consume `calcularResumenVenta()` y no replica la fórmula del IVA.
- Registrar, importar y eliminar bloquean el control durante I/O y refrescan desde IndexedDB.
- Se usa fecha local, no UTC, para el valor inicial del formulario.
