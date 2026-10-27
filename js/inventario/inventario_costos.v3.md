# inventario_costos.js — P3 v3

## Qué es este archivo
`js/inventario/inventario_costos.js` es el módulo de dominio que deriva y valúa inventario por SKU mediante **promedio ponderado perpetuo** a partir de las partidas del Libro Diario.

## Propósito técnico
Interpretar líneas de la cuenta `1104 Inventario de materiales`, aplicar entradas/salidas en unidades, calcular el costo promedio, completar automáticamente el costo monetario de las salidas y reconstruir la proyección persistida de inventario.

## Datos de una línea de inventario
```js
{
  codigo: "1104",
  tipoInventario: "Entrada" | "Salida",
  sku: "MAT-001",
  cantidadInventario: 10,
  debe: 125.00,
  haber: 0
}
```

Una salida puede llegar con `haber = 0`; `prepararMovimientoConInventario()` calcula ese importe antes de validar/persistir la partida.

## Fórmulas
Para una entrada:
```text
Q_n = Q_(n-1) + q_e
V_n = V_(n-1) + C_e
CP_n = round(V_n / Q_n)
```

Para una salida:
```text
CV = round(q_s × CP_vigente)
Q_n = Q_(n-1) - q_s
V_n = V_(n-1) - CV
```

La partida se completa así:
```text
Debe 5001 Materiales = CV
Haber 1104 Inventario = CV
```

## Funciones reales
### Normalización
`inventarioACentavos()`, `inventarioADolares()`, `validarCantidadInventario()`, `normalizarSKU()`, `normalizarTipoInventario()`.

### Estado y cálculo
`crearEstadoInventarioVacio()`, `clonarEstadoInventario()`, `calcularEntradaPorValor()`, `calcularSalidaPorCantidad()`.

### Reconstrucción
`ordenarMovimientosInventario()`, `construirMapaInventarioDesdeMovimientos()`.

### Preparación de partidas
`prepararMovimientoConInventario()`. Esta función recibe una partida todavía no persistida, reconstruye el contexto previo, calcula salidas y agrega la línea generada de `5001`.

### Persistencia derivada
`reconstruirInventarioDesdeMovimientos()` borra la proyección anterior del store `inventario` y la vuelve a crear desde los movimientos. `obtenerResumenInventario()` consulta esa proyección.

## Fases A–H adaptadas
### FASE 01 — Entrada y normalización
- A. Objetivo: convertir dinero, SKU, cantidad y tipo a valores controlados.
- B. Entrada: datos no confiables del formulario/CSV.
- C. Validación: números finitos, cantidad `> 0`, SKU no vacío, tipo `Entrada|Salida`.
- D. Procesamiento: dinero a centavos.
- E. Decisión: error inmediato ante datos inválidos.
- F. Recuperación: no corrige silenciosamente.
- G. Verificación: las funciones posteriores reciben unidades normalizadas.
- H. Telemetría: excepciones observables por el llamador.

### FASE 02 — Procesamiento por promedio ponderado
- Entrada: estado actual + entrada/salida.
- Invariante: `cantidad >= 0` y `valorInventarioCentavos >= 0`.
- Salida prohibida: `q_s > Q_actual`.
- Complejidad por operación de SKU: `O(1)`.

### FASE 03 — Reconstrucción cronológica
Los movimientos se ordenan por `fecha` y luego por `id`. Cada línea `1104` con metadatos de inventario modifica un `Map<sku, estado>`.
Complejidad aproximada: `O(M log M + L)`, donde `M` son movimientos y `L` líneas.

### FASE 04 — Preparación de una nueva partida
Una `Salida` fija su Haber con el costo calculado y agrega una línea automática `5001` marcada con `generadoInventario: true`. Después el Libro Diario aplica `validarPartidaDoble()`.

### FASE 05 — Recuperación y verificación
Si el Diario o importador no puede reconstruir el inventario después de guardar, revierte la partida/lote. La proyección de inventario puede ser borrada y regenerada completamente desde el Diario.

## Invariantes principales
```text
Inventario = f(LibroDiario)
SalidaUnidades <= Existencia
CostoSalida = CantidadSalida × CostoPromedioVigente
Debe(5001) = Haber(1104) para el costo generado
```

## P3 — pros y tratamiento de riesgos
**Pros:** una sola fuente de verdad, importación masiva compatible con unidades, valuación reproducible y separación entre contabilidad y reporte.

**Riesgos tratados:** no se permite stock negativo; una salida previa a su entrada falla; el costo registrado debe coincidir con el promedio; el store `inventario` no se considera dato maestro y se reconstruye desde movimientos.

## Afinación octubre 2026
- Cada entrada/salida verifica límites, relación existencia/valor y coherencia con costo promedio.
- La salida verifica adicionalmente costo reconocido y valor remanente.
