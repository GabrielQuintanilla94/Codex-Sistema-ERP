# Libro Diario - Sistema contable

Aplicación local hecha con HTML, CSS y JavaScript. No usa npm ni paquetes externos.

## Módulos

- `index.html`: centro de control con selector mensual; `partida_manual.html`: captura e importación CSV.
- `catalogo_cuentas.html`: catálogo organizado como DAG.
- `inventario.html`: compras, ventas, existencias y costo promedio conectados al Libro Diario.
- `reportes.html`: Balanza de comprobación, Balance general y Estado de resultados.
- `js/base_datos.js`: almacenamiento en IndexedDB.
- `js/motor_contable.js`: partida doble, saldos y naturaleza contable.
- `js/inventario/inventario_costos.js`: existencias y valuación por promedio ponderado perpetuo.
- `js/inventario/inventario_ui.js`: interfaz y orquestación contable automática de compras/ventas.
- `js/eventos/`: comunicación EDA e historial de eventos.
- `docs/procesos/`: contrato A-H de cada archivo JavaScript.
- `tests/`: pruebas de las reglas principales.
- `scripts/verificar_proyecto.ps1`: revisión automática sin instalar paquetes.

## Ejecución

1. Desde la raíz ejecute `python3 -m http.server 8000 --bind 127.0.0.1` o use Live Server.
2. Abra `index.html` mediante el servidor HTTP.
3. Use siempre el mismo origen y puerto para conservar IndexedDB. Para acceso remoto use HTTPS: las mutaciones usan Web Locks. No abra los archivos mediante `file://`.

## Verificación
Las pruebas actuales están en `tests/integracion.cjs`; ejecución y requisitos en `tests/README.md`. Usan Chromium e IndexedDB real con perfiles temporales. Los antiguos `tests/pruebas.html` y `scripts/verificar_proyecto.ps1` no estaban incluidos en el ZIP original.

Los cambios de integridad están documentados en `docs/verificaciones/VERIFICACION_CORRECCIONES_INTEGRIDAD.md`; las instrucciones por archivo están en `docs/INSTRUCCIONES_INTERVENCION_ERP.md`.

## Inventario
Las unidades se registran dentro de las partidas del Libro Diario o del importador CSV. `inventario.html` es únicamente un reporte derivado; no registra operaciones.

## Módulo de depreciación
- `depreciacion.html`: matriz anual de activos fijos y comando **Contabilizar al corte**.
- `js/depreciacion/depreciacion.js`: línea recta, primer mes prorrateado, acumulada, valor en libros y generación idempotente de partidas automáticas `620x / 130x`.
- `js/depreciacion/depreciacion_ui.js`: reporte derivado del Libro Diario y ejecución explícita de la contabilización automática de períodos cerrados.
- Cuentas PPE: `1201` Edificios, `1202` Maquinaria, `1203` Automóviles, `1204` Otros bienes muebles.


### Actualización de captura y reportería
El Libro Diario permite editar partidas manuales e importadas por CSV con persistencia verificada y rollback de seguridad. Las partidas automáticas de depreciación no se editan manualmente. La página de Reportes usa un contenedor de escritorio ampliado y tablas con mayor ancho para Balanza, Balance General y Estado de Resultados.

## Refactor SRP del módulo de depreciación — septiembre 2026
El módulo de depreciación separa validación, cálculo, verificación, construcción contable, planificación, persistencia y renderizado. La fórmula de línea recta se mantiene en un único punto, las fechas se pasan como snapshot para obtener resultados deterministas y cada cálculo debe superar tres verificaciones matemáticas antes de renderizarse o utilizarse para contabilización.

## Navegación web y consulta por cuenta
La carátula `index.html` queda reservada al dashboard/resumen contable. La captura de partidas manuales se conserva en `partida_manual.html` con las mismas funciones de registro manual, importación CSV, edición y eliminación ya existentes.

En `reportes.html`, las cuentas de Balanza de comprobación, Balance general y Estado de resultados son seleccionables. Al seleccionar una cuenta se despliegan únicamente las líneas del Libro Diario cuyo `codigo` coincide con esa cuenta y cuya fecha pertenece al mismo período del reporte; no se muestran las contrapartidas de otras cuentas.

## Compras, Ventas e IVA / F07

La versión actual incorpora captura individual e importación CSV de compras y ventas. Una compra genera inventario, IVA Crédito Fiscal y Cuentas por pagar; una venta genera ingreso, IVA Débito Fiscal, cobro/cuenta por cobrar, salida de inventario y costo de ventas por promedio ponderado.

La navegación principal ya no expone el Libro Diario: los movimientos contables siguen persistiendo internamente y se consultan por cuenta desde los reportes. `impuestos.html` presenta el resumen mensual, los libros de compras/ventas y exporta CSV sin encabezados para los anexos 1, 2 y 3 del F07 del MVP.

Plantillas disponibles:
- `datos/plantilla_compras.csv`
- `datos/plantilla_ventas.csv`


## Afinación técnica

La revisión integral se documenta en `docs/revisiones/AFINACION_GENERAL.md` y las pruebas manuales en `docs/PRUEBAS_AFINACION_COMPLETA.md`.

## Identificación fiscal y F07
La referencia `documento` no sustituye Código de Generación, Número de Control ni Sello de Recepción. Captúrelos por separado en Operaciones o mediante las nuevas columnas opcionales de las plantillas CSV. Los documentos históricos sin identificación fiscal no se exportan como DTE automáticamente.
Los anexos DTE 01/03 usan punto y coma; consumidor final se agrupa por día e incluye IVA en las ventas gravadas. Para varias facturas del día, complete la hora de emisión. Fuente y alcance: `docs/referencias/F07_MANUAL_APORTADO.md`.
