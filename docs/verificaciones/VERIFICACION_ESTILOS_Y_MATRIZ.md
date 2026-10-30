# Estilos compartidos y matriz de depreciación
## Resultado
**46 pruebas aprobadas, 0 fallidas y 0 omitidas** en Chromium con IndexedDB real. Incluye las 40 pruebas previas y seis casos nuevos de presentación/datos. Los 31 archivos JavaScript mantienen sintaxis válida.
## Apariencia
Las ocho vistas cargan `css/componentes.css` después de `css/estilos.css`. Se retiró el bloque de temas por módulo y el estilo incrustado en Partidas manuales. La prueba compara estilos calculados de encabezados, acciones primarias, paneles y cabeceras de tabla; cubre también las tablas de los diálogos. Fondo, tipografía, colores, bordes y radios provienen del tema común. Se verifica que ninguna vista desborde horizontalmente la página a 375 px; las tablas extensas conservan desplazamiento interno.
## Datos de depreciación
- Base vacía: mensaje de origen de los datos y enlace para registrar una adquisición; no aparece una tabla sin explicación.
- Activo válido: costo $2400, vida útil de dos años, disponible desde enero 2026; al corte de febrero se muestran cuotas de $100 en enero/febrero, acumulada $200 y libros $2200. Los meses futuros muestran `—`.
- Adquisición incompleta: aviso visible sin inventar datos ni ocultar los activos válidos. No se modifica su metadata persistida.
- Registro y eliminación desde otra pestaña: Gestión y Matriz se actualizan mediante el consumidor `depreciacion` del router, sin refresco manual.
- Navegación: la matriz mantiene seleccionado el módulo Activos fijos.
## Alcance
La apariencia es común; la distribución depende del contenido. Las pruebas usan perfiles efímeros, no los datos del navegador del usuario. El repositorio no incluye activos de ejemplo persistidos automáticamente. La matriz se alimenta de partidas de adquisición PPE, no de las compras de inventario de la cuenta 1104.
Reproducción: `tests/README.md`. Reglas de mantenimiento: `docs/diseno/ESTILOS_COMPARTIDOS.md`.
