# Proceso: reportería contable

**Código:** `js/reportes/reportes.js`

**Invariante:** los reportes son de solo lectura y siempre utilizan resultados producidos por el motor contable.

## Fase 1: iniciar

- **A. Objetivo:** preparar datos, controles y los tres tipos de reporte.
- **B. Entrada (Zero-Trust):** IndexedDB, JSON inicial, pestaña y fechas.
- **C. Validación:** exigir listas, respuestas correctas y tipo conocido.
- **D. Procesamiento:** abrir la base y cargar datos iniciales si está vacía.
- **E. Decisión:** generar el reporte seleccionado o mostrar un error.
- **F. Recuperación:** dejar la vista vacía ante un fallo de carga.
- **G. Verificación:** volver a leer después de cargar datos iniciales.
- **H. Telemetría:** mostrar el resultado en `mensaje-reporte`.

## Fase 2: seleccionar y validar período

- **A. Objetivo:** elegir Balanza, Balance general o Estado de resultados.
- **B. Entrada (Zero-Trust):** botón seleccionado y fechas.
- **C. Validación:** tipo registrado y rango de fechas coherente.
- **D. Procesamiento:** configurar títulos, resumen, nota y campos visibles.
- **E. Decisión:** usar dos fechas para Balanza y Resultados; una fecha final para Balance.
- **F. Recuperación:** conservar el reporte anterior si el período es inválido.
- **G. Verificación:** la fecha inicial no supera la final.
- **H. Telemetría:** mostrar reporte y período activos.

## Fase 3: calcular

- **A. Objetivo:** obtener el reporte contable solicitado.
- **B. Entrada (Zero-Trust):** cuentas y partidas persistidas.
- **C. Validación:** delegar partida doble y ecuaciones al motor.
- **D. Procesamiento:** ejecutar `generarBalanzaComprobacion()`, `generarBalanceGeneral()` o `generarEstadoResultados()`.
- **E. Decisión:** aceptar únicamente resultados consistentes.
- **F. Recuperación:** mostrar la causa del cálculo fallido.
- **G. Verificación:** Debe = Haber y Activo = Pasivo + Patrimonio.
- **H. Telemetría:** contar cuentas incluidas.

## Fase 4: presentar

- **A. Objetivo:** mostrar resumen, detalle y totales.
- **B. Entrada (Zero-Trust):** reporte verificado.
- **C. Validación:** escapar códigos, nombres y textos.
- **D. Procesamiento:** crear la tabla correspondiente y formatear USD.
- **E. Decisión:** mostrar Balanza, estado financiero o estado vacío.
- **F. Recuperación:** no insertar texto sin escapar.
- **G. Verificación:** resumen, cuerpo y pie usan los mismos valores.
- **H. Telemetría:** informar cuántas cuentas fueron mostradas.

## Fase 5: reaccionar a EDA

- **A. Objetivo:** refrescar los tres reportes cuando cambia la contabilidad.
- **B. Entrada (Zero-Trust):** evento técnico `proyeccion:actualizada`.
- **C. Validación:** exigir la proyección calculada por el motor.
- **D. Procesamiento:** usar la proyección completa o recalcular un período filtrado.
- **E. Decisión:** actualizar únicamente la vista seleccionada.
- **F. Recuperación:** reconstruir desde IndexedDB cuando sea necesario.
- **G. Verificación:** volver a presentar mediante la función del reporte.
- **H. Telemetría:** actualizar el mensaje final.

## Comunicación

Consume `proyeccion:actualizada`, utiliza `motor_contable.js` y no produce eventos contables.
