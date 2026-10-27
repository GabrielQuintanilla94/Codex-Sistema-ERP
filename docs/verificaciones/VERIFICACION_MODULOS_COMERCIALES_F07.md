# Verificación — Compras, Ventas, IVA y F07

## Alcance implementado

1. Registro individual de compras con proveedor/NRC, múltiples materiales, IVA Crédito Fiscal automático e inventario.
2. Importación CSV de compras agrupando filas por documento y NRC.
3. Registro individual de ventas a contribuyente o consumidor final, múltiples SKU, IVA Débito Fiscal, salida de inventario y costo de ventas.
4. Importación CSV de ventas agrupando filas por documento y NRC.
5. Catálogo inicial de terceros con razón social, NRC y giro.
6. Cuentas 1105 IVA Crédito Fiscal, 1106 Remanente de crédito fiscal, 2102 IVA Débito Fiscal y 2103 IVA por pagar.
7. Resumen mensual de IVA y libros tributarios.
8. Exportación F07 sin encabezados: Anexo 1 ventas a contribuyentes, Anexo 2 consumidor final y Anexo 3 compras.
9. Cierre mensual idempotente mediante referencia `IVA-CIERRE-YYYY-MM`.
10. Libro Diario retirado de la navegación principal; la persistencia contable permanece.

## Invariantes

- IVA = 13% calculado en centavos.
- Compra: Debe Inventario + IVA Crédito = Haber Cuentas por pagar.
- Venta: Debe Caja/CxC = Haber Ventas + IVA Débito; costo de venta e inventario se calculan con promedio ponderado.
- No se permite vender más unidades que la existencia disponible.
- Un documento no se registra dos veces para el mismo tercero.
- Los CSV F07 se generan sin encabezados.
- Los campos de compras exentas/no sujetas/importaciones no utilizados por el MVP se exportan como `0.00`.

## Nota de alcance fiscal

El formato se construyó siguiendo la estructura de los anexos del manual F07 V14 aportado al proyecto. Como este es un MVP académico y algunos identificadores DTE se simplifican desde el campo `documento`, cualquier uso tributario real debe probarse primero contra el validador vigente del Ministerio de Hacienda.
