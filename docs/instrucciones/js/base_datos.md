# Instrucciones: `js/base_datos.js`
Conservar nombres, API, funcionalidades y arquitectura del archivo. Estas fases organizan la intervención; no renumerar ni sustituir sus fases de ejecución existentes.
<!-- Inicio fase 0 -->
## Fase 0 — Paths y referencias
- Raíz: `/workspace/Codex-Sistema-ERP`; fuente: `js/base_datos.js`.
- Funciones existentes: `registrarTelemetriaBD`, `fase1EntradaBD`, `fase2ValidarBD`, `fase3ProcesarBD`, `fase4DecidirBD`, `fase5VerificarBD`, `ejecutarOperacionBD`, `abrirBaseDatos`, `guardarCuentaBD`, `guardarCuentasBD`, `obtenerCuentasBD`, `obtenerCuentaBD`, `eliminarCuentaBD`, `guardarMovimientoBD`, `actualizarMovimientoBD`, `guardarMovimientosBD`, `obtenerMovimientosBD`, `obtenerMovimientoBD`, `eliminarMovimientoBD`, `guardarEventoBD`, `obtenerEventosBD`, `guardarProyeccionBD`, `obtenerProyeccionBD`, `guardarInventarioBD`, `obtenerInventarioBD`, `obtenerInventariosBD`, `eliminarInventarioBD`, `guardarTerceroBD`, `guardarTercerosBD`, `obtenerTercerosBD`, `guardarCompraBD`, `obtenerComprasBD`, `eliminarCompraBD`, `guardarVentaBD`, `obtenerVentasBD`, `eliminarVentaBD`, `estadoPersistidoCoincide`, `aplicarCambioContableBD`, `ejecutarConBloqueoContable`.
- Variables de nivel superior: `NOMBRE_BASE_DATOS`, `VERSION_BASE_DATOS`, `ALMACEN_CUENTAS`, `ALMACEN_MOVIMIENTOS`, `ALMACEN_EVENTOS`, `ALMACEN_PROYECCIONES`, `ALMACEN_INVENTARIO`, `ALMACEN_TERCEROS`, `ALMACEN_COMPRAS`, `ALMACEN_VENTAS`, `baseDatos`, `telemetriaBaseDatos`, `claves`, `almacenes`, `transaccion`, `fallo`, `solicitud`, `porId`, `almacen`.
- Dependencias locales por llamadas: sin llamadas a funciones declaradas en otros `.js`.
- Consumidores por llamadas: `js/catalogo/algoritmia_cuentas.js`, `js/catalogo/catalogo_ui.js`, `js/comercial/operaciones.js`, `js/comercial/terceros.js`, `js/compras/compras.js`, `js/compras/compras_ui.js`, `js/dashboard.js`, `js/depreciacion/depreciacion.js`, `js/depreciacion/depreciacion_ui.js`, `js/diario/libro_diario.js`, `js/eventos/bus_eventos.js`, `js/eventos/proyeccion_contable.js`, `js/importacion/importador_partidas.js`, `js/impuestos/f07.js`, `js/impuestos/impuestos_ui.js`, `js/inventario/inventario_costos.js`, `js/inventario/inventario_ui.js`, `js/operaciones_resumen.js`, `js/reportes/reportes.js`, `js/ventas/ventas.js`, `js/ventas/ventas_ui.js`.
- HTML que lo carga: `catalogo_cuentas.html`, `depreciacion.html`, `index.html`, `inventario.html`, `matriz_depreciacion.html`, `operaciones.html`, `partida_manual.html`, `reportes.html`.
Las referencias anteriores se extraen del código; confirmar contexto de globals y listeners antes de modificar.
<!-- Fin fase 0 -->
<!-- Inicio fase 1 -->
## Fase 1 — Contrato y entrada
Aplicación al archivo: Almacén, modo, conexión, claves y versión 7.
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
Aplicación al archivo: Transacciones IndexedDB y resultado esperado sin cambiar stores.
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
Aplicación al archivo: Oncomplete, rechazo y aborto atómico.
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
Aplicación al archivo: Relectura de registros y telemetriaBaseDatos.
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
Entregar cambios solo de este alcance, alineados a la izquierda, compactos y legibles, sin renombrar ni duplicar lógica. Delimitar bloques intervenidos con `// Inicio fase N` y `// Fin fase N`, conservando la numeración real del `.js`. Validar con `node --check js/base_datos.js` y probar relectura de registros y telemetriaBaseDatos. Informar resultados ejecutados y pendientes. EDA de negocio solo después de releer y comprobar persistencia; un módulo sin publicación no debe incorporarla por esta plantilla.
