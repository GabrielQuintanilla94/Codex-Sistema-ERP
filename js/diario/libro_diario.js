// Inicio fase 0: orquestador del proceso Libro Diario (docs/procesos/ARQUITECTURA_PROCESOS.md)
// Coordina contrato → validador → construcción → persistencia → verificación → evento EDA.
// Depende de: libro_diario_contrato.js, libro_diario_validador.js, libro_diario_ui.js, movimientos.js, telemetria.js,
// base_datos.js, motor_contable.js, inventario_costos.js, depreciacion.js y bus/routing de eventos.
let cuentasDisponibles = [];
let movimientoEditandoId = null;
const telemetriaMovimientos = obtenerRegistroTelemetria("libro_diario");
function actualizarTelemetriaMovimiento(fase, resultado, rechazada, correlacion) {
    registrarTelemetria("libro_diario", fase, resultado, rechazada, correlacion);
}
// Fin fase 0
// Inicio fase 1: estado del proceso (edición en curso, catálogo y colección compartida)
function siguienteIdMovimiento() { return siguienteIdDe(movimientos); }
function sugerirNumeroPartida() { return "JE-" + String(siguienteIdMovimiento()).padStart(4, "0"); }
function ordenarMovimientos() {
    movimientos.sort(function(a, b) { return b.fecha.localeCompare(a.fecha) || Number(b.id) - Number(a.id); });
}
function establecerPartidaEnEdicion(id) { movimientoEditandoId = id === null || id === undefined ? null : Number(id); }
function obtenerMovimientoEnEdicion() {
    return movimientoEditandoId === null ? null : movimientos.find(function(item) { return Number(item.id) === Number(movimientoEditandoId); }) || null;
}
function mapaCuentasDisponibles() { return new Map(cuentasDisponibles.map(function(cuenta) { return [cuenta.codigo, cuenta]; })); }
function esMovimientoAutomatico(movimiento) { return esOrigenAutomatico(movimiento.origen) || esMovimientoDepreciacionAutomatica(movimiento); }
async function obtenerPartidaActualizada(id) {
    sincronizarMovimientos(await obtenerMovimientosBD());
    return movimientos.find(function(item) { return Number(item.id) === Number(id); }) || null;
}
async function cargarJSON(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error("No se pudo cargar " + ruta);
    return respuesta.json();
}
async function prepararCuentas() {
    let cuentas = await obtenerCuentasBD();
    const cuentasIniciales = await cargarJSON("datos/catalogo_cuentas.json");
    if (!Array.isArray(cuentasIniciales)) throw new Error("El catálogo inicial no contiene una lista válida.");
    if (cuentas.length === 0) {
        cuentas = cuentasIniciales;
        await guardarCuentasBD(cuentas);
    } else {
        const codigosGuardados = new Set(cuentas.map(function(cuenta) { return cuenta.codigo; }));
        const cuentasFaltantes = cuentasIniciales.filter(function(cuenta) { return !codigosGuardados.has(cuenta.codigo); });
        if (cuentasFaltantes.length > 0) {
            await guardarCuentasBD(cuentasFaltantes);
            cuentas = cuentas.concat(cuentasFaltantes);
        }
    }
    cuentasDisponibles = cuentas.filter(function(cuenta) { return cuenta.permiteMovimientos; }).sort(function(a, b) { return a.codigo.localeCompare(b.codigo); });
}
async function prepararMovimientos() {
    let guardados = await obtenerMovimientosBD();
    if (guardados.length === 0) {
        guardados = (await cargarJSON("datos/movimientos_iniciales.json")).map(normalizarMovimientoExistente);
        await guardarMovimientosBD(guardados);
    } else {
        guardados = guardados.map(normalizarMovimientoExistente);
    }
    sincronizarMovimientos(guardados);
}
// Fin fase 1
// Inicio fase 2: validación y construcción (delegadas al validador y al contrato)
function validarDatosMovimiento(datos) {
    const error = validarPartidaManual(datos, { movimientos: movimientos, editandoId: movimientoEditandoId, cuentasPorCodigo: mapaCuentasDisponibles(), cuentaInventario: CUENTA_INVENTARIO_MATERIALES, esCuentaActivoFijo: esCuentaActivoFijo });
    actualizarTelemetriaMovimiento("2. Validación", error || "Partida aprobada", error ? true : undefined);
    return error;
}
function construirNuevoMovimiento(datos) {
    const original = obtenerMovimientoEnEdicion();
    const movimiento = construirPartidaContable(datos, mapaCuentasDisponibles(), original, original ? original.id : siguienteIdMovimiento(), new Date().toISOString(), esCuentaActivoFijo);
    const baseInventario = original ? movimientos.filter(function(item) { return Number(item.id) !== Number(original.id); }) : movimientos;
    const preparado = prepararMovimientoConDepreciacion(prepararMovimientoConInventario(movimiento, baseInventario));
    actualizarTelemetriaMovimiento("3. Procesamiento", "Partida construida; inventario y activos fijos preparados", undefined, "movimiento:" + preparado.id);
    return preparado;
}
// Fin fase 2
// Inicio fase 3: persistencia, verificación redundante (relectura) y reversión
async function fase4DecidirMovimiento(movimiento, movimientosPrevios) {
    validarPartidaDoble(movimiento, mapaCuentasDisponibles());
    const previos = movimientosPrevios || await obtenerMovimientosBD();
    await aplicarCambioContableBD([{ almacen: ALMACEN_MOVIMIENTOS, accion: "agregar", valor: movimiento }].concat(cambiosInventarioDesdeMovimientos(previos.concat([movimiento]))), previos);
    actualizarTelemetriaMovimiento("4. Decisión", "Partida almacenada", undefined, "movimiento:" + movimiento.id);
    return true;
}
async function fase5VerificarMovimiento(movimiento) {
    const verificado = await obtenerMovimientoBD(movimiento.id);
    if (!estadoPersistidoCoincide(movimiento, verificado)) throw new Error("La partida persistida no coincide con el estado esperado.");
    actualizarTelemetriaMovimiento("5. Verificación", "Partida verificada", false, "movimiento:" + movimiento.id);
    return true;
}
async function verificarORevertir(verificar, cambiosReversion) {
    try { await verificar(); } catch (error) { await aplicarCambioContableBD(cambiosReversion); throw error; }
}
// Fin fase 3
// Inicio fase 4: casos de uso; el evento EDA se publica solo después de verificar lo persistido
function publicarEventoPartida(tipo, movimiento) {
    return publicarEventoContable(tipo, "movimiento", movimiento.id, { numero: movimiento.numero, fecha: movimiento.fecha });
}
async function guardarYVerificarMovimiento(movimiento) {
    const previos = await obtenerMovimientosBD();
    await fase4DecidirMovimiento(movimiento, previos);
    await verificarORevertir(async function() {
        await fase5VerificarMovimiento(movimiento);
        await verificarInventarioDesdeMovimientos(previos.concat([movimiento]));
    }, [{ almacen: ALMACEN_MOVIMIENTOS, accion: "eliminar", clave: movimiento.id }].concat(cambiosInventarioDesdeMovimientos(previos)));
    await publicarEventoPartida(TIPOS_EVENTOS.PARTIDA_REGISTRADA, movimiento);
    return true;
}
async function actualizarYVerificarMovimiento(movimiento, original) {
    if (esMovimientoAutomatico(original)) throw new Error("La partida automática debe editarse desde su módulo de origen.");
    validarPartidaDoble(movimiento, mapaCuentasDisponibles());
    const previos = await obtenerMovimientosBD();
    const actual = previos.find(function(m) { return m.id === original.id; });
    if (!estadoPersistidoCoincide(original, actual)) throw new Error("La partida cambió. Vuelva a abrir la edición.");
    const reconstruccion = previos.filter(function(m) { return m.id !== movimiento.id; }).concat([movimiento]);
    await aplicarCambioContableBD([{ almacen: ALMACEN_MOVIMIENTOS, accion: "guardar", valor: movimiento }].concat(cambiosInventarioDesdeMovimientos(reconstruccion)), previos);
    await verificarORevertir(async function() {
        await fase5VerificarMovimiento(movimiento);
        await verificarInventarioDesdeMovimientos(reconstruccion);
    }, [{ almacen: ALMACEN_MOVIMIENTOS, accion: "guardar", valor: original }].concat(cambiosInventarioDesdeMovimientos(previos)));
    await publicarEventoPartida(TIPOS_EVENTOS.PARTIDA_EDITADA, movimiento);
    actualizarTelemetriaMovimiento("5. Verificación", "Partida editada y verificada", undefined, "movimiento:" + movimiento.id);
    return true;
}
async function eliminarYVerificarMovimiento(movimiento) {
    if (esMovimientoAutomatico(movimiento)) throw new Error("Esta partida automática debe gestionarse desde su módulo de origen.");
    const previos = await obtenerMovimientosBD();
    const restantes = previos.filter(function(item) { return Number(item.id) !== Number(movimiento.id); });
    await aplicarCambioContableBD([{ almacen: ALMACEN_MOVIMIENTOS, accion: "eliminar", clave: movimiento.id }].concat(cambiosInventarioDesdeMovimientos(restantes)), previos);
    await verificarORevertir(async function() {
        if (await obtenerMovimientoBD(movimiento.id)) throw new Error("La partida continúa almacenada.");
        await verificarInventarioDesdeMovimientos(restantes);
    }, [{ almacen: ALMACEN_MOVIMIENTOS, accion: "guardar", valor: movimiento }].concat(cambiosInventarioDesdeMovimientos(previos)));
    await publicarEventoPartida(TIPOS_EVENTOS.PARTIDA_ELIMINADA, movimiento);
    actualizarTelemetriaMovimiento("5. Verificación", "Partida eliminada y verificada", false, "movimiento:" + movimiento.id);
    return true;
}
// Fin fase 4
// Inicio fase 5: puntos de entrada del proceso (serializados con Web Locks; errores contenidos y trazados)
function ejecutarRegistroPartida(datos) {
    return ejecutarConBloqueoContable(async function() {
        actualizarTelemetriaMovimiento("1. Entrada Zero-Trust", "Datos recibidos");
        sincronizarMovimientos(await obtenerMovimientosBD());
        const error = validarDatosMovimiento(datos);
        if (error) return { error: error };
        try {
            const original = obtenerMovimientoEnEdicion();
            const movimiento = construirNuevoMovimiento(datos);
            if (original) {
                await actualizarYVerificarMovimiento(movimiento, original);
                const posicion = movimientos.findIndex(function(item) { return Number(item.id) === Number(movimiento.id); });
                if (posicion !== -1) movimientos.splice(posicion, 1, movimiento);
            } else {
                await guardarYVerificarMovimiento(movimiento);
                movimientos.unshift(movimiento);
            }
            return { movimiento: movimiento, edicion: Boolean(original) };
        } catch (errorGuardado) {
            actualizarTelemetriaMovimiento("F. Recuperación", errorGuardado.message, true);
            return { error: errorGuardado.message };
        }
    });
}
function ejecutarEliminacionPartida(id) {
    return ejecutarConBloqueoContable(async function() {
        try {
            const movimiento = await obtenerPartidaActualizada(id);
            if (!movimiento) return { error: "La partida ya no existe." };
            await eliminarYVerificarMovimiento(movimiento);
            const posicion = movimientos.findIndex(function(item) { return Number(item.id) === Number(id); });
            if (posicion !== -1) movimientos.splice(posicion, 1);
            return { movimiento: movimiento };
        } catch (error) {
            actualizarTelemetriaMovimiento("F. Recuperación", error.message, true);
            return { error: error.message };
        }
    });
}
async function iniciarLibroDiario() {
    bloquearAccionesLibroDiario(true);
    try {
        await abrirBaseDatos();
        await prepararCuentas();
        await prepararMovimientos();
        mostrarMovimientos();
        bloquearAccionesLibroDiario(false);
        if (new URLSearchParams(window.location.search).get("accion") === "nueva-partida") abrirFormularioMovimiento();
    } catch (error) {
        mostrarErrorCargaLibroDiario();
    }
}
iniciarLibroDiario();
// Fin fase 5
