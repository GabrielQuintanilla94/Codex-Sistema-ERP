// Inicio fase 0: validador de depreciación (reglas y verificaciones triples puras; lanza Error con los mensajes de siempre)
// Depende de: depreciacion_contrato.js y depreciacion_calculo.js (en ejecución); base_datos.js (estadoPersistidoCoincide).
// Fin fase 0
// Inicio fase 1: adquisición y datos mínimos para calcular
function validarDatosAdquisicionActivo(movimiento, linea, indice) {
    const configuracion = obtenerConfiguracionDepreciacion(linea.codigo);
    if (!configuracion) return null;
    const costoCentavos = depreciacionACentavos(linea.debe);
    const datos = linea.activoFijo || {};
    const nombre = String(datos.nombre || linea.descripcion || "").trim();
    const fechaDisponibleUso = String(datos.fechaDisponibleUso || "").trim();
    const residualCentavos = Number.isInteger(datos.valorResidualCentavos)
        ? datos.valorResidualCentavos
        : depreciacionACentavos(datos.valorResidual || 0);
    if (!nombre) throw new Error("Ingrese el nombre/descripción del activo fijo en la línea " + (indice + 1) + ".");
    if (costoCentavos <= 0 || depreciacionACentavos(linea.haber) > 0) throw new Error("La adquisición de un activo fijo debe registrarse al Debe en la línea " + (indice + 1) + ".");
    if (!fechaDepreciacionValida(fechaDisponibleUso)) throw new Error("Ingrese una fecha disponible para uso válida en la línea " + (indice + 1) + ".");
    if (fechaDisponibleUso < movimiento.fecha) throw new Error("La fecha disponible para uso no puede ser anterior a la adquisición en la línea " + (indice + 1) + ".");
    if (!Number.isFinite(residualCentavos) || residualCentavos < 0 || residualCentavos >= costoCentavos) throw new Error("El valor residual debe ser igual o mayor que cero y menor que el costo del activo en la línea " + (indice + 1) + ".");
    return { configuracion, costoCentavos, datos, nombre, fechaDisponibleUso, residualCentavos };
}
function validarActivoParaCalculo(activo) {
    const costo = Number(activo && activo.costoCentavos || 0);
    const residual = Number(activo && activo.valorResidualCentavos || 0);
    const vida = Number(activo && activo.vidaUtilAnios || 0);
    if (!(costo > residual) || !(vida > 0) || !fechaDepreciacionValida(activo && activo.fechaDisponibleUso)) throw new Error("El activo no contiene datos suficientes para calcular depreciación.");
    return { costo, residual, vida, baseDepreciable: costo - residual, mesesVida: Math.round(vida * 12) };
}
// Fin fase 1
// Inicio fase 2: triple verificación matemática independiente
function verificarNivel1FormulaDepreciacion(activo, detalle) {
    const costo = Number(activo.costoCentavos || 0);
    const residual = Number(activo.valorResidualCentavos || 0);
    const meses = Math.round(Number(activo.vidaUtilAnios || 0) * 12);
    const baseEsperada = costo - residual;
    const cuotaEsperada = Math.round(baseEsperada / meses);
    const sumaCalendario = detalle.calendario.reduce(function(total, item) { return total + Number(item.montoCentavos || 0); }, 0);
    const valido = detalle.baseDepreciableCentavos === baseEsperada && detalle.cuotaMensualCentavos === cuotaEsperada && sumaCalendario === baseEsperada;
    return { nivel: 1, valido, baseEsperada, cuotaEsperada, sumaCalendario };
}
function verificarNivel2InvariantesCalendario(activo, detalle) {
    const costo = Number(activo.costoCentavos || 0);
    const residual = Number(activo.valorResidualCentavos || 0);
    let acumulada = 0;
    let valido = true;
    detalle.calendario.forEach(function(item) {
        const monto = Number(item.montoCentavos || 0);
        acumulada += monto;
        if (monto < 0 || item.acumuladaCentavos !== acumulada || item.valorLibrosCentavos !== costo - acumulada || acumulada > detalle.baseDepreciableCentavos || item.valorLibrosCentavos < residual) valido = false;
    });
    if (acumulada !== detalle.baseDepreciableCentavos || costo - acumulada !== residual) valido = false;
    return { nivel: 2, valido, acumuladaFinal: acumulada, valorFinal: costo - acumulada };
}
function verificarNivel3CorteDepreciacion(activo, calculo, fechaCorteEfectiva) {
    const acumuladaRecalculada = calculo.calendario.reduce(function(total, item) {
        return total + (periodoCerradoAFecha(item.periodo, fechaCorteEfectiva) ? Number(item.montoCentavos || 0) : 0);
    }, 0);
    const base = Number(calculo.baseDepreciableCentavos || 0);
    const acumuladaEsperada = Math.min(acumuladaRecalculada, base);
    const valorEsperado = Math.max(Number(activo.valorResidualCentavos || 0), Number(activo.costoCentavos || 0) - acumuladaEsperada);
    const valido = calculo.depreciacionAcumuladaCentavos === acumuladaEsperada && calculo.valorLibrosCentavos === valorEsperado;
    return { nivel: 3, valido, acumuladaEsperada, valorEsperado };
}
function verificarCalculoDepreciacionTresNiveles(activo, calculo, fechaCorteEfectiva) {
    const nivel1 = verificarNivel1FormulaDepreciacion(activo, calculo);
    const nivel2 = verificarNivel2InvariantesCalendario(activo, calculo);
    const nivel3 = verificarNivel3CorteDepreciacion(activo, calculo, fechaCorteEfectiva);
    const valido = nivel1.valido && nivel2.valido && nivel3.valido;
    if (!valido) {
        throw new Error("La depreciación no superó las tres verificaciones matemáticas requeridas.");
    }
    return Object.freeze({ valido: true, niveles: Object.freeze([nivel1, nivel2, nivel3]) });
}
// Fin fase 2
// Inicio fase 3: cuentas, idempotencia y persistencia consolidada
function validarCuentasDepreciacion(activo, cuentasPorCodigo) {
    const cuentaGasto = cuentasPorCodigo instanceof Map ? cuentasPorCodigo.get(activo.cuentaGastoDepreciacion) : null;
    const cuentaAcumulada = cuentasPorCodigo instanceof Map ? cuentasPorCodigo.get(activo.cuentaDepreciacionAcumulada) : null;
    if (cuentasPorCodigo instanceof Map && (!cuentaGasto || !cuentaGasto.permiteMovimientos || !cuentaAcumulada || !cuentaAcumulada.permiteMovimientos)) throw new Error("Las cuentas automáticas de depreciación no están disponibles como cuentas auxiliares.");
    return { cuentaGasto, cuentaAcumulada };
}
function firmaDetallesDepreciacion(detalles) {
    return detalles.map(function(detalle) { return claveDepreciacionAutomatica(detalle.codigoActivo, detalle.periodo) + "@" + Number(detalle.montoCentavos || 0); }).sort().join(";");
}
function movimientoConsolidadoCoincide(movimiento, periodo, activos, cuentasPorCodigo) {
    const meta = movimiento && movimiento.depreciacionAutomatica;
    if (!meta || meta.consolidada !== true || String(meta.periodo || "") !== String(periodo) || !Array.isArray(meta.detalles)) return false;
    const esperados = activos.map(function(activo) {
        const cuota = obtenerCuotaVerificadaPorPeriodo(activo, periodo);
        return { codigoActivo: activo.codigoActivo, periodo, montoCentavos: cuota.montoCentavos };
    });
    const esperado = construirPartidaDepreciacionConsolidada(periodo, activos, movimiento.numero, ultimoDiaPeriodoISO(periodo), cuentasPorCodigo);
return firmaDetallesDepreciacion(detallesDepreciacionMovimiento(movimiento)) === firmaDetallesDepreciacion(esperados) && estadoPersistidoCoincide(esperado.partida, movimiento.partida) && esperado.fecha === movimiento.fecha && esperado.referencia === movimiento.referencia;
}
function verificarPersistenciaConsolidada(nuevos, verificados) {
const porId = new Map(verificados.map(function(movimiento) { return [movimiento.id, movimiento]; }));
return nuevos.filter(function(nuevo) { return !estadoPersistidoCoincide(nuevo, porId.get(nuevo.id)); });
}
// Fin fase 3
