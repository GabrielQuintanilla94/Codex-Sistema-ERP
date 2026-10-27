function comercialACentavos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) throw new Error("Importe comercial inválido.");
    return Math.round(numero * 100);
}
function comercialADolares(centavos) { return Number(centavos || 0) / 100; }
function siguienteIdMovimientoComercial(movimientos) {
    return (movimientos || []).reduce(function(max, item) { return Math.max(max, Number(item.id || 0)); }, 0) + 1;
}
function crearIdOperacion(prefijo, fecha, documento, nrc) {
    return [prefijo, String(fecha || ""), String(nrc || "CF"), String(documento || "")].join("|");
}
function validarPartidaComercial(movimiento) {
    const debe = (movimiento.partida || []).reduce(function(total, l) { return total + comercialACentavos(l.debe || 0); }, 0);
    const haber = (movimiento.partida || []).reduce(function(total, l) { return total + comercialACentavos(l.haber || 0); }, 0);
    if (debe !== haber) throw new Error("La operación comercial no está balanceada. Diferencia: $" + Math.abs(comercialADolares(debe - haber)).toFixed(2));
    return true;
}
function normalizarDocumento(valor) {
    const doc = String(valor || "").trim();
    if (!doc) throw new Error("El documento es obligatorio.");
    return doc;
}
function normalizarFechaComercial(valor) {
    const fecha = String(valor || "").trim();
    if (!fecha) throw new Error("La fecha no es válida.");

    // Formato canónico del sistema: YYYY-MM-DD.
    const iso = fecha.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
        const anio = Number(iso[1]);
        const mes = Number(iso[2]);
        const dia = Number(iso[3]);
        if (!fechaComercialReal(anio, mes, dia)) throw new Error("La fecha no es válida.");
        return [String(anio).padStart(4, "0"), String(mes).padStart(2, "0"), String(dia).padStart(2, "0")].join("-");
    }

    // Archivos comerciales exportados desde Excel en configuración local: DD/MM/YYYY.
    const local = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (local) {
        const dia = Number(local[1]);
        const mes = Number(local[2]);
        const anio = Number(local[3]);
        if (!fechaComercialReal(anio, mes, dia)) throw new Error("La fecha no es válida.");
        return [String(anio).padStart(4, "0"), String(mes).padStart(2, "0"), String(dia).padStart(2, "0")].join("-");
    }

    throw new Error("La fecha no es válida.");
}
function fechaComercialReal(anio, mes, dia) {
    if (!Number.isInteger(anio) || !Number.isInteger(mes) || !Number.isInteger(dia)) return false;
    if (anio < 1900 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
    const prueba = new Date(Date.UTC(anio, mes - 1, dia));
    return prueba.getUTCFullYear() === anio && prueba.getUTCMonth() === mes - 1 && prueba.getUTCDate() === dia;
}


/* ALGORITMIA 5 FASES — utilidades compartidas de persistencia/verificación comercial. */
function compararInventarioPersistidoConEsperado(esperado, persistido) {
    const mapaPersistido = new Map((persistido || []).map(function(item) { return [String(item.sku), item]; }));
    if (mapaPersistido.size !== esperado.estados.size) return false;
    for (const [sku, estadoEsperado] of esperado.estados.entries()) {
        const actual = mapaPersistido.get(String(sku));
        if (!actual) return false;
        if (Number(actual.cantidad) !== Number(estadoEsperado.cantidad)) return false;
        if (Number(actual.valorInventarioCentavos) !== Number(estadoEsperado.valorInventarioCentavos)) return false;
        if (Number(actual.costoPromedioCentavos) !== Number(estadoEsperado.costoPromedioCentavos)) return false;
    }
    return true;
}
async function verificarEstadoComercialPersistido(tipo, registroEsperado, movimientoEsperado, movimientosEsperados) {
    const [movimientosBD, registrosBD, inventarioBD] = await Promise.all([
        obtenerMovimientosBD(),
        tipo === "COMPRA" ? obtenerComprasBD() : obtenerVentasBD(),
        obtenerInventariosBD()
    ]);
    const movimiento = movimientosBD.find(function(item) { return Number(item.id) === Number(movimientoEsperado.id); });
    const registro = registrosBD.find(function(item) { return String(item.id) === String(registroEsperado.id); });
    if (!movimiento || !registro || Number(registro.movimientoId) !== Number(movimientoEsperado.id)) return false;
    const esperadoInventario = construirMapaInventarioDesdeMovimientos(movimientosEsperados || []);
    return compararInventarioPersistidoConEsperado(esperadoInventario, inventarioBD);
}
async function publicarEventoComercialSeguro(tipoEvento, tipoEntidad, registro, accion) {
    if (typeof publicarEventoContable !== "function" || typeof TIPOS_EVENTOS === "undefined") return null;
    return publicarEventoContable(
        tipoEvento,
        String(tipoEntidad || "operacion_comercial").toLowerCase(),
        String(registro?.id || registro?.movimientoId || "sin-id"),
        {
            accion: String(accion || "actualizar"),
            tipo: String(tipoEntidad || "").toUpperCase(),
            fecha: String(registro?.fecha || ""),
            periodo: obtenerPeriodoComercial(registro?.fecha),
            documento: String(registro?.documento || ""),
            movimientoId: registro?.movimientoId ?? null
        }
    );
}
async function persistirOperacionComercial(tipo, registro, movimiento, movimientosPrevios) {
    validarPartidaComercial(movimiento);
    await guardarMovimientoBD(movimiento);
    try {
        if (tipo === "COMPRA") await guardarCompraBD(registro);
        else await guardarVentaBD(registro);
        await reconstruirInventarioDesdeMovimientos((movimientosPrevios || []).concat([movimiento]));
    } catch (error) {
        await eliminarMovimientoBD(movimiento.id).catch(function() {});
        if (tipo === "COMPRA") await eliminarCompraBD(registro.id).catch(function() {});
        else await eliminarVentaBD(registro.id).catch(function() {});
        await reconstruirInventarioDesdeMovimientos(movimientosPrevios || []).catch(function() {});
        throw error;
    }
    return true;
}

function obtenerPeriodoComercial(fecha) {
    return String(fecha || "").slice(0, 7);
}
function obtenerCierreIVAPeriodo(movimientos, periodo) {
    const referencia = "IVA-CIERRE-" + String(periodo || "");
    return (movimientos || []).find(function(m) { return String(m.referencia || "") === referencia; }) || null;
}
function validarPeriodosEditablesIVA(fechaAnterior, fechaNueva, movimientos) {
    const periodos = new Set([obtenerPeriodoComercial(fechaAnterior), obtenerPeriodoComercial(fechaNueva)]);
    periodos.forEach(function(periodo) {
        if (!/^\d{4}-\d{2}$/.test(periodo)) throw new Error("El período de la operación no es válido.");
        if (obtenerCierreIVAPeriodo(movimientos, periodo)) {
            throw new Error("El período " + periodo + " ya tiene cierre de IVA. Reabra o elimine el cierre antes de editar la operación.");
        }
    });
    return true;
}
function prepararPlanEdicionComercial(tipo, idOriginal, registros, movimientos, fechaNueva) {
    const registroAnterior = (registros || []).find(function(item) { return String(item.id) === String(idOriginal); });
    if (!registroAnterior) throw new Error("No se encontró la operación que se desea editar.");
    const movimientoAnterior = (movimientos || []).find(function(item) { return Number(item.id) === Number(registroAnterior.movimientoId); });
    if (!movimientoAnterior) throw new Error("La operación no tiene una partida contable asociada válida.");
    validarPeriodosEditablesIVA(registroAnterior.fecha, fechaNueva, movimientos);
    const movimientosRestantes = (movimientos || []).filter(function(item) { return Number(item.id) !== Number(movimientoAnterior.id); });
    return {
        tipo: tipo,
        registroAnterior: registroAnterior,
        movimientoAnterior: movimientoAnterior,
        movimientosOriginales: movimientos || [],
        movimientosRestantes: movimientosRestantes
    };
}
async function persistirEdicionComercial(plan, registroNuevo, movimientoNuevo) {
    if (!plan) throw new Error("No existe un plan de edición válido.");
    validarPartidaComercial(movimientoNuevo);
    const movimientosFinales = plan.movimientosRestantes.concat([movimientoNuevo]);
    construirMapaInventarioDesdeMovimientos(movimientosFinales);
    let guardoMovimientoNuevo = false;
    let guardoRegistroNuevo = false;
    try {
        await eliminarMovimientoBD(plan.movimientoAnterior.id);
        if (plan.tipo === "COMPRA") await eliminarCompraBD(plan.registroAnterior.id);
        else await eliminarVentaBD(plan.registroAnterior.id);

        await guardarMovimientoBD(movimientoNuevo);
        guardoMovimientoNuevo = true;
        if (plan.tipo === "COMPRA") await guardarCompraBD(registroNuevo);
        else await guardarVentaBD(registroNuevo);
        guardoRegistroNuevo = true;
        await reconstruirInventarioDesdeMovimientos(movimientosFinales);

        const [movs, regs] = await Promise.all([
            obtenerMovimientosBD(),
            plan.tipo === "COMPRA" ? obtenerComprasBD() : obtenerVentasBD()
        ]);
        const movOk = movs.some(function(m) { return Number(m.id) === Number(movimientoNuevo.id); });
        const regOk = regs.some(function(r) { return String(r.id) === String(registroNuevo.id) && Number(r.movimientoId) === Number(movimientoNuevo.id); });
        if (!movOk || !regOk) throw new Error("La edición no pudo verificarse completamente.");
        return registroNuevo;
    } catch (error) {
        if (guardoRegistroNuevo) {
            if (plan.tipo === "COMPRA") await eliminarCompraBD(registroNuevo.id).catch(function() {});
            else await eliminarVentaBD(registroNuevo.id).catch(function() {});
        }
        if (guardoMovimientoNuevo) await eliminarMovimientoBD(movimientoNuevo.id).catch(function() {});
        const movsActuales = await obtenerMovimientosBD().catch(function() { return []; });
        if (!movsActuales.some(function(m) { return Number(m.id) === Number(plan.movimientoAnterior.id); })) {
            await guardarMovimientoBD(plan.movimientoAnterior).catch(function() {});
        }
        const regsActuales = plan.tipo === "COMPRA" ? await obtenerComprasBD().catch(function() { return []; }) : await obtenerVentasBD().catch(function() { return []; });
        if (!regsActuales.some(function(r) { return String(r.id) === String(plan.registroAnterior.id); })) {
            if (plan.tipo === "COMPRA") await guardarCompraBD(plan.registroAnterior).catch(function() {});
            else await guardarVentaBD(plan.registroAnterior).catch(function() {});
        }
        await reconstruirInventarioDesdeMovimientos(plan.movimientosOriginales).catch(function() {});
        throw error;
    }
}

function validarEliminacionComercial(tipo, id, registros, movimientos) {
    const registro = (registros || []).find(function(item) { return String(item.id) === String(id); });
    if (!registro) throw new Error("No se encontró la operación que se desea eliminar.");
    const movimiento = (movimientos || []).find(function(item) { return Number(item.id) === Number(registro.movimientoId); });
    if (!movimiento) throw new Error("La operación no tiene una partida contable asociada válida.");
    const periodo = String(registro.fecha || "").slice(0, 7);
    const referenciaCierre = "IVA-CIERRE-" + periodo;
    const cierreIVA = (movimientos || []).find(function(item) { return item.referencia === referenciaCierre; }) || null;
    const idsExcluir = new Set([Number(movimiento.id)]);
    if (cierreIVA) idsExcluir.add(Number(cierreIVA.id));
    const movimientosRestantes = (movimientos || []).filter(function(item) { return !idsExcluir.has(Number(item.id)); });

    // Verificación previa sin mutar IndexedDB: protege inventario y costos históricos.
    construirMapaInventarioDesdeMovimientos(movimientosRestantes);
    return {
        tipo: tipo,
        registro: registro,
        movimiento: movimiento,
        cierreIVA: cierreIVA,
        movimientosOriginales: movimientos,
        movimientosRestantes: movimientosRestantes,
        periodo: periodo
    };
}

async function restaurarOperacionComercialEliminada(plan) {
    if (!plan) return;
    const movimientosActuales = await obtenerMovimientosBD().catch(function() { return []; });
    const idsActuales = new Set((movimientosActuales || []).map(function(m) { return Number(m.id); }));
    if (!idsActuales.has(Number(plan.movimiento.id))) await guardarMovimientoBD(plan.movimiento);
    if (plan.cierreIVA && !idsActuales.has(Number(plan.cierreIVA.id))) await guardarMovimientoBD(plan.cierreIVA);
    const registros = plan.tipo === "COMPRA" ? await obtenerComprasBD() : await obtenerVentasBD();
    const existeRegistro = (registros || []).some(function(item) { return String(item.id) === String(plan.registro.id); });
    if (!existeRegistro) {
        if (plan.tipo === "COMPRA") await guardarCompraBD(plan.registro);
        else await guardarVentaBD(plan.registro);
    }
    await reconstruirInventarioDesdeMovimientos(plan.movimientosOriginales || []);
}

/* ALGORITMIA 5 FASES — eliminación comercial. */
function fase1EntradaEliminacionComercial(tipo, id) {
    const tipoNormalizado = String(tipo || "").trim().toUpperCase();
    const idNormalizado = String(id || "").trim();
    if (tipoNormalizado !== "COMPRA" && tipoNormalizado !== "VENTA") throw new Error("Tipo de operación comercial no válido para eliminación.");
    if (!idNormalizado) throw new Error("La operación a eliminar no tiene un identificador válido.");
    return { tipo: tipoNormalizado, id: idNormalizado };
}
async function fase2ValidarEliminacionComercial(entrada) {
    const [movimientos, registros] = await Promise.all([
        obtenerMovimientosBD(),
        entrada.tipo === "COMPRA" ? obtenerComprasBD() : obtenerVentasBD()
    ]);
    return validarEliminacionComercial(entrada.tipo, entrada.id, registros, movimientos);
}
function fase3ProcesarEliminacionComercial(plan) {
    // Simula el estado final sin mutar IndexedDB; falla si la historia de inventario quedaría inconsistente.
    const inventarioEsperado = construirMapaInventarioDesdeMovimientos(plan.movimientosRestantes);
    return { plan: plan, inventarioEsperado: inventarioEsperado };
}
async function fase4PersistirEliminacionComercial(proceso) {
    const plan = proceso.plan;
    try {
        if (plan.cierreIVA) await eliminarMovimientoBD(plan.cierreIVA.id);
        await eliminarMovimientoBD(plan.movimiento.id);
        if (plan.tipo === "COMPRA") await eliminarCompraBD(plan.registro.id);
        else await eliminarVentaBD(plan.registro.id);
        await reconstruirInventarioDesdeMovimientos(plan.movimientosRestantes);
        return proceso;
    } catch (error) {
        await restaurarOperacionComercialEliminada(plan).catch(function() {});
        throw error;
    }
}
async function fase5VerificarEliminacionComercial(proceso) {
    const plan = proceso.plan;
    const [movimientosVerificacion, registrosVerificacion, inventarioVerificacion] = await Promise.all([
        obtenerMovimientosBD(),
        plan.tipo === "COMPRA" ? obtenerComprasBD() : obtenerVentasBD(),
        obtenerInventariosBD()
    ]);
    const persisteMovimiento = movimientosVerificacion.some(function(m) { return Number(m.id) === Number(plan.movimiento.id); });
    const persisteRegistro = registrosVerificacion.some(function(item) { return String(item.id) === String(plan.registro.id); });
    const inventarioOk = compararInventarioPersistidoConEsperado(proceso.inventarioEsperado, inventarioVerificacion);
    if (persisteMovimiento || persisteRegistro || !inventarioOk) {
        await restaurarOperacionComercialEliminada(plan).catch(function() {});
        throw new Error("La fase 5 no pudo verificar completamente la eliminación comercial.");
    }
    const resultado = {
        eliminado: true,
        tipo: plan.tipo,
        registro: plan.registro,
        cierreIVAEliminado: Boolean(plan.cierreIVA),
        periodo: plan.periodo
    };
    const tipoEvento = plan.tipo === "COMPRA" ? TIPOS_EVENTOS.COMPRA_ELIMINADA : TIPOS_EVENTOS.VENTA_ELIMINADA;
    await publicarEventoComercialSeguro(tipoEvento, plan.tipo, plan.registro, "eliminar");
    return resultado;
}
async function eliminarOperacionComercial(tipo, id) {
    // FASE 1 — Entrada.
    const entrada = fase1EntradaEliminacionComercial(tipo, id);
    // FASE 2 — Validación y obtención del plan actual.
    const plan = await fase2ValidarEliminacionComercial(entrada);
    // FASE 3 — Simulación determinista del estado posterior.
    const proceso = fase3ProcesarEliminacionComercial(plan);
    // FASE 4 — Persistencia/rollback.
    await fase4PersistirEliminacionComercial(proceso);
    // FASE 5 — Relectura, verificación e EDA.
    return fase5VerificarEliminacionComercial(proceso);
}

function eliminarCompra(id) { return eliminarOperacionComercial("COMPRA", id); }
function eliminarVenta(id) { return eliminarOperacionComercial("VENTA", id); }

async function eliminarOperacionComercialPorMovimiento(tipo, movimientoId) {
    const tipoNormalizado = String(tipo || "").trim().toUpperCase();
    const registros = tipoNormalizado === "COMPRA" ? await obtenerComprasBD() : await obtenerVentasBD();
    const registro = (registros || []).find(function(item) { return Number(item.movimientoId) === Number(movimientoId); });
    if (!registro) throw new Error("No se encontró la operación comercial asociada a la partida seleccionada.");
    return eliminarOperacionComercial(tipoNormalizado, registro.id);
}
