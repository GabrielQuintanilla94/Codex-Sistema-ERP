# Proceso: Worker de partidas CSV

**Código:** `js/importacion/partidas_worker.js`

**Invariante:** el Worker no escribe en IndexedDB; solamente analiza y devuelve decisiones.

## Fase 1: recibir mensaje

- **A. Objetivo:** recibir texto CSV y contexto contable.
- **B. Entrada (Zero-Trust):** `evento.data` desde la interfaz.
- **C. Validación:** todavía no confiar en tipos ni contenido.
- **D. Procesamiento:** normalizar cadenas y listas.
- **E. Decisión:** producir una entrada uniforme.
- **F. Recuperación:** usar valores vacíos controlados.
- **G. Verificación:** incluir texto, cuentas y duplicados.
- **H. Telemetría:** registrar archivo recibido.

## Fase 2: validar estructura

- **A. Objetivo:** comprobar la forma física del CSV.
- **B. Entrada (Zero-Trust):** texto normalizado.
- **C. Validación:** filas y ocho encabezados requeridos.
- **D. Procesamiento:** interpretar comillas, separadores y posiciones.
- **E. Decisión:** continuar o lanzar un error de estructura.
- **F. Recuperación:** rechazar el lote antes de agrupar.
- **G. Verificación:** cada encabezado debe tener posición.
- **H. Telemetría:** registrar estructura aprobada.

## Fase 3: agrupar

- **A. Objetivo:** convertir filas en partidas.
- **B. Entrada (Zero-Trust):** filas y posiciones aprobadas.
- **C. Validación:** cada línea debe tener número de partida.
- **D. Procesamiento:** mapear columnas, indexar cuentas y agrupar.
- **E. Decisión:** entregar grupos listos para evaluación.
- **F. Recuperación:** detener el archivo si una línea no puede agruparse.
- **G. Verificación:** todas las filas deben quedar dentro de un grupo.
- **H. Telemetría:** contar grupos construidos.

## Fase 4: decidir partidas

- **A. Objetivo:** separar partidas válidas y rechazadas.
- **B. Entrada (Zero-Trust):** grupos construidos.
- **C. Validación:** fechas, cuentas, importes, duplicados y partida doble.
- **D. Procesamiento:** ejecutar `validarGrupo()` y revisar referencias repetidas.
- **E. Decisión:** asignar `valida=true` o `false`.
- **F. Recuperación:** conservar errores por partida sin guardar datos.
- **G. Verificación:** referencias repetidas invalidan todos sus grupos.
- **H. Telemetría:** contar válidas y rechazadas.

## Fase 5: devolver resultado

- **A. Objetivo:** responder con un resumen completo.
- **B. Entrada (Zero-Trust):** decisiones individuales.
- **C. Validación:** cada resultado debe tener una decisión booleana.
- **D. Procesamiento:** separar listas y construir totales.
- **E. Decisión:** publicar éxito o error mediante `postMessage()`.
- **F. Recuperación:** capturar cualquier excepción del Worker.
- **G. Verificación:** válidas más rechazadas debe igualar el total.
- **H. Telemetría:** registrar líneas y archivos procesados.

## Comunicación

Recibe un mensaje de `importador_partidas.js` y responde con la vista previa. No usa el bus EDA porque todavía no existe un cambio persistido.


## Columnas de inventario
El Worker reconoce `TipoInventario`, `SKU` y `CantidadInventario`. Una salida `1104` puede llegar con Haber `0`; el valor se calcula posteriormente en el hilo principal mediante el motor de inventario.

## Campos PPE opcionales
`FechaDisponibleUso` y `ValorResidual`. Se vuelven obligatorios lógicamente cuando la línea utiliza `1201`–`1204`.


### Normalización de `FechaDisponibleUso`
Antes de comparar `FechaDisponibleUso` contra la fecha de adquisición, ambas fechas se convierten a ISO `AAAA-MM-DD` mediante `convertirFecha()`. La comparación se realiza únicamente sobre valores normalizados y la metadata del activo conserva la fecha normalizada. Esto evita falsos rechazos cuando el CSV usa `DD/MM/AAAA`.
