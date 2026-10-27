# Proceso: interfaz del catálogo

**Código:** `js/catalogo/catalogo_ui.js`

**Invariante:** la matriz representa el catálogo persistido y no permite eliminar cuentas iniciales, usadas o con hijos.

## Fase 1: iniciar y capturar

- **A. Objetivo:** cargar el catálogo y recibir acciones del usuario.
- **B. Entrada (Zero-Trust):** JSON inicial, IndexedDB, formulario y botones.
- **C. Validación:** no confiar en códigos ni datos visuales.
- **D. Procesamiento:** cargar fuentes, normalizar formularios y localizar cuentas.
- **E. Decisión:** iniciar alta, eliminación o presentación.
- **F. Recuperación:** mostrar un catálogo vacío con mensaje si la carga falla.
- **G. Verificación:** confirmar que la base y el JSON fueron leídos.
- **H. Telemetría:** registrar la operación iniciada.

## Fase 2: validar acción

- **A. Objetivo:** decidir si la acción está permitida.
- **B. Entrada (Zero-Trust):** datos de alta o código de eliminación.
- **C. Validación:** delegar altas a `ejecutarAlgoritmiaCuenta()` y revisar uso, hijos y origen al eliminar.
- **D. Procesamiento:** consultar DAG y movimientos.
- **E. Decisión:** continuar o mostrar la causa del rechazo.
- **F. Recuperación:** mantener la interfaz y los datos sin cambios.
- **G. Verificación:** revisar todas las líneas cuando se elimina una cuenta.
- **H. Telemetría:** registrar rechazos.

## Fase 3: procesar acción

- **A. Objetivo:** crear o eliminar una cuenta autorizada.
- **B. Entrada (Zero-Trust):** acción aprobada.
- **C. Validación:** pedir confirmación para eliminar.
- **D. Procesamiento:** ejecutar el proceso de alta o `eliminarCuentaBD()`.
- **E. Decisión:** continuar únicamente si no fue cancelada.
- **F. Recuperación:** conservar datos ante cancelación.
- **G. Verificación:** esperar la transacción.
- **H. Telemetría:** registrar procesamiento o cancelación.

## Fase 4: publicar decisión

- **A. Objetivo:** comunicar un cambio persistido.
- **B. Entrada (Zero-Trust):** cuenta creada o eliminada.
- **C. Validación:** exigir resultado exitoso previo.
- **D. Procesamiento:** publicar `CuentaCreada` o `CuentaEliminada`.
- **E. Decisión:** cerrar el formulario y refrescar solamente después del éxito.
- **F. Recuperación:** mostrar el error si falla la publicación.
- **G. Verificación:** el evento identifica la cuenta.
- **H. Telemetría:** el bus registra el evento.

## Fase 5: presentar

- **A. Objetivo:** mostrar una matriz coherente.
- **B. Entrada (Zero-Trust):** catálogo y grafo actuales.
- **C. Validación:** usar solamente cuentas encontradas.
- **D. Procesamiento:** ordenar por jerarquía y aplicar sangría.
- **E. Decisión:** mostrar botón de eliminar solo cuando corresponde.
- **F. Recuperación:** escapar texto antes de insertarlo.
- **G. Verificación:** reconstruir selectores y filas.
- **H. Telemetría:** mostrar el último mensaje al usuario.

## Comunicación

Produce `CuentaCreada` y `CuentaEliminada`. Consume funciones de base de datos, motor contable, DAG y algoritmia de cuentas.

## Activo Fijo
La jerarquía distingue cuentas agrupadoras de auxiliares mediante `permiteMovimientos`; el Libro Diario usa esa propiedad para impedir selección de cuentas padre.
