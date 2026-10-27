# Proceso: bus de eventos

**Código:** `js/eventos/bus_eventos.js`

**Invariante:** un evento se guarda y valida antes de entregarse a los consumidores.

## Fase 1: suscribir

- **A. Objetivo:** registrar consumidores por tipo.
- **B. Entrada (Zero-Trust):** tipo y función manejadora.
- **C. Validación:** tipo conocido y función válida.
- **D. Procesamiento:** guardar el manejador en un `Set`.
- **E. Decisión:** suscribir o lanzar un error.
- **F. Recuperación:** devolver una función para cancelar la suscripción.
- **G. Verificación:** evitar duplicados por referencia.
- **H. Telemetría:** el despacho cuenta las recepciones.

## Fase 2: recibir evento

- **A. Objetivo:** recibir eventos locales o de otra pestaña.
- **B. Entrada (Zero-Trust):** objeto directo o mensaje de `BroadcastChannel`.
- **C. Validación:** ejecutar `validarEventoContable()`.
- **D. Procesamiento:** localizar consumidores por tipo.
- **E. Decisión:** despachar o rechazar.
- **F. Recuperación:** capturar mensajes externos inválidos.
- **G. Verificación:** ningún consumidor recibe un evento fuera del contrato.
- **H. Telemetría:** aumentar recibidos o fallidos.

## Fase 3: persistir

- **A. Objetivo:** conservar historial del evento.
- **B. Entrada (Zero-Trust):** evento recién creado.
- **C. Validación:** contrato aprobado.
- **D. Procesamiento:** ejecutar `guardarEventoBD()`.
- **E. Decisión:** despachar solamente después de completar la escritura.
- **F. Recuperación:** propagar el error al productor.
- **G. Verificación:** IndexedDB controla la clave única.
- **H. Telemetría:** registrar publicación exitosa o fallida.

## Fase 4: despachar

- **A. Objetivo:** ejecutar todos los consumidores registrados.
- **B. Entrada (Zero-Trust):** evento persistido.
- **C. Validación:** volver a comprobar el contrato.
- **D. Procesamiento:** usar `Promise.allSettled()`.
- **E. Decisión:** permitir que consumidores independientes terminen.
- **F. Recuperación:** un consumidor fallido no cancela a los demás.
- **G. Verificación:** revisar cada resultado.
- **H. Telemetría:** registrar errores por consumidor.

## Fase 5: comunicar entre pestañas

- **A. Objetivo:** compartir el cambio con páginas del mismo origen.
- **B. Entrada (Zero-Trust):** evento despachado localmente.
- **C. Validación:** usar el mismo contrato al recibirlo.
- **D. Procesamiento:** enviar por `BroadcastChannel`.
- **E. Decisión:** usar el canal cuando el navegador lo soporte.
- **F. Recuperación:** continuar dentro de la pestaña si no existe el canal.
- **G. Verificación:** el receptor vuelve a validar.
- **H. Telemetría:** conservar último tipo y conteos.

## Comunicación

Es el orquestador EDA del proyecto. Productores y consumidores no se llaman directamente entre sí.
