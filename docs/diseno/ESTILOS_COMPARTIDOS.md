# Reglas visuales compartidas
Todas las vistas funcionales cargan `css/estilos.css` y, después, `css/componentes.css`. No hay temas de color por módulo ni CSS incrustado en el HTML. Las páginas de Compras, Ventas e Impuestos que redirigen a Operaciones no tienen una interfaz separada.

## Fuente común de apariencia
`componentes.css` define colores, tipografía, encabezados, botones, tarjetas, controles, tablas y diálogos. Usa los mismos tokens para Inicio, Operaciones, Inventario, Activos, Matriz, Reportes, Catálogo y Partidas manuales. Incluye los diálogos situados fuera de `.app-shell`.
- Acción principal: azul `--erp-blue`; cancelar/secundaria: fondo blanco y borde azul; eliminación: rojo semántico.
- Encabezados: tipografía, color y separador comunes; tarjetas con borde y radio compartidos.
- Formularios: controles de 40 px como mínimo, borde y foco comunes; solo lectura con fondo neutro.
- Tablas: cabeceras, tipografía, bordes y hover comunes. Los importes conservan su alineación y colores semánticos cuando corresponde.
- Los estados de error, advertencia, éxito y acciones peligrosas se distinguen por significado, no por módulo.

`estilos.css` conserva distribución, jerarquías, medidas de columnas y compatibilidad de componentes existentes. Se retiró el bloque de identidad cromática por módulo. Las excepciones de distribución no cambian la apariencia: por ejemplo, la matriz puede desplazarse horizontalmente y Operaciones tiene un resumen lateral.

## Mantenimiento
No agregar colores, bordes ni tipografías por página o ID. Agregar reglas visuales reutilizables a `componentes.css`; reservar `estilos.css` para la distribución. Reutilizar `boton-primario`, `boton-secundario-azul`, `panel-reporte`, `kpi-card` y `tabla-reporte`; se mantienen los alias existentes `boton-principal` y `boton-secundario`. Incrementar la versión del recurso al modificarlo para evitar caché obsoleta.

## Pruebas
`tests/integracion.cjs` compara estilos calculados reales de encabezado, acción primaria, panel y tabla en las ocho vistas. También comprueba que no haya desbordamiento horizontal de la página a 375 px y que no haya etiquetas `<style>` locales. Las pruebas de CSV y edición verifican que la confirmación de los diálogos siga visible y operativa.
Para guardar capturas al ejecutar la suite, definir opcionalmente `ERP_TEST_ARTIFACTS` como carpeta de salida; no se necesitan capturas para que las pruebas funcionen.
