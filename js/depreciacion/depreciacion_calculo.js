// Inicio fase 0: cálculo de depreciación por línea recta (puro: no toca DOM, IndexedDB, eventos ni telemetría)
// Depende de: depreciacion_contrato.js y depreciacion_validador.js (en ejecución).
// Fin fase 0
// Inicio fase 1: calendario de línea recta
function calcularCuotaMensualCentavos(baseDepreciable, mesesVida) {
    if (!(baseDepreciable > 0) || !(mesesVida > 0)) throw new Error("La base depreciable y la vida útil deben ser positivas.");
    return Math.round(baseDepreciable / mesesVida);
}
function calcularCuotaPrimerPeriodoCentavos(cuotaMensual, inicio) {
    const diasMes = ultimoDiaMesUTC(inicio.getUTCFullYear(), inicio.getUTCMonth()).getUTCDate();
    const diasUso = diasMes - inicio.getUTCDate() + 1;
    return Math.round(cuotaMensual * diasUso / diasMes);
}
function construirCalendarioLineaRecta(activo, parametros) {
    const inicio = fechaUTCDesdeISO(activo.fechaDisponibleUso);
    const calendario = [];
    let acumulada = 0;
    let anio = inicio.getUTCFullYear();
    let mes = inicio.getUTCMonth();
    let primerPeriodo = true;
    let seguridad = 0;
    while (acumulada < parametros.baseDepreciable && seguridad < parametros.mesesVida + 2) {
        seguridad++;
        let cuota = primerPeriodo ? calcularCuotaPrimerPeriodoCentavos(parametros.cuotaMensualCentavos, inicio) : parametros.cuotaMensualCentavos;
        primerPeriodo = false;
        cuota = Math.min(Math.max(cuota, 0), parametros.baseDepreciable - acumulada);
        acumulada += cuota;
        calendario.push({ periodo: periodoISO(anio, mes), montoCentavos: cuota, acumuladaCentavos: acumulada, valorLibrosCentavos: parametros.costo - acumulada });
        mes++;
        if (mes > 11) { mes = 0; anio++; }
    }
    if (acumulada < parametros.baseDepreciable) {
        const remanente = parametros.baseDepreciable - acumulada;
        calendario.push({ periodo: periodoISO(anio, mes), montoCentavos: remanente, acumuladaCentavos: parametros.baseDepreciable, valorLibrosCentavos: parametros.residual });
    }
    return calendario;
}
function generarCalendarioDepreciacion(activo) {
    const p = validarActivoParaCalculo(activo);
    p.cuotaMensualCentavos = calcularCuotaMensualCentavos(p.baseDepreciable, p.mesesVida);
    const resultado = { baseDepreciableCentavos: p.baseDepreciable, cuotaMensualCentavos: p.cuotaMensualCentavos, calendario: construirCalendarioLineaRecta(activo, p) };
    return resultado;
}
// Fin fase 1
// Inicio fase 2: cálculo a fecha de corte (puro si fechaSistema se suministra)
function calcularDepreciacionAFecha(activo, fechaCorte, fechaSistema) {
    const fechaCorteEfectiva = resolverFechaCorteEfectiva(fechaCorte, fechaSistema || fechaSistemaLocalISO());
    const detalle = generarCalendarioDepreciacion(activo);
    const acumulada = Math.min(detalle.calendario.reduce(function(total, periodo) {
        return total + (periodoCerradoAFecha(periodo.periodo, fechaCorteEfectiva) ? periodo.montoCentavos : 0);
    }, 0), detalle.baseDepreciableCentavos);
    const resultado = {
        fechaCorteEfectiva,
        cuotaMensualCentavos: detalle.cuotaMensualCentavos,
        depreciacionAcumuladaCentavos: acumulada,
        valorLibrosCentavos: Math.max(Number(activo.valorResidualCentavos || 0), Number(activo.costoCentavos || 0) - acumulada),
        baseDepreciableCentavos: detalle.baseDepreciableCentavos,
        calendario: detalle.calendario
    };
    resultado.verificacion = verificarCalculoDepreciacionTresNiveles(activo, resultado, fechaCorteEfectiva);
    return resultado;
}
// Fin fase 2
// Inicio fase 3: partida consolidada por período y planificación idempotente
function obtenerCuotaVerificadaPorPeriodo(activo, periodo) {
    const detalle = generarCalendarioDepreciacion(activo);
    const cuota = detalle.calendario.find(function(item) { return item.periodo === periodo; });
    if (!cuota || !(Number(cuota.montoCentavos) > 0)) throw new Error("El período no pertenece al calendario depreciable del activo.");
    const n1 = verificarNivel1FormulaDepreciacion(activo, detalle);
    const n2 = verificarNivel2InvariantesCalendario(activo, detalle);
    if (!n1.valido || !n2.valido) throw new Error("El calendario de depreciación no superó la verificación matemática.");
    return cuota;
}
function construirDetalleDepreciacionActivo(activo, periodo, cuentasPorCodigo) {
    const cuota = obtenerCuotaVerificadaPorPeriodo(activo, periodo);
    const cuentas = validarCuentasDepreciacion(activo, cuentasPorCodigo);
    const monto = depreciacionADolares(cuota.montoCentavos);
    return {
        codigoActivo: activo.codigoActivo,
        nombreActivo: activo.nombre,
        categoria: activo.categoria,
        periodo,
        montoCentavos: cuota.montoCentavos,
        lineas: [
            { codigo: activo.cuentaGastoDepreciacion, cuenta: cuentas.cuentaGasto ? cuentas.cuentaGasto.nombre : "Gasto por depreciación", descripcion: activo.nombre, debe: monto, haber: 0 },
            { codigo: activo.cuentaDepreciacionAcumulada, cuenta: cuentas.cuentaAcumulada ? cuentas.cuentaAcumulada.nombre : "Depreciación acumulada", descripcion: activo.nombre, debe: 0, haber: monto }
        ]
    };
}
function construirPartidaDepreciacionConsolidada(periodo, activos, numero, fecha, cuentasPorCodigo) {
    const detalles = activos.map(function(activo) { return construirDetalleDepreciacionActivo(activo, periodo, cuentasPorCodigo); });
    if (!detalles.length) throw new Error("No existen activos depreciables para consolidar en el período " + periodo + ".");
    const totalCentavos = detalles.reduce(function(total, detalle) { return total + detalle.montoCentavos; }, 0);
    const partida = detalles.flatMap(function(detalle) { return detalle.lineas; });
    const totalDebeCentavos = partida.reduce(function(total, linea) { return total + depreciacionACentavos(linea.debe); }, 0);
    const totalHaberCentavos = partida.reduce(function(total, linea) { return total + depreciacionACentavos(linea.haber); }, 0);
    if (totalDebeCentavos !== totalCentavos || totalHaberCentavos !== totalCentavos || totalDebeCentavos !== totalHaberCentavos) throw new Error("La partida consolidada de depreciación no supera la verificación de partida doble.");
    return {
        numero,
        fecha,
        referencia: "DEP-" + String(periodo).replace("-", ""),
        concepto: "Depreciación consolidada " + periodo,
        origen: "Depreciación",
        creadoEn: new Date().toISOString(),
        depreciacionAutomatica: {
            periodo,
            consolidada: true,
            totalCentavos,
            detalles: detalles.map(function(detalle) {
                return { codigoActivo: detalle.codigoActivo, nombreActivo: detalle.nombreActivo, categoria: detalle.categoria, montoCentavos: detalle.montoCentavos };
            })
        },
        partida
    };
}
function construirPeriodosEsperados(contexto, fechaCorteEfectiva) {
    const periodos = new Map();
    contexto.activos.forEach(function(activo) {
        generarCalendarioDepreciacion(activo).calendario.forEach(function(cuota) {
            if (ultimoDiaPeriodoISO(cuota.periodo) > fechaCorteEfectiva) return;
            if (!periodos.has(cuota.periodo)) periodos.set(cuota.periodo, []);
            periodos.get(cuota.periodo).push(activo);
        });
    });
    return periodos;
}
function planificarDepreciacionesPendientes(contexto, fechaCorteEfectiva) {
    const nuevos = [];
    const reemplazar = [];
    let omitidas = 0;
    let siguienteId = contexto.siguienteId;
    const periodos = construirPeriodosEsperados(contexto, fechaCorteEfectiva);
    Array.from(periodos.keys()).sort().forEach(function(periodo) {
        const activos = periodos.get(periodo);
        const existentes = contexto.movimientos.filter(function(movimiento) {
            return esMovimientoDepreciacionAutomatica(movimiento) && periodoDepreciacionMovimiento(movimiento) === periodo;
        });
        if (existentes.length === 1 && movimientoConsolidadoCoincide(existentes[0], periodo, activos, contexto.cuentasPorCodigo)) {
            omitidas += activos.length;
            return;
        }
        reemplazar.push.apply(reemplazar, existentes);
        existentes.forEach(function(movimiento) { contexto.numerosExistentes.delete(String(movimiento.numero || "").toLowerCase()); });
        const numero = numeroPartidaDepreciacion(periodo, contexto.numerosExistentes);
        const fechaCierre = ultimoDiaPeriodoISO(periodo);
        const movimiento = construirPartidaDepreciacionConsolidada(periodo, activos, numero, fechaCierre, contexto.cuentasPorCodigo);
        movimiento.id = existentes.length ? Math.min.apply(null, existentes.map(function(m) { return Number(m.id) || siguienteId; })) : siguienteId++;
        nuevos.push(movimiento);
    });
    return { nuevos, reemplazar, omitidas };
}
// Fin fase 3
