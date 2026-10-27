# Pruebas manuales

## Preparación

1. Abra `index.html` con Live Server.
2. Abra las herramientas del navegador y confirme que la consola no tenga errores.
3. Use la misma dirección y puerto durante toda la prueba.

## Catálogo

1. Abra Catálogo de cuentas.
2. Cree una cuenta agrupadora con código nuevo.
3. Cree una cuenta auxiliar debajo de esa cuenta.
4. Confirme que ambas aparecen con la sangría correcta.
5. Intente repetir el código; debe rechazarse.
6. Intente agregar una hija a una cuenta auxiliar; debe rechazarse.
7. Elimine primero la auxiliar y después la agrupadora.

## Libro Diario

1. Cree una partida de dos líneas con el mismo Debe y Haber.
2. Recargue la página y confirme que continúa guardada.
3. Intente guardar una partida descuadrada; debe rechazarse.
4. Elimine la partida y recargue la página.

## Importación

1. Importe `datos/plantilla_partidas.csv`.
2. Revise la vista previa antes de confirmar.
3. Importe un CSV con una cuenta inexistente; debe rechazarse.
4. Importe un CSV con Debe distinto de Haber; debe rechazarse.
5. Confirme que la interfaz no se bloquea durante el procesamiento.

## Eventos

1. Abra Libro Diario y Reportes en dos pestañas con el mismo origen.
2. Registre una partida.
3. Confirme que Reportes actualiza la proyección.
4. En IndexedDB, abra el almacén `eventos` y confirme que existe `PartidaRegistrada`.

## Balanza

1. Abra Reportes.
2. Confirme que Total Debe es igual a Total Haber.
3. Confirme que Cuentas por cobrar presenta saldo deudor cuando corresponde.
4. Confirme que Cuentas por pagar presenta saldo acreedor cuando corresponde.
5. Pruebe un rango de fechas válido y después uno invertido.

## Estado de resultados

1. Seleccione Estado de resultados.
2. Confirme que aparecen únicamente cuentas de ingresos y gastos.
3. Confirme que el resultado es Total ingresos menos Total gastos.
4. Cambie el período y compruebe que los valores se actualizan.

## Balance general

1. Seleccione Balance general.
2. Confirme que la fecha inicial desaparece y queda únicamente la fecha final.
3. Confirme que aparecen Activo, Pasivo y Patrimonio.
4. Confirme que el resultado acumulado aparece dentro de Patrimonio.
5. Confirme que Total activo coincide con Total pasivo más patrimonio.
