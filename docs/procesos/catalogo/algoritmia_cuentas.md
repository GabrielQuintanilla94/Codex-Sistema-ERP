# Proceso: registro de cuentas

**Código:** `js/catalogo/algoritmia_cuentas.js`

**Invariante:** una cuenta aparece en memoria e IndexedDB solamente si ambas operaciones fueron verificadas.

## Fase 1: entrada

- **A. Objetivo:** recibir una posible cuenta.
- **B. Entrada (Zero-Trust):** datos del formulario.
- **C. Validación:** no aprobar todavía.
- **D. Procesamiento:** limpiar código, nombre, padre, naturaleza y tipo.
- **E. Decisión:** entregar un objeto uniforme.
- **F. Recuperación:** usar valores controlados cuando falten campos.
- **G. Verificación:** conservar las cinco propiedades requeridas.
- **H. Telemetría:** registrar inicio de captura.

## Fase 2: validación

- **A. Objetivo:** impedir cuentas inválidas.
- **B. Entrada (Zero-Trust):** cuenta normalizada.
- **C. Validación:** código, nombre, naturaleza, duplicado y padre.
- **D. Procesamiento:** ejecutar `validarCuentaNueva()`.
- **E. Decisión:** aprobar o rechazar.
- **F. Recuperación:** no modificar memoria ni almacenamiento.
- **G. Verificación:** devolver `valido` y `error`.
- **H. Telemetría:** registrar la causa del rechazo.

## Fase 3: procesamiento

- **A. Objetivo:** incorporar el nodo al DAG en memoria.
- **B. Entrada (Zero-Trust):** cuenta aprobada.
- **C. Validación:** volver a aplicar las reglas del grafo.
- **D. Procesamiento:** agregar y reconstruir el DAG.
- **E. Decisión:** aceptar solamente un grafo válido.
- **F. Recuperación:** retirar el nodo si produce un ciclo.
- **G. Verificación:** buscar la cuenta agregada.
- **H. Telemetría:** registrar el resultado del nodo.

## Fase 4: persistencia

- **A. Objetivo:** hacer permanente la cuenta.
- **B. Entrada (Zero-Trust):** nodo aceptado en memoria.
- **C. Validación:** IndexedDB debe aceptar la escritura.
- **D. Procesamiento:** ejecutar `guardarCuentaBD()`.
- **E. Decisión:** confirmar o revertir.
- **F. Recuperación:** retirar el nodo de memoria si falla la base.
- **G. Verificación:** devolver `persistida=true` después de completar.
- **H. Telemetría:** registrar la decisión.

## Fase 5: verificación

- **A. Objetivo:** confirmar el resultado final.
- **B. Entrada (Zero-Trust):** código supuestamente guardado.
- **C. Validación:** volver a leer IndexedDB.
- **D. Procesamiento:** comparar memoria y almacenamiento.
- **E. Decisión:** éxito solo si ambos contienen la cuenta.
- **F. Recuperación:** eliminar cualquier resultado incompleto.
- **G. Verificación:** comprobar el mismo código en ambas fuentes.
- **H. Telemetría:** registrar procesada o rechazada.

## Comunicación

Devuelve el resultado a `catalogo_ui.js`. La interfaz publica `CuentaCreada` solamente después de esta verificación.
