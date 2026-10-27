# Proceso: base de datos

**Código:** `js/base_datos.js`

**Invariante:** una operación se confirma únicamente cuando termina su transacción de IndexedDB.

## Fase 1: recibir la operación

- **A. Objetivo:** recibir una solicitud uniforme.
- **B. Entrada (Zero-Trust):** almacén, modo, nombre y función sin confiar.
- **C. Validación:** no se autoriza todavía.
- **D. Procesamiento:** convertir los valores básicos y crear el objeto de operación.
- **E. Decisión:** enviar la operación a la fase 2.
- **F. Recuperación:** usar valores controlados cuando falten datos.
- **G. Verificación:** confirmar que existen las propiedades requeridas.
- **H. Telemetría:** conservar el nombre de la operación.

## Fase 2: validar

- **A. Objetivo:** impedir transacciones inválidas.
- **B. Entrada (Zero-Trust):** operación normalizada.
- **C. Validación:** base abierta, almacén existente, modo permitido y función válida.
- **D. Procesamiento:** consultar la configuración de IndexedDB.
- **E. Decisión:** aprobar o devolver una causa de rechazo.
- **F. Recuperación:** detenerse antes de modificar datos.
- **G. Verificación:** comprobar `objectStoreNames`.
- **H. Telemetría:** registrar el rechazo.

## Fase 3: ejecutar

- **A. Objetivo:** ejecutar una transacción atómica.
- **B. Entrada (Zero-Trust):** operación aprobada.
- **C. Validación:** IndexedDB controla claves e índices.
- **D. Procesamiento:** abrir la transacción y ejecutar la solicitud.
- **E. Decisión:** completar, abortar o fallar.
- **F. Recuperación:** abortar la transacción ante una excepción.
- **G. Verificación:** esperar `oncomplete`.
- **H. Telemetría:** pasar el resultado a la fase 4.

## Fase 4: resolver

- **A. Objetivo:** aceptar o rechazar el resultado asíncrono.
- **B. Entrada (Zero-Trust):** promesa de la transacción.
- **C. Validación:** esperar sin ocultar errores.
- **D. Procesamiento:** resolver la promesa.
- **E. Decisión:** devolver el resultado o propagar el error.
- **F. Recuperación:** conservar la causa original.
- **G. Verificación:** contar solamente operaciones terminadas.
- **H. Telemetría:** actualizar operaciones, errores y última operación.

## Fase 5: verificar

- **A. Objetivo:** confirmar la forma del resultado.
- **B. Entrada (Zero-Trust):** valor devuelto por IndexedDB.
- **C. Validación:** aplicar el verificador indicado por el llamador.
- **D. Procesamiento:** evaluar la condición.
- **E. Decisión:** devolver o lanzar una inconsistencia.
- **F. Recuperación:** dejar que el proceso superior informe el fallo.
- **G. Verificación:** usar lectura posterior cuando el proceso lo requiera.
- **H. Telemetría:** registrar una verificación fallida como error.

## Comunicación

Este archivo no publica eventos. Guarda cuentas, movimientos, eventos, proyecciones e inventario para los demás módulos. El store `inventario` usa `sku` como `keyPath` y es consumido por `js/inventario/inventario_costos.js`.

## Migración 6
La versión 6 actualiza la cuenta `5001 Materiales` para permitir movimientos directos, requisito de la partida automática de costo de venta generada por `inventario_ui.js`.
