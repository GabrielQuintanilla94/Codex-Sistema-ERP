# Proceso: proyección contable

**Código:** `js/eventos/proyeccion_contable.js`

**Invariante:** los tres reportes se derivan de cuentas y movimientos persistidos; la proyección nunca es la fuente principal.

## Fase 1: escuchar

- **A. Objetivo:** reaccionar ante cambios contables.
- **B. Entrada (Zero-Trust):** eventos registrados en `TIPOS_EVENTOS`.
- **C. Validación:** el bus valida antes de llamar al consumidor.
- **D. Procesamiento:** suscribir la reconstrucción a cada tipo.
- **E. Decisión:** reconstruir cuando llega un cambio.
- **F. Recuperación:** el bus registra fallos del consumidor.
- **G. Verificación:** cada tipo debe tener una suscripción.
- **H. Telemetría:** conservar id y tipo del último evento.

## Fase 2: leer fuentes

- **A. Objetivo:** obtener el estado contable verdadero.
- **B. Entrada (Zero-Trust):** cuentas y movimientos desde IndexedDB.
- **C. Validación:** las funciones de base verifican las listas.
- **D. Procesamiento:** leer ambos almacenes.
- **E. Decisión:** continuar cuando las lecturas terminan.
- **F. Recuperación:** propagar el error al bus o reporte.
- **G. Verificación:** no calcular desde datos visuales.
- **H. Telemetría:** el proceso de base registra las lecturas.

## Fase 3: calcular reportes

- **A. Objetivo:** reconstruir Balanza, Balance general y Estado de resultados.
- **B. Entrada (Zero-Trust):** fuentes persistidas.
- **C. Validación:** delegar reglas a `generarBalanzaComprobacion()`.
- **D. Procesamiento:** validar partidas, acumular saldos y clasificar cuentas.
- **E. Decisión:** aceptar solo reportes contablemente consistentes.
- **F. Recuperación:** no reemplazar una proyección válida con un cálculo fallido.
- **G. Verificación:** Total Debe = Total Haber y Activo = Pasivo + Patrimonio.
- **H. Telemetría:** guardar fecha y evento causante.

## Fase 4: persistir proyección

- **A. Objetivo:** conservar el último resultado derivado.
- **B. Entrada (Zero-Trust):** balanza calculada.
- **C. Validación:** incluir id fijo, fecha y origen.
- **D. Procesamiento:** ejecutar `guardarProyeccionBD()`.
- **E. Decisión:** notificar después de guardar.
- **F. Recuperación:** reconstruir desde fuentes en el siguiente intento.
- **G. Verificación:** la proyección usa la clave `balanza-comprobacion`.
- **H. Telemetría:** almacenar último evento y fecha.

## Fase 5: notificar

- **A. Objetivo:** actualizar la interfaz de reportes.
- **B. Entrada (Zero-Trust):** proyección persistida.
- **C. Validación:** entregar el objeto calculado.
- **D. Procesamiento:** emitir `proyeccion:actualizada` en `document`.
- **E. Decisión:** el reporte decide si usa la proyección o un período filtrado.
- **F. Recuperación:** `obtenerBalanzaProyectada()` reconstruye cuando no existe una.
- **G. Verificación:** la notificación incluye `detail`.
- **H. Telemetría:** el reporte muestra el resultado.

## Comunicación

Consume los cinco eventos persistentes y produce `proyeccion:actualizada` con los tres reportes.
