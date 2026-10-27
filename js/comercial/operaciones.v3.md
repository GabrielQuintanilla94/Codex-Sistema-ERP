# operaciones.js — reflejo técnico v3

## A. Objetivo
Compartir invariantes de compras y ventas: centavos, IDs, documento, fecha, partida doble y persistencia coordinada.
## B. Entrada
Registros comerciales y movimientos contables.
## C. Validación
Fecha ISO, documento no vacío y Debe=Haber en centavos.
## D. Procesamiento
`persistirOperacionComercial()` guarda primero la partida, luego la operación y reconstruye inventario.
## E. Decisión
Compra y venta usan el mismo orquestador con el CRUD específico.
## F. Recuperación
Ante error, elimina operación/partida y reconstruye el inventario anterior.
## G. Verificación
La operación solo se considera persistida si contabilidad, registro comercial e inventario terminan correctamente.
## H. Telemetría
No conserva estado mutable.


## Refactor 2026-09-28 — eliminación consistente
Las operaciones de compra y venta pueden eliminarse desde su módulo de origen y desde los libros fiscales. La eliminación es en cascada controlada: elimina el registro comercial y su partida, reconstruye inventario desde los movimientos restantes y elimina cualquier cierre de IVA del mismo período para evitar saldos tributarios obsoletos. Antes de mutar IndexedDB se simula la reconstrucción de inventario; si una compra es necesaria para sostener salidas posteriores o costos históricos, la eliminación se rechaza. Ante un fallo durante la mutación, se intenta restaurar registro, movimiento, cierre e inventario original.


## ACTUALIZACIÓN — ALGORITMIA DE 5 FASES
Eliminación comercial: fase1EntradaEliminacionComercial → fase2ValidarEliminacionComercial → fase3ProcesarEliminacionComercial → fase4PersistirEliminacionComercial → fase5VerificarEliminacionComercial. Incluye simulación de inventario, rollback y verificación antes del evento.
