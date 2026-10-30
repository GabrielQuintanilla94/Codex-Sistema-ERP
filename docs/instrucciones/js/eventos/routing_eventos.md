# Instrucciones: `js/eventos/routing_eventos.js`
Conservar nombres, EDA, IndexedDB y módulos existentes. Este router tiene cuatro fases propias; no sustituye las cinco fases contables ni publica eventos de negocio.
<!-- Inicio fase 0 -->
## Fase 0 — Paths y contratos
Raíz: `/workspace/Codex-Sistema-ERP`.
- Fuente: `js/eventos/routing_eventos.js`; cargar después de `base_datos.js`, `tipos_eventos.js` y `bus_eventos.js`, antes de los consumidores.
- Consumidores: `js/eventos/proyeccion_contable.js`, `js/reportes/reportes.js`, `js/dashboard.js`, `js/inventario/inventario_ui.js`.
- Contratos: `RUTAS_EVENTOS_CONTABLES` declara evento → publicador → consumidores; `PERFILES_ROUTING` exige los consumidores de cada página; `DEPENDENCIAS_ROUTING` ordena el DAG.
- Evidencia: `tests/integracion.cjs`; explicación: `docs/EDA.md`.
<!-- Fin fase 0 -->
<!-- Inicio fase 1 -->
## Fase 1 — Entrada
`fase1EntradaRouting`: validar el evento con `validarEventoContable`, copiar `datos` y congelar el sobre. Rechazar entradas inválidas antes de ejecutar consumidores.
- *A. Objetivo (DDD):* [D] Precondiciones y postcondiciones finitas (Design by Contract). [A] Frontera de contexto blindada (Anti-Corruption Layer).
- *B. Entrada (Zero-Trust):* [D] Ingesta fuertemente tipada. [A] Gatekeeping: Sanitización y validación estricta en la capa de transporte.
- *C. Validación (Harness IAST):* [R] Verificación de invariantes de contrato. [D] Evaluación binaria determinista (Fail-Fast inmediato si es inválido).
- *D. Procesamiento:* [D] Funciones puras e idempotentes (misma entrada = misma salida, siempre). [A] Cero mutación de estado global o compartido.
- *E. Decisión:* [D] Reducción de Big-O al límite inferior matemático (Ω). Priorizar O(1) vía Perfect Hash Maps para búsquedas; aceptar O(n log n) solo si es asintóticamente inevitable. [R] Enrutamiento vía Grafo Acíclico Dirigido (DAG).
- *F. Recuperación:* [R] Patrones de resiliencia (Circuit Breaker con estado Half-Open, Retry con Exponential Backoff y Jitter). [A] Contención de Pánico/Excepción en el Thread actual.
- *G. Verificación:* [D] Integridad del Checksum o estado final inmutable post-cálculo.
- *H. Telemetría:* [A] I/O Asíncrono no bloqueante (Event Loop/Epoll). [R] Trazabilidad distribuida resistente a caídas.
<!-- Fin fase 1 -->
<!-- Inicio fase 2 -->
## Fase 2 — Validación
`validarDAGRouting` y `fase2ValidarRouting`: rechazar ciclos, dependencias desconocidas, eventos sin ruta y consumidores requeridos ausentes. `registrarConsumidorContable` permite repetir el mismo enlace, pero rechaza otro manejador bajo el mismo nombre.
- *A. Objetivo (DDD):* [D] Precondiciones y postcondiciones finitas (Design by Contract). [A] Frontera de contexto blindada (Anti-Corruption Layer).
- *B. Entrada (Zero-Trust):* [D] Ingesta fuertemente tipada. [A] Gatekeeping: Sanitización y validación estricta en la capa de transporte.
- *C. Validación (Harness IAST):* [R] Verificación de invariantes de contrato. [D] Evaluación binaria determinista (Fail-Fast inmediato si es inválido).
- *D. Procesamiento:* [D] Funciones puras e idempotentes (misma entrada = misma salida, siempre). [A] Cero mutación de estado global o compartido.
- *E. Decisión:* [D] Reducción de Big-O al límite inferior matemático (Ω). Priorizar O(1) vía Perfect Hash Maps para búsquedas; aceptar O(n log n) solo si es asintóticamente inevitable. [R] Enrutamiento vía Grafo Acíclico Dirigido (DAG).
- *F. Recuperación:* [R] Patrones de resiliencia (Circuit Breaker con estado Half-Open, Retry con Exponential Backoff y Jitter). [A] Contención de Pánico/Excepción en el Thread actual.
- *G. Verificación:* [D] Integridad del Checksum o estado final inmutable post-cálculo.
- *H. Telemetría:* [A] I/O Asíncrono no bloqueante (Event Loop/Epoll). [R] Trazabilidad distribuida resistente a caídas.
<!-- Fin fase 2 -->
<!-- Inicio fase 3 -->
## Fase 3 — Procesamiento
`fase3ProcesarRouting`: devolver un plan inmutable para el evento y la página, en orden topológico. No escribir BD ni modificar vistas. Consultar el mapa con `obtenerEstadoRoutingEventos`.
- *A. Objetivo (DDD):* [D] Precondiciones y postcondiciones finitas (Design by Contract). [A] Frontera de contexto blindada (Anti-Corruption Layer).
- *B. Entrada (Zero-Trust):* [D] Ingesta fuertemente tipada. [A] Gatekeeping: Sanitización y validación estricta en la capa de transporte.
- *C. Validación (Harness IAST):* [R] Verificación de invariantes de contrato. [D] Evaluación binaria determinista (Fail-Fast inmediato si es inválido).
- *D. Procesamiento:* [D] Funciones puras e idempotentes (misma entrada = misma salida, siempre). [A] Cero mutación de estado global o compartido.
- *E. Decisión:* [D] Reducción de Big-O al límite inferior matemático (Ω). Priorizar O(1) vía Perfect Hash Maps para búsquedas; aceptar O(n log n) solo si es asintóticamente inevitable. [R] Enrutamiento vía Grafo Acíclico Dirigido (DAG).
- *F. Recuperación:* [R] Patrones de resiliencia (Circuit Breaker con estado Half-Open, Retry con Exponential Backoff y Jitter). [A] Contención de Pánico/Excepción en el Thread actual.
- *G. Verificación:* [D] Integridad del Checksum o estado final inmutable post-cálculo.
- *H. Telemetría:* [A] I/O Asíncrono no bloqueante (Event Loop/Epoll). [R] Trazabilidad distribuida resistente a caídas.
<!-- Fin fase 3 -->
<!-- Inicio fase 4 -->
## Fase 4 — Ejecución, recuperación y verificación
`fase4EjecutarRouting`: ejecutar la cola serial; proyección antes de reportes. Omitir dependientes si falla su requisito. Guardar la traza `en-proceso`, avances y resultado; releerla y compararla antes de confirmar. No revertir ni reintentar operaciones contables.
- *A. Objetivo (DDD):* [D] Precondiciones y postcondiciones finitas (Design by Contract). [A] Frontera de contexto blindada (Anti-Corruption Layer).
- *B. Entrada (Zero-Trust):* [D] Ingesta fuertemente tipada. [A] Gatekeeping: Sanitización y validación estricta en la capa de transporte.
- *C. Validación (Harness IAST):* [R] Verificación de invariantes de contrato. [D] Evaluación binaria determinista (Fail-Fast inmediato si es inválido).
- *D. Procesamiento:* [D] Funciones puras e idempotentes (misma entrada = misma salida, siempre). [A] Cero mutación de estado global o compartido.
- *E. Decisión:* [D] Reducción de Big-O al límite inferior matemático (Ω). Priorizar O(1) vía Perfect Hash Maps para búsquedas; aceptar O(n log n) solo si es asintóticamente inevitable. [R] Enrutamiento vía Grafo Acíclico Dirigido (DAG).
- *F. Recuperación:* [R] Patrones de resiliencia (Circuit Breaker con estado Half-Open, Retry con Exponential Backoff y Jitter). [A] Contención de Pánico/Excepción en el Thread actual.
- *G. Verificación:* [D] Integridad del Checksum o estado final inmutable post-cálculo.
- *H. Telemetría:* [A] I/O Asíncrono no bloqueante (Event Loop/Epoll). [R] Trazabilidad distribuida resistente a caídas.
<!-- Fin fase 4 -->
## Aplicación exacta y límites
`ejecutarConsumidorRouting` reintenta solo `AbortError`, `TransactionInactiveError` y `UnknownError`: dos reintentos, espera `20 × 2^intento` ms más jitter de 0–19 ms. Solo se conectan lecturas/renderizados y la proyección idempotente; no conectar compras, ventas ni otras escrituras de negocio como consumidores reintentables.
Cada consumidor tiene circuito `Closed → Open → Half-Open`: abre tras dos ejecuciones fallidas; un nuevo evento posterior a 1000 ms permite el sondeo. El éxito cierra el circuito. Las demás rutas independientes continúan; una dependencia fallida impide ejecutar su reporte. La cola se recupera después de un rechazo.
El DAG se valida en O(V+E). Los consumidores se buscan en `Map` con costo promedio O(1), sin garantía de hashing perfecto. La ingesta es validación de tipos en runtime; las pruebas no constituyen una plataforma IAST. El navegador usa su event loop, no Epoll directo.
La traza usa `proyecciones`, clave `routing:<pagina>:<eventoId>`, y conserva correlación entre pestañas del mismo origen. Puede revelar una ejecución interrumpida y sobrevive a recargar. No es entrega exactamente una vez, cola durable con reproducción automática ni trazabilidad entre servidores; requiere que IndexedDB conserve sus datos.
No duplicar suscripciones en los consumidores. Mantener código compacto, alineado a la izquierda y comentarios `// Inicio fase N` / `// Fin fase N`. Verificar con `node --check js/eventos/routing_eventos.js` y las pruebas de routing de `tests/integracion.cjs`.
