# Pruebas manuales — versión afinada

Empiece con IndexedDB vacío. Use F12 > Application > IndexedDB > `LibroDiarioDAG_v3` > Delete database y recargue.

## 1. Catálogo y apertura

1. Abra Inicio y luego Catálogo.
2. Verifique que existan Caja 1101, Bancos 1102, CxC 1103, Inventario 1104, IVA Crédito 1105, Remanente 1106, CxP 2101, IVA Débito 2102, IVA por pagar 2103, Ventas 4101 y Costo 5001.
3. Entre a Nueva partida e importe/registre la apertura.
4. En Reportes > Balanza, confirme Debe=Haber y Saldo deudor=Saldo acreedor.

## 2. Compras

1. Registre una compra de un SKU nuevo: base 100.00, cantidad 10.
2. Debe mostrar IVA 13.00 y total 113.00.
3. Inventario debe mostrar 10 unidades y valor 100.00.
4. Impuestos debe mostrar 13.00 de IVA Crédito.
5. Elimine la compra; todo lo anterior debe revertirse.

## 3. Ventas

1. Vuelva a registrar la compra de 10 unidades.
2. Venda 2 unidades a consumidor final a 20.00 cada una.
3. Debe mostrar base 40.00, IVA 5.20, total 45.20.
4. Inventario debe bajar a 8 unidades.
5. Estado de resultados debe mostrar ventas y costo de ventas.
6. Prueba de protección: agregue dos líneas del mismo SKU con 6 unidades cada una. Debe rechazar la venta por exceder 10 unidades acumuladas.
7. Registre otra venta a contribuyente y confirme que aparece en el libro F07 correcto.

## 4. IVA / F07

1. Seleccione el mes de las operaciones.
2. Compruebe Débito, Crédito y diferencia.
3. Descargue Anexo 3: cada fila debe tener 21 columnas.
4. Descargue Anexo 1: cada fila debe tener 20 columnas.
5. Descargue Anexo 2: cada fila debe tener 23 columnas.
6. Contabilice cierre IVA una vez; un segundo intento debe rechazarse.
7. Elimine una compra/venta del mes cerrado; el cierre debe invalidarse/eliminarse y exigir recalcular.

## 5. Depreciación

1. Registre un activo fijo por partida manual con fecha disponible para uso.
2. Abra Depreciación y seleccione fecha de corte.
3. Meses futuros/abiertos deben mostrar `—`.
4. Contabilice al corte; debe generarse una sola partida consolidada por período.
5. Repita; no debe duplicar cuotas ya contabilizadas.

## 6. Reportes y drill-down

1. Genere Balanza, Estado de resultados y Balance general.
2. Ninguno debe mostrar resultado si su verificación matemática falla.
3. En cada reporte, haga clic en una cuenta. Debe mostrar solo movimientos de ese código y del período seleccionado.
4. Después de eliminar una compra/venta desde el drill-down, el reporte debe refrescarse sin recargar la página.

## 7. Botones / UI

Pruebe Registrar, Importar, Eliminar, Actualizar inventario, Contabilizar IVA, Actualizar/Contabilizar depreciación y Generar reporte. Durante la operación no deben permitir doble clic efectivo y al finalizar la pantalla debe reflejar IndexedDB sin F5.
