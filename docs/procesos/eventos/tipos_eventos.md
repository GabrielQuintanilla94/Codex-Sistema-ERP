# Proceso: contrato de eventos

**Código:** `js/eventos/tipos_eventos.js`

**Invariante:** ningún evento entra al bus si su tipo o estructura no está registrado.

## Fase 1: recibir datos

- **A. Objetivo:** recibir tipo, entidad, identificador y datos.
- **B. Entrada (Zero-Trust):** valores del módulo productor.
- **C. Validación:** no confiar en el contenido recibido.
- **D. Procesamiento:** normalizar entidad e identificador.
- **E. Decisión:** continuar con un objeto candidato.
- **F. Recuperación:** sustituir datos ausentes por un objeto vacío.
- **G. Verificación:** conservar los campos obligatorios.
- **H. Telemetría:** el bus registra el tipo final.

## Fase 2: validar tipo

- **A. Objetivo:** aceptar solamente eventos conocidos.
- **B. Entrada (Zero-Trust):** tipo solicitado.
- **C. Validación:** comparar con `TIPOS_EVENTOS`.
- **D. Procesamiento:** evaluación directa del registro.
- **E. Decisión:** aceptar o lanzar un error.
- **F. Recuperación:** impedir que un tipo desconocido llegue a consumidores.
- **G. Verificación:** el valor debe coincidir exactamente.
- **H. Telemetría:** el bus cuenta el rechazo.

## Fase 3: crear identidad segura

- **A. Objetivo:** asignar un identificador difícil de repetir.
- **B. Entrada (Zero-Trust):** generador disponible en el navegador.
- **C. Validación:** exigir Web Crypto.
- **D. Procesamiento:** usar `randomUUID()` o `getRandomValues()`.
- **E. Decisión:** crear UUID versión 4 o detenerse.
- **F. Recuperación:** no usar `Math.random()` como sustituto.
- **G. Verificación:** validar longitud y formato mínimo.
- **H. Telemetría:** el identificador queda en el historial.

## Fase 4: aislar datos

- **A. Objetivo:** evitar que el productor modifique el evento después de crearlo.
- **B. Entrada (Zero-Trust):** objeto `datos`.
- **C. Validación:** exigir objeto serializable y no arreglo.
- **D. Procesamiento:** copiar con `structuredClone()` o JSON.
- **E. Decisión:** congelar la copia o rechazarla.
- **F. Recuperación:** lanzar un error de contrato.
- **G. Verificación:** comprobar que la copia es un objeto.
- **H. Telemetría:** el fallo se registra en el bus.

## Fase 5: verificar evento

- **A. Objetivo:** entregar un evento completo e inmutable.
- **B. Entrada (Zero-Trust):** evento candidato.
- **C. Validación:** id, tipo, entidad, fecha, versión y datos.
- **D. Procesamiento:** ejecutar `validarEventoContable()`.
- **E. Decisión:** congelar o rechazar.
- **F. Recuperación:** impedir persistencia y despacho inválidos.
- **G. Verificación:** la fecha debe ser interpretable y la versión debe ser 1.
- **H. Telemetría:** el bus actualiza fallidos o publicados.

## Comunicación

Define el contrato compartido por productores, `bus_eventos.js` y `proyeccion_contable.js`.
