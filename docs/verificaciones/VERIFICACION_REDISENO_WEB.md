# Verificación del rediseño web

El rediseño modifica la presentación del sistema sin sustituir el motor contable, IndexedDB, catálogo, inventario, depreciación, importación CSV ni reportería existentes.

## Cambios visuales

- Navegación principal movida a una barra lateral con iconos en las cinco páginas existentes.
- `index.html` conserva el Libro Diario y agrega, como resumen visual de los mismos datos existentes, cuentas bancarias/caja, Estado de Resultados de los últimos 30 días y distribución de gastos.
- Los gráficos del dashboard reutilizan `generarBalanzaComprobacion()` y `generarEstadoResultados()`; no existe una segunda fórmula contable.
- `reportes.html` conserva exactamente los tres reportes existentes y los presenta como un directorio único: Balanza de comprobación, Balance general y Estado de resultados.
- Catálogo, Inventario y Depreciación conservan sus controles, ids y scripts; solamente adoptan el nuevo shell visual.
- Las áreas de tablas y reportes aprovechan el ancho disponible de la pantalla.

## Archivos modificados

- `index.html`
- `catalogo_cuentas.html`
- `inventario.html`
- `depreciacion.html`
- `reportes.html`
- `css/estilos.css`
- `js/diario/libro_diario.js` (solo presentación del dashboard con cálculos existentes)
- `js/diario/libro_diario.v3.md` (documentación de la capa visual)

## Validaciones

- `js/diario/libro_diario.js` pasa `node --check`.
- No se encontraron ids HTML duplicados en las cinco páginas.
- Los ids utilizados por los módulos existentes se conservaron.
