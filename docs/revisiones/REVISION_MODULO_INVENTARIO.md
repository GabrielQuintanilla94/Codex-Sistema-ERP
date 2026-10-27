# Revisión breve — módulo Inventario

- `inventario.html`: vista de consulta; no crea movimientos por sí sola.
- `js/inventario/inventario_costos.js`: mantiene promedio ponderado perpetuo y ahora verifica límites, coherencia cantidad/valor y relación con costo promedio en cada transición.
- `js/inventario/inventario_ui.js`: reconstruye desde movimientos, verifica totales antes de renderizar y bloquea el botón Actualizar durante I/O.

Invariante: el inventario se deriva de movimientos contables con metadata de Entrada/Salida; IndexedDB de inventario es una proyección reconstruible.
