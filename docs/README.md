# Documentación

## Archivos generales

- `INVARIANTE_GLOBAL.md`: reglas que ningún proceso puede romper.
- `ESTANDARES.md`: código, criptografía, QA y automatización.
- `EDA.md`: eventos, productores, consumidores y recuperación.
- `PRUEBAS_MANUALES.md`: pasos para probar la aplicación completa.

## Contratos por proceso

La carpeta `procesos` repite la estructura de `js`. Cada JavaScript tiene un Markdown con sus cinco fases y los literales A-H.

Ejemplo:

```text
js/catalogo/grafo_cuentas.js
docs/procesos/catalogo/grafo_cuentas.md

js/inventario/inventario_costos.js
docs/procesos/inventario/inventario_costos.md
```

Los `.md` no ejecutan la aplicación. Sirven para explicar las reglas que el código debe cumplir y para revisar cambios futuros.

## Interfaz de inventario

`inventario.html` utiliza `js/inventario/inventario_ui.js` para registrar compras y ventas, actualizar el promedio ponderado y crear automáticamente las partidas contables correspondientes. Su proceso técnico está documentado en `docs/procesos/inventario/inventario_ui.md`.


## Inventario
Las unidades se registran dentro de las partidas del Libro Diario o del importador CSV. `inventario.html` es únicamente un reporte derivado; no registra operaciones.

## Módulo de depreciación
- `depreciacion.html`: matriz anual de activos fijos.
- `js/depreciacion/depreciacion.js`: línea recta, primer mes prorrateado, acumulada y valor en libros.
- `js/depreciacion/depreciacion_ui.js`: reporte derivado del Libro Diario.
- Cuentas PPE: `1201` Edificios, `1202` Maquinaria, `1203` Automóviles, `1204` Otros bienes muebles.
