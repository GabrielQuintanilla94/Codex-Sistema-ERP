# Afinación general del sistema contable

## Criterio aplicado

1. Revisar cada archivo por responsabilidad.
2. Afinar módulo por módulo sin mover lógica innecesariamente.
3. Aplicar verificaciones matemáticas múltiples antes de renderizar o contabilizar.
4. Evitar que la UI replique fórmulas de dominio.
5. Hacer que botones de mutación/actualización bloqueen durante I/O y refresquen desde IndexedDB.
6. Exigir determinismo: orden estable, una sola marca temporal por operación/lote y mismos datos => mismo cálculo.
7. Mantener aislamiento: dominio, UI y persistencia separados.
8. Hacer una pasada global de navegación, archivos redundantes, sintaxis y referencias.

## Cambios funcionales relevantes

- Compras: ya afinado previamente; triple verificación y UI refrescada.
- Ventas: triple verificación, validación acumulada por SKU y una sola fuente de cálculo.
- Inventario: triple control de estado por transición y control antes de render.
- IVA: triple control tanto por operación como por resumen mensual.
- F07: valida número exacto de columnas por anexo antes de exportar.
- Reportes: cada estado pasa triple verificación matemática antes de mostrarse.
- Importación de partidas: orden estable y marca temporal única por lote.
- Navegación: `nav.js` es fuente única; se quitó navegación HTML duplicada.
- Se eliminó la vista general redundante del Libro Diario; se conserva `partida_manual.html`.

## Archivos revisados sin cambio funcional

Depreciación, catálogo, eventos, terceros, parser CSV y base de datos fueron revisados y conservados cuando su separación/responsabilidad ya era correcta.

## Regla global

Una operación comercial confirmada debe reflejar de forma coherente contabilidad, inventario, IVA y proyección fiscal. Si una verificación crítica falla, el resultado no debe presentarse como válido.
