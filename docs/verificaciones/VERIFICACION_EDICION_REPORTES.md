# Verificación — edición de partidas y reportería ampliada

## Edición de partidas
- Se habilita `Editar partida` únicamente para orígenes `Manual` y `CSV`.
- Se reutiliza el formulario tabular del Libro Diario.
- La actualización conserva `id`, `origen` y `creadoEn`, y agrega `editadoEn`.
- `actualizarMovimientoBD()` usa `put` para reemplazar por clave existente.
- Se excluye el mismo `id` al validar duplicados de número y referencia.
- El inventario se reconstruye después de editar; si falla, se restaura la partida original.
- Se publica `PARTIDA_EDITADA` para reconstruir las proyecciones contables.
- Las partidas automáticas de depreciación no son editables.
- Una adquisición de activo fijo que ya tiene depreciación contabilizada queda protegida contra edición para no romper la relación activo/período.

## Reportes
- `reportes.html` usa `contenedor-reportes`.
- Ancho de escritorio: hasta 1440 px.
- Balanza: tabla mínima de 1120 px y celdas más amplias.
- Balance General: dos columnas amplias en escritorio y una columna en pantallas menores a 980 px.
- Estado de Resultados: deja de estar limitado a 780 px y aprovecha el ancho disponible.

## Validación técnica
Se ejecutó `node --check` sobre los JavaScript modificados y no se detectaron errores de sintaxis.
