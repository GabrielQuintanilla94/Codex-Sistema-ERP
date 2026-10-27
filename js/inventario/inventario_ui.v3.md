# inventario_ui.js — P3 v3

## Qué es este archivo
`js/inventario/inventario_ui.js` es exclusivamente el controlador de **reporte de inventario**. No captura compras, no captura ventas y no crea partidas contables.

## Propósito técnico
Leer las partidas persistidas, solicitar la reconstrucción del inventario y representar existencias, valor, costo promedio e historial de unidades. La fuente de verdad es el Libro Diario.

## Dependencias reales
```text
base_datos.js -> obtenerMovimientosBD()
inventario_costos.js -> reconstruirInventarioDesdeMovimientos(), inventarioADolares()
inventario.html -> elementos de salida del reporte
```

## Modelo formal
```text
M = conjunto de movimientos del Libro Diario
I = ReconstruirInventario(M)
Reporte = Render(I.productos, I.historial)
```

Por diseño:
```text
inventario_ui.js ∉ CapturaOperaciones
inventario_ui.js ∈ Presentacion/Consulta
```

## Fases A–H adaptadas al archivo
### FASE 01 — Formato seguro
Funciones: `dineroInventarioUI()`, `escaparInventarioUI()`.
- A. Objetivo: normalizar presentación de moneda y texto.
- B. Entrada: valores provenientes de IndexedDB.
- C. Validación: conversión con `Number` y conversión explícita a `String`.
- D. Procesamiento: `Intl.NumberFormat` y escape HTML.
- E. Decisión: no altera datos contables.
- F. Recuperación: valores ausentes se representan como cero/cadena vacía.
- G. Verificación: solo produce texto para UI.
- H. Telemetría: los errores de reconstrucción se muestran en `mensaje-inventario-reporte`.

### FASE 02 — Reconstrucción y reporte
Función: `cargarResumenInventarioUI()`.
```js
const movimientos = await obtenerMovimientosBD();
const reconstruccion = await reconstruirInventarioDesdeMovimientos(movimientos);
```
- A. Objetivo: derivar el estado actual desde el Diario.
- B. Entrada: `movimientos[]`.
- C. Validación: delegada al motor de inventario.
- D. Procesamiento: ordenar productos/historial y calcular totales de presentación.
- E. Decisión: renderizar tablas o mensajes de ausencia.
- F. Recuperación: la función superior captura excepciones.
- G. Verificación: cada fila mostrada proviene del resultado reconstruido.
- H. Telemetría: error visible al usuario.

Complejidad aproximada: `O(M + P log P + H log H)`, donde `M` son movimientos, `P` productos y `H` registros históricos.

### FASE 03 — Inicio
Función: `iniciarInventarioUI()`.
```js
await abrirBaseDatos();
await cargarResumenInventarioUI();
```
El botón `actualizar-inventario` repite la derivación.

## Invariante principal
```text
EstadoInventario = f(MovimientosLibroDiario)
```
La pantalla de inventario nunca debe convertirse en una segunda fuente de operaciones.

## Afinación octubre 2026
- El resumen se verifica antes de renderizar.
- El botón Actualizar se bloquea durante reconstrucción y la UI se refresca sin recarga manual.
