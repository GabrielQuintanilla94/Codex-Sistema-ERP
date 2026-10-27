# Proceso: pruebas automáticas

**Código:** `tests/pruebas.js`

**Invariante:** las pruebas no modifican IndexedDB ni los datos de la aplicación.

## Fase 1: preparar

- **A. Objetivo:** crear datos contables aislados.
- **B. Entrada (Zero-Trust):** funciones cargadas desde los módulos reales.
- **C. Validación:** exigir que cada prueba sea una función.
- **D. Procesamiento:** preparar cuentas y partidas de prueba.
- **E. Decisión:** ejecutar cada caso de forma independiente.
- **F. Recuperación:** capturar errores sin detener las demás pruebas.
- **G. Verificación:** conservar nombre, estado y detalle.
- **H. Telemetría:** contar resultados.

## Fase 2: probar entradas

- **A. Objetivo:** comprobar conversión y rechazo de datos inválidos.
- **B. Entrada (Zero-Trust):** importes y partidas controladas.
- **C. Validación:** esperar resultados exactos o errores.
- **D. Procesamiento:** llamar funciones reales.
- **E. Decisión:** marcar pasó o falló.
- **F. Recuperación:** registrar el mensaje de excepción.
- **G. Verificación:** comparar condiciones explícitas.
- **H. Telemetría:** agregar el resultado.

## Fase 3: probar contabilidad

- **A. Objetivo:** comprobar partida doble, naturaleza y reportería.
- **B. Entrada (Zero-Trust):** catálogo y movimientos de prueba.
- **C. Validación:** cuentas por cobrar, cuentas por pagar, utilidad y ecuación contable.
- **D. Procesamiento:** generar Balanza, Balance general y Estado de resultados.
- **E. Decisión:** aprobar solo valores esperados.
- **F. Recuperación:** mostrar la diferencia encontrada.
- **G. Verificación:** Debe = Haber y Activo = Pasivo + Patrimonio.
- **H. Telemetría:** contar pruebas contables.

## Fase 4: probar estructura y EDA

- **A. Objetivo:** comprobar DAG y contrato de eventos.
- **B. Entrada (Zero-Trust):** grafos y eventos de prueba.
- **C. Validación:** ciclo, tipo registrado e inmutabilidad.
- **D. Procesamiento:** ejecutar detectores y constructores reales.
- **E. Decisión:** aceptar resultados esperados.
- **F. Recuperación:** registrar el error sin afectar datos.
- **G. Verificación:** rechazar un evento inventado.
- **H. Telemetría:** agregar cada resultado.

## Fase 5: presentar

- **A. Objetivo:** mostrar el resumen de QA.
- **B. Entrada (Zero-Trust):** resultados capturados.
- **C. Validación:** contar pruebas correctas.
- **D. Procesamiento:** construir la tabla.
- **E. Decisión:** mostrar estado correcto solamente si pasan todas.
- **F. Recuperación:** conservar el detalle de cada fallo.
- **G. Verificación:** correctas más fallidas igual al total.
- **H. Telemetría:** mostrar `n de n pruebas correctas`.
