# Revisión breve — Base de datos

- `base_datos.js`: mantiene IndexedDB como adaptador de persistencia, con transacciones y verificación posterior.
- Compras, ventas, inventario, eventos y proyecciones siguen separados por stores.
- No se trasladó lógica contable a persistencia.

No se cambió el esquema en esta pasada para evitar una migración innecesaria.
