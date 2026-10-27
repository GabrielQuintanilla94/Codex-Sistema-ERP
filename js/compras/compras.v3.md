# compras.js — reflejo técnico v3

## A. Objetivo
Registrar compras de materiales una sola vez y producir inventario, asiento contable, IVA Crédito Fiscal y datos para el libro de compras/F07.

## B. Entrada
Fecha, documento, proveedor, NRC y una o más líneas SKU/cantidad/monto gravado.

## C. Validación
`validarLineaCompra()` exige SKU, descripción, cantidad positiva y monto positivo. `registrarCompra()` exige que el NRC exista en terceros y rechaza duplicados por `COMPRA|fecha|nrc|documento`.

## D. Procesamiento
`calcularResumenCompra()` es la única ruta para sumar la base y obtener IVA/total. Trabaja en centavos y reutiliza `calcularIVA()`. `construirCompra()` debita 1104 Inventario e 1105 IVA Crédito Fiscal y acredita 2101 Cuentas por pagar.

## E. Decisión
Las líneas de inventario se envían a `prepararMovimientoConInventario()` para reutilizar promedio ponderado. Registro manual e importación masiva terminan en `registrarCompra()`.

## F. Recuperación
`persistirOperacionComercial()` revierte partida, registro e inventario si falla persistencia. La eliminación comercial mantiene su compensación existente.

## G. Verificación
Antes de contabilizar se aplican tres niveles:
1. suma de líneas = base gravada;
2. IVA y total superan la triple verificación de `iva.js`;
3. inventario, IVA, proveedor y partida doble coinciden con el resumen.
Después de persistir, `registrarCompra()` vuelve a leer IndexedDB y verifica `id` + `movimientoId`.

## H. Telemetría
El registro conserva `movimientoId`, origen y un único `creadoEn` compartido con su movimiento. No mantiene estado global mutable.


## ACTUALIZACIÓN — ALGORITMIA DE 5 FASES
Compras: registrar/editar usa fase1EntradaCompra → fase2ValidarCompra → fase3ProcesarCompra → fase4PersistirCompra → fase5VerificarCompra. El evento EDA se publica únicamente tras verificar registro, movimiento e inventario persistidos.
