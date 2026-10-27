# Proceso: estado de movimientos

**Código:** `js/diario/movimientos.js`

**Invariante:** el arreglo compartido `movimientos` conserva su identidad y contiene únicamente partidas con estructura mínima.

## Fase 1: recibir

- **A. Objetivo:** recibir una colección de movimientos.
- **B. Entrada (Zero-Trust):** datos desde IndexedDB o JSON.
- **C. Validación:** todavía no se confía en los elementos.
- **D. Procesamiento:** convertir la entrada en una lista controlada.
- **E. Decisión:** usar la lista o una vacía.
- **F. Recuperación:** evitar errores por valores nulos.
- **G. Verificación:** devolver siempre un arreglo.
- **H. Telemetría:** contar elementos recibidos.

## Fase 2: validar

- **A. Objetivo:** comprobar la estructura mínima.
- **B. Entrada (Zero-Trust):** lista normalizada.
- **C. Validación:** objeto, id, número y arreglo de líneas.
- **D. Procesamiento:** revisar sin modificar el estado actual.
- **E. Decisión:** aprobar o devolver un error.
- **F. Recuperación:** conservar el arreglo existente.
- **G. Verificación:** todas las partidas deben tener líneas.
- **H. Telemetría:** registrar aprobación o rechazo.

## Fase 3: copiar

- **A. Objetivo:** evitar compartir la referencia externa del arreglo.
- **B. Entrada (Zero-Trust):** lista aprobada.
- **C. Validación:** confirmar que sigue siendo una lista.
- **D. Procesamiento:** crear una copia superficial.
- **E. Decisión:** enviar la copia al reemplazo.
- **F. Recuperación:** conservar la entrada original.
- **G. Verificación:** mantener la misma cantidad.
- **H. Telemetría:** registrar elementos procesados.

## Fase 4: sincronizar

- **A. Objetivo:** actualizar el estado compartido.
- **B. Entrada (Zero-Trust):** copia validada.
- **C. Validación:** exigir un arreglo.
- **D. Procesamiento:** vaciar y repoblar `movimientos`.
- **E. Decisión:** reemplazar únicamente una entrada válida.
- **F. Recuperación:** lanzar antes de alterar el estado.
- **G. Verificación:** conservar la referencia constante.
- **H. Telemetría:** registrar cantidad almacenada.

## Fase 5: verificar

- **A. Objetivo:** confirmar la sincronización.
- **B. Entrada (Zero-Trust):** cantidad esperada.
- **C. Validación:** comparar cantidad y líneas.
- **D. Procesamiento:** revisar el arreglo final.
- **E. Decisión:** confirmar o lanzar una inconsistencia.
- **F. Recuperación:** permitir que la interfaz informe el fallo.
- **G. Verificación:** todas las partidas conservan su arreglo.
- **H. Telemetría:** registrar el resultado.

## Comunicación

Comparte el estado en memoria con `libro_diario.js` e `importador_partidas.js`. La fuente permanente sigue siendo IndexedDB.
