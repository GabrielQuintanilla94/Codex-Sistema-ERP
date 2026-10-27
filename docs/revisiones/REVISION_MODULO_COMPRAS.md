# Revisión breve — módulo Compras

- `compras.html`: estructura correcta; no mezcla lógica contable.
- `js/compras/compras.js`: se eliminó la duplicación del cálculo de totales y se añadió triple verificación antes de contabilizar.
- `js/compras/compras_ui.js`: ahora consume el cálculo del dominio, bloquea botones durante I/O y refresca IndexedDB después de cada mutación.
- `js/impuestos/iva.js`: se convirtió en fuente única del cálculo del 13% con verificación matemática en tres niveles.
- `js/comercial/operaciones.js`: se conserva; ya centraliza balance, persistencia compensatoria y eliminación consistente.
- `js/comercial/importador_csv.js`: se conserva; su responsabilidad es parsear/agrupar, no calcular IVA ni contabilizar.
- `js/base_datos.js`: se conserva; persiste compras y movimientos sin incorporar reglas de dominio.
- `js/inventario/inventario_costos.js`: se conserva; compras reutiliza su simulación y reconstrucción de inventario.

Resultado: cálculo aislado de UI, menor redundancia, salida determinista, triple verificación matemática y refresco inmediato tras acciones de usuario.
