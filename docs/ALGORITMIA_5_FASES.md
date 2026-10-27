# Algoritmia de 5 fases — operaciones críticas

## Contrato global
Toda operación que muta el estado contable sigue el mismo orden:

1. **Entrada**: captura, normalización y canonicalización. No persiste.
2. **Validación**: reglas de negocio, invariantes, duplicados, período y triple verificación matemática. No persiste.
3. **Procesamiento**: construye el estado esperado (registro, partida, inventario, cierre o plan). Debe ser determinista respecto de entrada + estado leído.
4. **Persistencia**: escribe de forma aislada; si falla, aplica rollback/restauración.
5. **Verificación**: relee IndexedDB y compara contra el estado esperado. **Solo después** publica el evento EDA.

### Regla EDA
`EventoPublicado => EstadoPersistido && EstadoVerificado`

Un consumidor (BI, impuestos, reportes u otra proyección) nunca debe recibir un evento de una operación que aún no haya superado la fase 5.

## Compras
- F1: `fase1EntradaCompra`
- F2: `fase2ValidarCompra`
- F3: `fase3ProcesarCompra`
- F4: `fase4PersistirCompra`
- F5: `fase5VerificarCompra`
- Eventos posteriores a F5: `CompraRegistrada`, `CompraEditada`.

La fase 5 verifica registro comercial, movimiento contable e inventario persistido contra la reconstrucción esperada.

## Ventas
- F1: `fase1EntradaVenta`
- F2: `fase2ValidarVenta`
- F3: `fase3ProcesarVenta`
- F4: `fase4PersistirVenta`
- F5: `fase5VerificarVenta`
- Eventos posteriores a F5: `VentaRegistrada`, `VentaEditada`.

La fase 2 valida stock acumulado por SKU; la fase 3 recalcula costo por promedio ponderado; la fase 5 comprueba el inventario resultante antes de EDA.

## Eliminación de compra/venta
- F1: `fase1EntradaEliminacionComercial`
- F2: `fase2ValidarEliminacionComercial`
- F3: `fase3ProcesarEliminacionComercial`
- F4: `fase4PersistirEliminacionComercial`
- F5: `fase5VerificarEliminacionComercial`

La fase 3 simula el inventario sin mutar la BD. La fase 4 elimina operación/cierre IVA relacionado y reconstruye inventario. La fase 5 comprueba ausencia del registro/movimiento e igualdad del inventario persistido con el esperado; entonces publica `CompraEliminada` o `VentaEliminada`.

## Cierre IVA
- F1: `fase1EntradaCierreIVA`
- F2: `fase2ValidarCierreIVA`
- F3: `fase3ProcesarCierreIVA`
- F4: `fase4PersistirCierreIVA`
- F5: `fase5VerificarCierreIVA`

Mantiene triple verificación de crédito/débito. La fase 5 relee la partida, vuelve a validar partida doble y publica `IVACerrado`.

## Depreciación
- F1: `fase1EntradaSincronizacionDepreciacion`
- F2: `fase2ValidarSincronizacionDepreciacion`
- F3: `fase3ProcesarSincronizacionDepreciacion`
- F4: `fase4PersistirSincronizacionDepreciacion`
- F5: `fase5VerificarSincronizacionDepreciacion`

La fase 2 fuerza cálculo y triple verificación matemática de todos los activos. La fase 3 planifica de forma idempotente. La fase 4 reemplaza/guarda con rollback. La fase 5 verifica las partidas consolidadas y publica `DepreciacionSincronizada`.

## Importación de partidas
El importador ya utilizaba formalmente las cinco fases (`fase1EntradaImportacion` a `fase5VerificarImportacion`) y se conserva. El contrato de fase 5 continúa exigiendo persistencia antes de `PartidasImportadas`.

## Recuperación
Las operaciones comerciales usan rollback/restauración en fase 4/5. Depreciación usa `revertirSincronizacionDepreciacion`. El cierre IVA elimina el movimiento creado si falla su verificación posterior.

## Verificación realizada
- Sintaxis de todos los `.js`: `node --check`.
- Compra + Venta: persistencia, inventario y eventos posteriores a fase 5.
- Edición de Compra/Venta: inventario reconstruido y eventos posteriores.
- Eliminación de Venta: reversión de inventario y `VentaEliminada` posterior a verificación.
- Cierre IVA: `IVACerrado` solo después de releer la partida persistida.
- Depreciación: `DepreciacionSincronizada` solo después de verificar la partida consolidada persistida.
