# Verificación del patrón global de responsividad

## Alcance
Se aplicó responsividad exclusivamente a la capa visual del proyecto. No se modificó la lógica contable, IndexedDB, depreciación, inventario, eventos, importación CSV ni cálculos de reportes.

## Reglas incorporadas
1. Contenedores y tarjetas usan ancho fluido y `min-width: 0` para evitar desbordamientos accidentales.
2. Dashboard: 3 columnas en escritorio amplio, 2 en escritorio medio y 1 en tablet/móvil.
3. Navegación: lateral completa en escritorio, compacta en escritorio medio y navegación inferior en móvil.
4. Formularios y filtros: se reorganizan mediante flex/grid; en móvil pasan a una columna.
5. Tablas contables: conservan ancho mínimo legible y usan `overflow-x: auto` con desplazamiento táctil.
6. Matriz de depreciación: ancho mínimo amplio y columnas Código/Activo/Categoría fijas en escritorio; Código/Activo se conservan fijas en móvil.
7. Reportes: tablas amplias y estados financieros apilados antes de comprimir contenido.
8. Modal del Libro Diario: ancho máximo de 1600 px y hasta 97–98vw según viewport; su tabla mantiene ancho mínimo y scroll horizontal.

## Breakpoints
- `<=1199px`: escritorio medio / tablet horizontal.
- `<=900px`: tablet.
- `<=720px`: móvil.
- `<=420px`: teléfono estrecho.

## Integridad funcional
Los archivos JavaScript del proyecto no fueron modificados durante este cambio. Los HTML únicamente actualizan la versión de `css/estilos.css` a `v=22` para evitar caché de la hoja anterior.
