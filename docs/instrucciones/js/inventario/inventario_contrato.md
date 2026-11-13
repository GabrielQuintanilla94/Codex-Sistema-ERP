# Instrucciones: `js/inventario/inventario_contrato.js`
Conservar nombres, API, funcionalidades y arquitectura del archivo. Estas fases organizan la intervención; no renumerar ni sustituir sus fases de ejecución existentes.
<!-- Inicio fase 0 -->
## Fase 0 — Paths y referencias
- Fuente: `js/inventario/inventario_contrato.js`; arquitectura: `docs/procesos/ARQUITECTURA_PROCESOS.md` (sección 8).
- Funciones existentes: `inventarioACentavos`, `inventarioADolares`, `normalizarSKU`, `normalizarTipoInventario`, `crearEstadoInventarioVacio`, `clonarEstadoInventario`.
- Constantes: `METODO_VALUACION_INVENTARIO`, `CUENTA_INVENTARIO_MATERIALES`, `CUENTA_COSTO_MATERIALES`.
- Consumidores: validador, motor de costeo, Libro Diario, Compras y Ventas.
- Páginas: `inventario.html`, `operaciones.html`, `partida_manual.html`, `reportes.html` (antes de `inventario_costos.js`).
- Pruebas: `tests/unit/contabilidad.test.cjs` (bloque «Depreciación e Inventario desacoplados») y `tests/integracion.cjs`.
<!-- Fin fase 0 -->
<!-- Inicio fase 1 -->
## Fase 1 — Contrato y entrada
Aplicación al archivo: SKU, tipo e importes como texto o número no confiable.
* *A. Objetivo (DDD):* [D] Precondiciones y postcondiciones finitas (Design by Contract). [A] Frontera de contexto blindada (Anti-Corruption Layer).
* *B. Entrada (Zero-Trust):* [D] Ingesta fuertemente tipada. [A] Gatekeeping: Sanitización y validación estricta en la capa de transporte.
* *C. Validación (Harness IAST):* [R] Verificación de invariantes de contrato. [D] Evaluación binaria determinista (Fail-Fast inmediato si es inválido).
* *D. Procesamiento:* [D] Funciones puras e idempotentes (misma entrada = misma salida, siempre). [A] Cero mutación de estado global o compartido.
* *E. Decisión:* [D] Reducción de Big-O al límite inferior matemático (Ω). Priorizar O(1) vía Perfect Hash Maps para búsquedas; aceptar O(n log n) solo si es asintóticamente inevitable. [R] Enrutamiento vía Grafo Acíclico Dirigido (DAG).
* *F. Recuperación:* [R] Patrones de resiliencia (Circuit Breaker con estado Half-Open, Retry con Exponential Backoff y Jitter). [A] Contención de Pánico/Excepción en el Thread actual.
* *G. Verificación:* [D] Integridad del Checksum o estado final inmutable post-cálculo.
* *H. Telemetría:* [A] I/O Asíncrono no bloqueante (Event Loop/Epoll). [R] Trazabilidad distribuida resistente a caídas.
<!-- Fin fase 1 -->
<!-- Inicio fase 2 -->
## Fase 2 — Procesamiento
Aplicación al archivo: Conversión a centavos y normalización de SKU y tipo.
* *A. Objetivo (DDD):* [D] Precondiciones y postcondiciones finitas (Design by Contract). [A] Frontera de contexto blindada (Anti-Corruption Layer).
* *B. Entrada (Zero-Trust):* [D] Ingesta fuertemente tipada. [A] Gatekeeping: Sanitización y validación estricta en la capa de transporte.
* *C. Validación (Harness IAST):* [R] Verificación de invariantes de contrato. [D] Evaluación binaria determinista (Fail-Fast inmediato si es inválido).
* *D. Procesamiento:* [D] Funciones puras e idempotentes (misma entrada = misma salida, siempre). [A] Cero mutación de estado global o compartido.
* *E. Decisión:* [D] Reducción de Big-O al límite inferior matemático (Ω). Priorizar O(1) vía Perfect Hash Maps para búsquedas; aceptar O(n log n) solo si es asintóticamente inevitable. [R] Enrutamiento vía Grafo Acíclico Dirigido (DAG).
* *F. Recuperación:* [R] Patrones de resiliencia (Circuit Breaker con estado Half-Open, Retry con Exponential Backoff y Jitter). [A] Contención de Pánico/Excepción en el Thread actual.
* *G. Verificación:* [D] Integridad del Checksum o estado final inmutable post-cálculo.
* *H. Telemetría:* [A] I/O Asíncrono no bloqueante (Event Loop/Epoll). [R] Trazabilidad distribuida resistente a caídas.
<!-- Fin fase 2 -->
<!-- Inicio fase 3 -->
## Fase 3 — Efectos y recuperación
Aplicación al archivo: Sin efectos.
* *A. Objetivo (DDD):* [D] Precondiciones y postcondiciones finitas (Design by Contract). [A] Frontera de contexto blindada (Anti-Corruption Layer).
* *B. Entrada (Zero-Trust):* [D] Ingesta fuertemente tipada. [A] Gatekeeping: Sanitización y validación estricta en la capa de transporte.
* *C. Validación (Harness IAST):* [R] Verificación de invariantes de contrato. [D] Evaluación binaria determinista (Fail-Fast inmediato si es inválido).
* *D. Procesamiento:* [D] Funciones puras e idempotentes (misma entrada = misma salida, siempre). [A] Cero mutación de estado global o compartido.
* *E. Decisión:* [D] Reducción de Big-O al límite inferior matemático (Ω). Priorizar O(1) vía Perfect Hash Maps para búsquedas; aceptar O(n log n) solo si es asintóticamente inevitable. [R] Enrutamiento vía Grafo Acíclico Dirigido (DAG).
* *F. Recuperación:* [R] Patrones de resiliencia (Circuit Breaker con estado Half-Open, Retry con Exponential Backoff y Jitter). [A] Contención de Pánico/Excepción en el Thread actual.
* *G. Verificación:* [D] Integridad del Checksum o estado final inmutable post-cálculo.
* *H. Telemetría:* [A] I/O Asíncrono no bloqueante (Event Loop/Epoll). [R] Trazabilidad distribuida resistente a caídas.
<!-- Fin fase 3 -->
<!-- Inicio fase 4 -->
## Fase 4 — Verificación y entrega
Aplicación al archivo: El estado vacío siempre declara el método de valuación.
* *A. Objetivo (DDD):* [D] Precondiciones y postcondiciones finitas (Design by Contract). [A] Frontera de contexto blindada (Anti-Corruption Layer).
* *B. Entrada (Zero-Trust):* [D] Ingesta fuertemente tipada. [A] Gatekeeping: Sanitización y validación estricta en la capa de transporte.
* *C. Validación (Harness IAST):* [R] Verificación de invariantes de contrato. [D] Evaluación binaria determinista (Fail-Fast inmediato si es inválido).
* *D. Procesamiento:* [D] Funciones puras e idempotentes (misma entrada = misma salida, siempre). [A] Cero mutación de estado global o compartido.
* *E. Decisión:* [D] Reducción de Big-O al límite inferior matemático (Ω). Priorizar O(1) vía Perfect Hash Maps para búsquedas; aceptar O(n log n) solo si es asintóticamente inevitable. [R] Enrutamiento vía Grafo Acíclico Dirigido (DAG).
* *F. Recuperación:* [R] Patrones de resiliencia (Circuit Breaker con estado Half-Open, Retry con Exponential Backoff y Jitter). [A] Contención de Pánico/Excepción en el Thread actual.
* *G. Verificación:* [D] Integridad del Checksum o estado final inmutable post-cálculo.
* *H. Telemetría:* [A] I/O Asíncrono no bloqueante (Event Loop/Epoll). [R] Trazabilidad distribuida resistente a caídas.
<!-- Fin fase 4 -->
