# Invariante global del sistema contable

Este documento reúne las reglas que ningún proceso puede romper.

## Reglas permanentes

1. Una partida contiene al menos dos líneas.
2. El total Debe es igual al total Haber, calculado en centavos.
3. Cada línea usa una cuenta existente y auxiliar.
4. Una línea no puede tener Debe y Haber al mismo tiempo.
5. Los códigos de cuenta son únicos.
6. Toda cuenta hija tiene una cuenta padre existente.
7. El catálogo no puede contener ciclos.
8. Una cuenta utilizada o con hijos no puede eliminarse.
9. El cambio se guarda antes de publicar su evento.
10. Los reportes leen los datos; no los modifican.
11. El Estado de resultados calcula ingresos menos gastos.
12. El Balance general cumple Activo = Pasivo + Patrimonio, incluyendo el resultado acumulado.
13. Una salida de inventario no puede superar la existencia disponible del SKU.
14. El costo promedio de inventario se calcula con `round(valorInventarioCentavos / cantidad)` después de cada entrada.
15. Cantidades de entrada/salida deben ser mayores que cero y los costos de entrada no pueden ser negativos.
16. El estado de inventario usa `sku` como identificador persistente y `PROMEDIO_PONDERADO_PERPETUO` como método actual.

## A. Objetivo

Mantener catálogo, partidas, inventario, eventos y reportes consistentes.

## B. Entrada (Zero-Trust)

Formularios, CSV, JSON, mensajes del Web Worker y mensajes de otras pestañas se consideran no confiables hasta ser validados.

## C. Validación

Se revisan tipos, campos obligatorios, fechas, importes, cuentas, duplicados, relaciones padre-hijo, partida doble, SKU, cantidades, costos y existencias disponibles.

## D. Procesamiento

Los importes se convierten a centavos. El catálogo se representa como lista de adyacencia, los saldos se acumulan por código de cuenta y el inventario se valúa por SKU mediante promedio ponderado perpetuo.

## E. Decisión

El proceso continúa únicamente cuando todas sus reglas se cumplen. Un error detiene el cambio antes de afectar procesos posteriores.

## F. Recuperación

IndexedDB aborta las transacciones fallidas. Los procesos de cuenta revierten el cambio en memoria cuando falla la escritura. Los reportes pueden reconstruirse desde cuentas y partidas.

## G. Verificación

Después de guardar o eliminar, se vuelve a consultar IndexedDB. La balanza confirma que Total Debe y Total Haber sean iguales y el Balance general verifica la ecuación contable.

## H. Telemetría

Se registran operaciones, rechazos, eventos y última actividad sin guardar contraseñas, claves ni datos secretos.

## Disparadores EDA

- `CuentaCreada`
- `CuentaEliminada`
- `PartidaRegistrada`
- `PartidaEliminada`
- `PartidasImportadas`

Cada evento debe tener identificador, tipo, entidad, entidadId, fecha, versión y datos.

## Aborto

Un proceso se detiene cuando falla una validación, una transacción, la verificación posterior o el contrato del evento. El error se muestra al usuario y no debe convertirse en un éxito aparente.
