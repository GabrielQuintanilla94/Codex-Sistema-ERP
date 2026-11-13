# Arquitectura de procesos desacoplados

Patrón para separar cada proceso de negocio en módulos con una sola responsabilidad. **Piloto aplicado: Libro Diario.** Los demás procesos (Compras, Ventas, Depreciación, Inventario) seguirán el mismo patrón.

## 1. Los cinco módulos de un proceso

| Módulo pedido | Archivo del Libro Diario | Responsabilidad única (SRP) | ¿Toca DOM? | ¿Toca IndexedDB? |
|---|---|---|---|---|
| Orquestador | `js/diario/libro_diario.js` | Coordina las 5 fases, guarda el estado del proceso y es el **único** que publica eventos | No* | Sí |
| Movimientos | `js/diario/movimientos.js` | Estado compartido de la colección de partidas (sin cambios) | No | No |
| Contrato | `js/diario/libro_diario_contrato.js` | Forma válida de una partida: tipos, normalización y construcción determinista | No | No |
| Validador | `js/diario/libro_diario_validador.js` | Reglas de negocio puras: Fail-Fast, mensajes idénticos a los anteriores | No | No |
| Interfaz | `js/diario/libro_diario_ui.js` | Listado, formulario, confirmaciones y mensajes | Sí | No |
| Router (compartido) | `js/eventos/routing_eventos.js` | Conector EDA: rutas, orden sin ciclos, reintentos, protección ante fallos repetidos, trazas | No | Trazas |
| Telemetría (compartida) | `js/eventos/telemetria.js` | Observabilidad: fase, resultado, contadores e historial por proceso, con correlación | No | No |

\* El orquestador solo llama a tres funciones de la interfaz al iniciar (`bloquearAccionesLibroDiario`, `mostrarMovimientos`, `mostrarErrorCargaLibroDiario`).

**Orden de carga** en `partida_manual.html`:
1. Infraestructura: `base_datos`, `inventario_costos`, `depreciacion`, `motor_contable`.
2. EDA: `tipos_eventos`, `bus_eventos`, `routing_eventos`, `proyeccion_contable`.
3. `movimientos` → `telemetria` → `libro_diario_contrato` → `libro_diario_validador` → `libro_diario_ui` → `libro_diario` → `importador_partidas`.

## 2. Flujo de una partida

```
UI.recibirDatosMovimiento ─► Contrato.normalizarEntradaPartida
UI.registrarMovimiento ─► Orquestador.ejecutarRegistroPartida  (Web Lock)
   1. Entrada      sincronizarMovimientos (estado)                 ─► Telemetría
   2. Validación   Validador.validarPartidaManual (puro)           ─► Telemetría
   3. Proceso      Contrato.construirPartidaContable + inventario/PPE
   4. Decisión     validarPartidaDoble + aplicarCambioContableBD
   5. Verificación relectura (fase5VerificarMovimiento) o reversión
   ─► publicarEventoPartida ─► bus ─► Router ─► proyección, reportes, inventario, Inicio
UI ◄─ {movimiento, edicion} | {error}
```

## 3. Qué va con EDA y qué no

**Va con EDA:** solo la comunicación entre módulos después de que un hecho quedó persistido y verificado:
- el contrato del evento (`tipos_eventos.js`);
- el bus (`bus_eventos.js`);
- el router (`routing_eventos.js`);
- los consumidores (proyección contable, reportes, inventario, Inicio).

**No va con EDA:**
- validar;
- calcular;
- guardar;
- formularios.

Registrar es una orden directa; «partida registrada» es el evento. En el Libro Diario, `publicarEventoPartida` solo se llama después de `verificarORevertir`.

## 4. Principios aplicados

| Principio | Cómo se aplica |
|---|---|
| **SRP** | Cada archivo tiene una sola razón de cambio. El archivo de 922 líneas quedó en módulos de 30 a 449 líneas; la interfaz conserva el HTML que ya existía. |
| **Determinismo** | Contrato y validador son funciones puras: la fecha (`ahoraISO`) y el id se reciben como parámetros. Una prueba exige que dos construcciones con la misma entrada sean iguales. |
| **Aislamiento** | El validador recibe sus dependencias por `contexto` (`cuentasPorCodigo`, `cuentaInventario`, `esCuentaActivoFijo`); se prueba sin navegador. Los errores de persistencia se contienen en `ejecutarRegistroPartida` y `ejecutarEliminacionPartida`, que devuelven `{error}` en lugar de romper la UI. |
| **Redundancia (verificación)** | Lo guardado se relee y compara (`fase5VerificarMovimiento`) y el inventario se recalcula. Si algo no coincide, `verificarORevertir` deshace el cambio. |
| **DRY (sin código redundante)** | Se unificaron tres bloques de verificar/revertir (`verificarORevertir`), tres publicaciones (`publicarEventoPartida`), dos filtros de línea vacía (`lineaTieneContenido`), dos mapas de cuentas (`mapaCuentasDisponibles`) y las listas de orígenes automáticos (`ORIGENES_AUTOMATICOS`, que ahora también protege «Cierre IVA» al eliminar). |
| **Abierto/cerrado (SOLID)** | Una regla nueva se agrega como una función `validar…` en `primerErrorPartida` sin modificar las existentes. |
| **Inversión de dependencias (SOLID)** | El validador depende de abstracciones inyectadas (funciones y mapas), no de variables globales del navegador. |
| **POO** | Encapsulamiento por módulo: el estado del proceso (`cuentasDisponibles`, `movimientoEditandoId`) solo se modifica desde el orquestador (`establecerPartidaEnEdicion`), y la UI no escribe ese estado directamente. No se crearon clases: el proyecto usa scripts clásicos con funciones globales, y convertirlo agregaría riesgo sin beneficio (YAGNI). |
| **YAGNI** | Un solo router y una sola telemetría para todos los procesos. La telemetría queda en memoria: las trazas persistentes ya las guarda el router. |

## 5. Observabilidad y trazabilidad

- En la consola del navegador:
  - `obtenerEstadoTelemetria("libro_diario")` muestra la fase actual, el resultado, las partidas procesadas y rechazadas, y un historial con las últimas 50 entradas.
  - `obtenerEstadoRoutingEventos()` muestra las rutas y las trazas EDA.
- Cada entrada del historial lleva la correlación `movimiento:<id>`. El evento publicado usa el mismo id de entidad (`"movimiento"`, id), así que la telemetría del proceso y la traza del router se pueden cruzar.

## 6. Verificación

- Se conservan las 45 funciones del archivo original con el mismo nombre; ninguna quedó duplicada.
- Las 51 pruebas de integración aprueban sin cambios, incluidas las que reemplazan `fase5VerificarMovimiento` para forzar fallos y las que eliminan partidas.
- Pruebas unitarias nuevas (16): normalización y construcción del contrato, 13 reglas del validador y telemetría. Cuatro mutaciones del validador fueron detectadas.
- La prueba estática del HTML5 se mantiene en 10/10.

## 7. Cómo replicarlo en otro proceso

1. Mover las reglas puras a `<proceso>_validador.js` con dependencias por `contexto` y mensajes idénticos.
2. Mover tipos, normalización y construcción a `<proceso>_contrato.js` (sin DOM ni BD; fechas e ids como parámetros).
3. Dejar en el orquestador solo las fases, la persistencia con `verificarORevertir` y la publicación posterior a la verificación.
4. Reemplazar la telemetría local por `registrarTelemetria("<proceso>", …)`.
5. Conservar nombres públicos, correr las pruebas existentes y agregar unitarias del contrato y del validador.
