# Verificación — afinación completa

Fecha de revisión: octubre de 2026.

## Alcance

Se revisaron 29 archivos JavaScript, 9 HTML, 6 archivos de datos y la documentación asociada. La revisión siguió: afinación módulo por módulo, verificación matemática múltiple, actualización inmediata de UI, reducción de redundancia, determinismo y aislamiento.

## Comprobaciones ejecutadas

- Sintaxis de todos los `.js` con `node --check`: OK.
- Referencias locales `src` / `href` de todos los HTML: sin archivos faltantes.
- IDs usados por las UI contra IDs presentes en sus HTML: sin referencias faltantes.
- Navegación: `nav.js` queda como fuente única y todos los HTML lo cargan.
- Código redundante de dashboard dentro del módulo de partidas: eliminado.
- Vista general redundante `libro_diario.html` y duplicados raíz no usados: eliminados.

## Pruebas matemáticas automatizadas ejecutadas

1. IVA sobre base 100.00 = 13.00; total = 113.00.
2. Compra de 10 unidades por 100.00: triple verificación OK.
3. Inventario tras compra: 10 unidades, valor 100.00.
4. Venta de 2 unidades a 20.00: base 40.00, IVA 5.20, total 45.20.
5. Venta: triple verificación OK.
6. Inventario tras venta: 8 unidades, valor 80.00 bajo el caso de costo uniforme probado.
7. Dos líneas del mismo SKU cuya suma excede existencia: venta rechazada.
8. F07: Compras 21 columnas, Ventas contribuyentes 20, Consumidor final 23.
9. Balanza: triple verificación OK.
10. Estado de resultados: triple verificación OK.
11. Balance general: triple verificación OK.

Resultado del harness de dominio: `ALL_CORE_TESTS_OK`.

## Hallazgos relevantes corregidos

- Ventas validaba existencia por línea, no acumulada por SKU. Corregido.
- Ventas UI replicaba el cálculo de base/IVA. Ahora consume el dominio.
- Inventario no tenía una compuerta explícita de verificación múltiple por transición. Agregada.
- Resumen mensual de IVA no tenía triple verificación. Agregada.
- Exportadores F07 no bloqueaban una estructura con cantidad incorrecta de columnas. Agregado control exacto por anexo.
- Reportes validaban ecuaciones principales, pero no exponían una verificación de tres niveles antes del render. Agregada.
- Importación de partidas usaba marcas temporales distintas dentro del mismo lote. Ahora usa snapshot único y orden estable.
- Había navegación repetida en cada HTML además de `nav.js`. Eliminada la duplicación.
- `js/diario/libro_diario.js` contenía lógica de dashboard ajena a su responsabilidad. Eliminada.

## Elementos conservados deliberadamente

- IndexedDB y su esquema: no se aumentó versión porque no era necesario para esta afinación.
- Depreciación: ya contaba con separación dominio/UI y triple verificación.
- Catálogo: ya aplicaba validación DAG y persistencia por fases.
- Eventos, terceros y parser CSV: se conservaron al no existir una mejora funcional que justificara un refactor adicional.

## Próximo paso

Ejecutar `docs/PRUEBAS_AFINACION_COMPLETA.md` en navegador con IndexedDB limpio antes de revisar código línea por línea.
