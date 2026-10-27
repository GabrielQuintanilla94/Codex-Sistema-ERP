# Proceso: importador de partidas

**Código:** `js/importacion/importador_partidas.js`

**Invariante:** solamente las partidas aprobadas en la vista previa pueden guardarse.

## Fase 1: recibir archivo

- **A. Objetivo:** recibir un CSV seleccionado o arrastrado.
- **B. Entrada (Zero-Trust):** archivo del usuario.
- **C. Validación:** extensión, tipo, tamaño y existencia.
- **D. Procesamiento:** preparar los datos para el Web Worker.
- **E. Decisión:** continuar o mostrar un error.
- **F. Recuperación:** limpiar la selección inválida.
- **G. Verificación:** confirmar que se recibió un solo archivo.
- **H. Telemetría:** registrar inicio y rechazos.

## Fase 2: preparar contexto

- **A. Objetivo:** entregar al Worker los datos necesarios.
- **B. Entrada (Zero-Trust):** texto CSV, cuentas y partidas existentes.
- **C. Validación:** usar únicamente cuentas auxiliares y listas válidas.
- **D. Procesamiento:** crear índices de números y referencias.
- **E. Decisión:** iniciar el Worker cuando el contexto está listo.
- **F. Recuperación:** detenerse si falla una lectura.
- **G. Verificación:** enviar todas las propiedades requeridas.
- **H. Telemetría:** registrar envío al Worker.

## Fase 3: procesar fuera de la interfaz

- **A. Objetivo:** evitar que un archivo grande bloquee la página.
- **B. Entrada (Zero-Trust):** mensaje preparado.
- **C. Validación:** el Worker vuelve a validar todo.
- **D. Procesamiento:** crear `partidas_worker.js` y esperar su respuesta.
- **E. Decisión:** mostrar vista previa o error.
- **F. Recuperación:** terminar el Worker después de responder o fallar.
- **G. Verificación:** exigir una respuesta con estado conocido.
- **H. Telemetría:** registrar partidas válidas y rechazadas.

## Fase 4: persistir lote

- **A. Objetivo:** guardar las partidas confirmadas.
- **B. Entrada (Zero-Trust):** movimientos válidos de la vista previa.
- **C. Validación:** exigir al menos una partida válida.
- **D. Procesamiento:** asignar ids y ejecutar `guardarMovimientosBD()`.
- **E. Decisión:** publicar solamente después de completar el lote.
- **F. Recuperación:** no actualizar memoria si la transacción falla.
- **G. Verificación:** volver a consultar los movimientos.
- **H. Telemetría:** registrar importación o error.

## Fase 5: comunicar y presentar

- **A. Objetivo:** sincronizar la aplicación después de importar.
- **B. Entrada (Zero-Trust):** lote persistido.
- **C. Validación:** confirmar cantidad guardada.
- **D. Procesamiento:** sincronizar movimientos y publicar `PartidasImportadas`.
- **E. Decisión:** cerrar el diálogo después del éxito.
- **F. Recuperación:** conservar la vista previa si falla.
- **G. Verificación:** la lista debe incluir las nuevas partidas.
- **H. Telemetría:** el evento conserva la cantidad importada.

## Comunicación

Envía trabajo a `partidas_worker.js`, guarda mediante `base_datos.js` y produce `PartidasImportadas`.


## Integración con inventario
El lote CSV puede incluir `TipoInventario`, `SKU` y `CantidadInventario`. Antes de guardar, cada partida se procesa secuencialmente con `prepararMovimientoConInventario()` para que las salidas usen el promedio vigente, incluyendo compras importadas anteriores del mismo lote.

## Integración PPE
Las partidas válidas del Worker se enriquecen/validan con `prepararMovimientoConDepreciacion()` antes de guardarse.
