# Instrucciones: `js/eventos/tipos_eventos.js`
Conservar nombres, API, funcionalidades y arquitectura del archivo. Estas fases organizan la intervención; no renumerar ni sustituir sus fases de ejecución existentes.
<!-- Inicio fase 0 -->
## Fase 0 — Paths y referencias
- Raíz: `/workspace/Codex-Sistema-ERP`; fuente: `js/eventos/tipos_eventos.js`.
- Funciones existentes: `crearIdEvento`, `copiarDatosEvento`, `validarEventoContable`, `crearEventoContable`.
- Variables de nivel superior: `TIPOS_EVENTOS`.
- Dependencias locales por llamadas: sin llamadas a funciones declaradas en otros `.js`.
- Consumidores por llamadas: `js/eventos/bus_eventos.js`, `js/eventos/routing_eventos.js`.
- HTML que lo carga: `catalogo_cuentas.html`, `depreciacion.html`, `index.html`, `operaciones.html`, `partida_manual.html`, `reportes.html`.
Las referencias anteriores se extraen del código; confirmar contexto de globals y listeners antes de modificar.
<!-- Fin fase 0 -->
<!-- Inicio fase 1 -->
## Fase 1 — Contrato y entrada
Aplicación al archivo: Tipo, entidad, identificador y datos del evento.
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
Aplicación al archivo: Copia de datos y construcción del sobre de evento.
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
Aplicación al archivo: Rechazo de contrato inválido sin escribir BD.
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
Aplicación al archivo: ValidarEventoContable y preservación de TIPOS_EVENTOS.
* *A. Objetivo (DDD):* [D] Precondiciones y postcondiciones finitas (Design by Contract). [A] Frontera de contexto blindada (Anti-Corruption Layer).
* *B. Entrada (Zero-Trust):* [D] Ingesta fuertemente tipada. [A] Gatekeeping: Sanitización y validación estricta en la capa de transporte.
* *C. Validación (Harness IAST):* [R] Verificación de invariantes de contrato. [D] Evaluación binaria determinista (Fail-Fast inmediato si es inválido).
* *D. Procesamiento:* [D] Funciones puras e idempotentes (misma entrada = misma salida, siempre). [A] Cero mutación de estado global o compartido.
* *E. Decisión:* [D] Reducción de Big-O al límite inferior matemático (Ω). Priorizar O(1) vía Perfect Hash Maps para búsquedas; aceptar O(n log n) solo si es asintóticamente inevitable. [R] Enrutamiento vía Grafo Acíclico Dirigido (DAG).
* *F. Recuperación:* [R] Patrones de resiliencia (Circuit Breaker con estado Half-Open, Retry con Exponential Backoff y Jitter). [A] Contención de Pánico/Excepción en el Thread actual.
* *G. Verificación:* [D] Integridad del Checksum o estado final inmutable post-cálculo.
* *H. Telemetría:* [A] I/O Asíncrono no bloqueante (Event Loop/Epoll). [R] Trazabilidad distribuida resistente a caídas.
<!-- Fin fase 4 -->
## Límites y entrega
Aplicar A–H al alcance real: cálculos puros separados de DOM, BD y telemetría. Los criterios no certifican hashing perfecto, IAST, Circuit Breaker ni trazabilidad distribuida implementados. `Map` no garantiza O(1) en peor caso; recorrer n entradas exige Ω(n). No introducir Epoll en navegador ni reintentos de escrituras no idempotentes.
Entregar cambios solo de este alcance, alineados a la izquierda, compactos y legibles, sin renombrar ni duplicar lógica. Delimitar bloques intervenidos con `// Inicio fase N` y `// Fin fase N`, conservando la numeración real del `.js`. Validar con `node --check js/eventos/tipos_eventos.js` y probar validarEventoContable y preservación de TIPOS_EVENTOS. Informar resultados ejecutados y pendientes. EDA de negocio solo después de releer y comprobar persistencia; un módulo sin publicación no debe incorporarla por esta plantilla.
