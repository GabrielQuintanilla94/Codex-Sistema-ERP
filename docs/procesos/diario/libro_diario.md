# Proceso: Libro Diario

**Código:** `js/diario/libro_diario.js`

**Invariante:** una partida manual se guarda solo si tiene fecha válida, cuentas auxiliares, líneas válidas y Debe igual a Haber.

## Fase 1: capturar

- **A. Objetivo:** recibir una partida manual o una solicitud de eliminación.
- **B. Entrada (Zero-Trust):** formulario, botones y datos persistidos.
- **C. Validación:** no confiar en campos ni atributos HTML.
- **D. Procesamiento:** limpiar texto, convertir importes a centavos y localizar el movimiento.
- **E. Decisión:** enviar la solicitud a validación.
- **F. Recuperación:** mostrar un mensaje claro ante datos incompletos.
- **G. Verificación:** construir una estructura uniforme.
- **H. Telemetría:** registrar el inicio del proceso.

## Fase 2: validar

- **A. Objetivo:** impedir partidas o eliminaciones inválidas.
- **B. Entrada (Zero-Trust):** datos normalizados.
- **C. Validación:** fecha, número, referencia, concepto, cuentas, importes, duplicados y partida doble.
- **D. Procesamiento:** revisar cada línea y sumar centavos.
- **E. Decisión:** aprobar solamente cuando no existen errores.
- **F. Recuperación:** mantener abierto el formulario con el error.
- **G. Verificación:** Debe y Haber deben coincidir y ser mayores que cero.
- **H. Telemetría:** contar rechazos.

## Fase 3: procesar

- **A. Objetivo:** construir, guardar o eliminar la partida.
- **B. Entrada (Zero-Trust):** solicitud aprobada.
- **C. Validación:** asignar un id nuevo y volver a usar datos normalizados.
- **D. Procesamiento:** escribir o eliminar en IndexedDB.
- **E. Decisión:** continuar después de completar la transacción.
- **F. Recuperación:** no actualizar la lista si falla la base.
- **G. Verificación:** volver a leer el movimiento guardado o eliminado.
- **H. Telemetría:** registrar procesamiento.

## Fase 4: comunicar

- **A. Objetivo:** avisar el cambio al resto del sistema.
- **B. Entrada (Zero-Trust):** partida persistida y verificada.
- **C. Validación:** exigir id y resultado final.
- **D. Procesamiento:** publicar `PartidaRegistrada` o `PartidaEliminada`.
- **E. Decisión:** refrescar la interfaz después de publicar.
- **F. Recuperación:** informar un fallo del evento sin ocultarlo.
- **G. Verificación:** el evento identifica la partida.
- **H. Telemetría:** registrar el evento y su tipo.

## Fase 5: presentar

- **A. Objetivo:** mostrar el Libro Diario actualizado.
- **B. Entrada (Zero-Trust):** lista guardada, filtros y búsqueda.
- **C. Validación:** escapar texto antes de producir HTML.
- **D. Procesamiento:** ordenar, filtrar, calcular totales y crear acordeones.
- **E. Decisión:** mostrar resultados o estado vacío.
- **F. Recuperación:** reconstruir desde IndexedDB al iniciar.
- **G. Verificación:** resumen y lista deben usar la misma colección.
- **H. Telemetría:** conservar último resultado del proceso.

## Comunicación

Produce `PartidaRegistrada` y `PartidaEliminada`. Usa `movimientos.js`, `base_datos.js`, `motor_contable.js` y el bus EDA.


## Integración con inventario
Las líneas de la cuenta `1104` admiten `Entrada/Salida`, `SKU` y `CantidadInventario`. En las salidas el costo se calcula antes de persistir la partida y se agrega la contrapartida de costo en `5001`.

## Integración PPE
Las cuentas padre no aparecen en la captura; `cuentasDisponibles` se filtra por `permiteMovimientos`. Las líneas `1201`–`1204` exigen nombre/descripción, fecha disponible para uso y valor residual. La fase de procesamiento delega la metadata a `prepararMovimientoConDepreciacion()`.
