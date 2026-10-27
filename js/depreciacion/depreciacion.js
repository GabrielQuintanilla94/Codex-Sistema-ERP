const CONFIGURACION_DEPRECIACION = Object.freeze({
    "1201": Object.freeze({ categoria: "Edificios", vidaUtilAnios: 20, tasaFiscalAnual: 0.05, cuentaDepreciacionAcumulada: "1301", cuentaGastoDepreciacion: "6201" }),
    "1202": Object.freeze({ categoria: "Maquinaria", vidaUtilAnios: 5, tasaFiscalAnual: 0.20, cuentaDepreciacionAcumulada: "1302", cuentaGastoDepreciacion: "6202" }),
    "1203": Object.freeze({ categoria: "Automóviles", vidaUtilAnios: 4, tasaFiscalAnual: 0.25, cuentaDepreciacionAcumulada: "1303", cuentaGastoDepreciacion: "6203" }),
    "1204": Object.freeze({ categoria: "Otros bienes muebles", vidaUtilAnios: 2, tasaFiscalAnual: 0.50, cuentaDepreciacionAcumulada: "1304", cuentaGastoDepreciacion: "6204" })
});

const telemetriaDepreciacion = { calculos: 0, errores: 0, verificaciones: 0, ultimaOperacion: "Sin operaciones" };

/* FASE 00 — SRP: telemetría aislada; no calcula ni persiste. */
function registrarTelemetriaDepreciacion(operacion, error) {
    telemetriaDepreciacion.ultimaOperacion = String(operacion || "");
    if (error) telemetriaDepreciacion.errores++; else telemetriaDepreciacion.calculos++;
}
function registrarVerificacionDepreciacion() {
    telemetriaDepreciacion.verificaciones++;
}

/* FASE 01 — Configuración, conversión y fechas: utilidades deterministas. */
function obtenerConfiguracionDepreciacion(codigoCuenta) {
    return CONFIGURACION_DEPRECIACION[String(codigoCuenta || "")] || null;
}
function esCuentaActivoFijo(codigoCuenta) {
    return Boolean(obtenerConfiguracionDepreciacion(codigoCuenta));
}
function depreciacionACentavos(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
}
function depreciacionADolares(centavos) {
    return Number(centavos || 0) / 100;
}
function fechaDepreciacionValida(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ""))) return false;
    const [anio, mes, dia] = String(fecha).split("-").map(Number);
    const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));
    return fechaUTC.getUTCFullYear() === anio && fechaUTC.getUTCMonth() === mes - 1 && fechaUTC.getUTCDate() === dia;
}
function fechaUTCDesdeISO(fecha) {
    const [anio, mes, dia] = String(fecha).split("-").map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
}
function ultimoDiaMesUTC(anio, mesCero) {
    return new Date(Date.UTC(anio, mesCero + 1, 0));
}
function periodoISO(anio, mesCero) {
    return String(anio).padStart(4, "0") + "-" + String(mesCero + 1).padStart(2, "0");
}
function fechaSistemaLocalISO() {
    const ahora = new Date();
    return String(ahora.getFullYear()).padStart(4, "0") + "-" + String(ahora.getMonth() + 1).padStart(2, "0") + "-" + String(ahora.getDate()).padStart(2, "0");
}
function resolverFechaCorteEfectiva(fechaCorte, fechaSistema) {
    if (!fechaDepreciacionValida(fechaCorte)) throw new Error("La fecha de corte no es válida.");
    if (!fechaDepreciacionValida(fechaSistema)) throw new Error("La fecha del sistema no es válida.");
    return fechaCorte <= fechaSistema ? fechaCorte : fechaSistema;
}
function fechaCorteEfectivaDepreciacion(fechaCorte, fechaSistema) {
    return resolverFechaCorteEfectiva(fechaCorte, fechaSistema || fechaSistemaLocalISO());
}
function ultimoDiaPeriodoISO(periodo) {
    if (!/^\d{4}-\d{2}$/.test(String(periodo || ""))) throw new Error("El período de depreciación no es válido.");
    const [anio, mes] = String(periodo).split("-").map(Number);
    return ultimoDiaMesUTC(anio, mes - 1).toISOString().slice(0, 10);
}
function periodoCerradoAFecha(periodo, fechaCorteEfectiva) {
    if (!fechaDepreciacionValida(fechaCorteEfectiva)) throw new Error("La fecha efectiva de corte no es válida.");
    return ultimoDiaPeriodoISO(periodo) <= fechaCorteEfectiva;
}

/* FASE 02 — SRP: validar una adquisición PPE sin mezclar cálculo ni persistencia. */
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
function construirMetadataActivoFijo(movimiento, linea, indice, validado) {
    const c = validado.configuracion;
    return {
        codigoActivo: String(validado.datos.codigoActivo || ("AF-" + String(movimiento.numero || movimiento.id || "SIN-ID") + "-" + (indice + 1))).trim(),
        nombre: validado.nombre,
        categoria: c.categoria,
        fechaAdquisicion: movimiento.fecha,
        fechaDisponibleUso: validado.fechaDisponibleUso,
        costoCentavos: validado.costoCentavos,
        valorResidualCentavos: validado.residualCentavos,
        vidaUtilAnios: c.vidaUtilAnios,
        tasaFiscalAnual: c.tasaFiscalAnual,
        metodo: "LINEA_RECTA",
        cuentaActivo: String(linea.codigo),
        cuentaDepreciacionAcumulada: c.cuentaDepreciacionAcumulada,
        cuentaGastoDepreciacion: c.cuentaGastoDepreciacion
    };
}
function prepararMovimientoConDepreciacion(movimiento) {
    const copia = { ...movimiento, partida: (movimiento.partida || []).map(function(linea) { return { ...linea }; }) };
    copia.partida.forEach(function(linea, indice) {
        const validado = validarDatosAdquisicionActivo(copia, linea, indice);
        if (validado) linea.activoFijo = construirMetadataActivoFijo(copia, linea, indice, validado);
    });
    registrarTelemetriaDepreciacion("Preparar movimiento", false);
    return copia;
}

/* FASE 03 — SRP: reconstruir el auxiliar PPE exclusivamente desde movimientos. */
function activoDesdeLineaMovimiento(movimiento, linea, indice) {
    if (!esCuentaActivoFijo(linea.codigo) || !(Number(linea.debe || 0) > 0) || !linea.activoFijo) return null;
    const datos = linea.activoFijo;
    if (!fechaDepreciacionValida(datos.fechaDisponibleUso)) return null;
    const configuracion = obtenerConfiguracionDepreciacion(linea.codigo);
    return {
        codigoActivo: String(datos.codigoActivo || ("AF-" + movimiento.id + "-" + (indice + 1))),
        nombre: String(datos.nombre || linea.descripcion || linea.cuenta || "Activo fijo"),
        categoria: String(datos.categoria || configuracion.categoria),
        cuentaActivo: String(linea.codigo),
        fechaAdquisicion: String(datos.fechaAdquisicion || movimiento.fecha),
        fechaDisponibleUso: String(datos.fechaDisponibleUso),
        costoCentavos: Number(datos.costoCentavos || depreciacionACentavos(linea.debe)),
        valorResidualCentavos: Number(datos.valorResidualCentavos || 0),
        vidaUtilAnios: Number(datos.vidaUtilAnios || configuracion.vidaUtilAnios),
        tasaFiscalAnual: Number(datos.tasaFiscalAnual || configuracion.tasaFiscalAnual),
        cuentaDepreciacionAcumulada: String(datos.cuentaDepreciacionAcumulada || configuracion.cuentaDepreciacionAcumulada),
        cuentaGastoDepreciacion: String(datos.cuentaGastoDepreciacion || configuracion.cuentaGastoDepreciacion),
        movimientoId: movimiento.id,
        numeroPartida: movimiento.numero || ""
    };
}
function extraerActivosFijosDesdeMovimientos(movimientos) {
    const activos = [];
    (Array.isArray(movimientos) ? movimientos : []).forEach(function(movimiento) {
        (movimiento.partida || []).forEach(function(linea, indice) {
            const activo = activoDesdeLineaMovimiento(movimiento, linea, indice);
            if (activo) activos.push(activo);
        });
    });
    activos.sort(function(a, b) { return a.fechaDisponibleUso.localeCompare(b.fechaDisponibleUso) || a.codigoActivo.localeCompare(b.codigoActivo); });
    registrarTelemetriaDepreciacion("Reconstruir auxiliar PPE", false);
    return activos;
}

/* FASE 04 — SRP/determinismo: cálculo puro del calendario de línea recta. */
function validarActivoParaCalculo(activo) {
    const costo = Number(activo && activo.costoCentavos || 0);
    const residual = Number(activo && activo.valorResidualCentavos || 0);
    const vida = Number(activo && activo.vidaUtilAnios || 0);
    if (!(costo > residual) || !(vida > 0) || !fechaDepreciacionValida(activo && activo.fechaDisponibleUso)) throw new Error("El activo no contiene datos suficientes para calcular depreciación.");
    return { costo, residual, vida, baseDepreciable: costo - residual, mesesVida: Math.round(vida * 12) };
}
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
    registrarTelemetriaDepreciacion("Generar calendario", false);
    return resultado;
}

/* FASE 05 — Triple verificación matemática independiente antes de render/persistencia. */
function verificarNivel1FormulaDepreciacion(activo, detalle) {
    registrarVerificacionDepreciacion();
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
    registrarVerificacionDepreciacion();
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
    registrarVerificacionDepreciacion();
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
        registrarTelemetriaDepreciacion("Verificación matemática triple", true);
        throw new Error("La depreciación no superó las tres verificaciones matemáticas requeridas.");
    }
    return Object.freeze({ valido: true, niveles: Object.freeze([nivel1, nivel2, nivel3]) });
}

/* FASE 06 — Cálculo a corte: puro si fechaSistema se suministra explícitamente. */
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
    registrarTelemetriaDepreciacion("Depreciación a fecha", false);
    return resultado;
}

/* FASE 07 — SRP: construir una única partida consolidada por período, sin guardar en BD. */
function validarCuentasDepreciacion(activo, cuentasPorCodigo) {
    const cuentaGasto = cuentasPorCodigo instanceof Map ? cuentasPorCodigo.get(activo.cuentaGastoDepreciacion) : null;
    const cuentaAcumulada = cuentasPorCodigo instanceof Map ? cuentasPorCodigo.get(activo.cuentaDepreciacionAcumulada) : null;
    if (cuentasPorCodigo instanceof Map && (!cuentaGasto || !cuentaGasto.permiteMovimientos || !cuentaAcumulada || !cuentaAcumulada.permiteMovimientos)) throw new Error("Las cuentas automáticas de depreciación no están disponibles como cuentas auxiliares.");
    return { cuentaGasto, cuentaAcumulada };
}
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

/* FASE 08 — Idempotencia y planificación consolidada: una partida por período. */
function claveDepreciacionAutomatica(codigoActivo, periodo) {
    return String(codigoActivo || "") + "|" + String(periodo || "");
}
function detallesDepreciacionMovimiento(movimiento) {
    const meta = movimiento && movimiento.depreciacionAutomatica;
    if (!meta) return [];
    if (Array.isArray(meta.detalles)) {
        return meta.detalles.map(function(detalle) {
            return { codigoActivo: String(detalle.codigoActivo || ""), periodo: String(detalle.periodo || meta.periodo || ""), montoCentavos: Number(detalle.montoCentavos || 0) };
        }).filter(function(detalle) { return detalle.codigoActivo && detalle.periodo; });
    }
    if (meta.codigoActivo && meta.periodo) return [{ codigoActivo: String(meta.codigoActivo), periodo: String(meta.periodo), montoCentavos: Number(meta.montoCentavos || 0) }];
    return [];
}
function movimientoCorrespondeDepreciacion(movimiento, codigoActivo, periodo) {
    if (detallesDepreciacionMovimiento(movimiento).some(function(detalle) { return claveDepreciacionAutomatica(detalle.codigoActivo, detalle.periodo) === claveDepreciacionAutomatica(codigoActivo, periodo); })) return true;
    return Boolean(movimiento) && movimiento.origen === "Depreciación" && String(movimiento.referencia || "") === String(codigoActivo || "") && String(movimiento.concepto || "").includes(String(periodo || ""));
}
function esMovimientoDepreciacionAutomatica(movimiento) {
    return Boolean(movimiento && (movimiento.depreciacionAutomatica || (movimiento.origen === "Depreciación" && /^DEP-/i.test(String(movimiento.numero || "")))));
}
function periodoDepreciacionMovimiento(movimiento) {
    const meta = movimiento && movimiento.depreciacionAutomatica;
    if (meta && meta.periodo) return String(meta.periodo);
    const detalles = detallesDepreciacionMovimiento(movimiento);
    if (detalles.length) return detalles[0].periodo;
    const coincidencia = String(movimiento && movimiento.concepto || "").match(/\b(\d{4}-\d{2})\b/);
    return coincidencia ? coincidencia[1] : "";
}
function numeroPartidaDepreciacion(periodo, numerosExistentes) {
    const base = "DEP-" + String(periodo).replace("-", "");
    let numero = base;
    let sufijo = 2;
    while (numerosExistentes.has(numero.toLowerCase())) numero = base + "-" + sufijo++;
    numerosExistentes.add(numero.toLowerCase());
    return numero;
}
function crearContextoDepreciacion(movimientos, cuentas) {
    return {
        movimientos: Array.isArray(movimientos) ? movimientos : [],
        activos: extraerActivosFijosDesdeMovimientos(movimientos),
        cuentasPorCodigo: new Map((cuentas || []).map(function(cuenta) { return [String(cuenta.codigo), cuenta]; })),
        numerosExistentes: new Set((movimientos || []).map(function(m) { return String(m.numero || "").toLowerCase(); })),
        siguienteId: (movimientos || []).reduce(function(maximo, m) { return Math.max(maximo, Number(m.id) || 0); }, 0) + 1
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

/* FASE 09 — Persistencia aislada, migración de partidas antiguas y verificación posterior. */
function verificarPersistenciaConsolidada(nuevos, verificados) {
const porId = new Map(verificados.map(function(movimiento) { return [movimiento.id, movimiento]; }));
return nuevos.filter(function(nuevo) { return !estadoPersistidoCoincide(nuevo, porId.get(nuevo.id)); });
}
async function eliminarDepreciacionesParaReemplazo(movimientos) {
    for (const movimiento of movimientos) await eliminarMovimientoBD(movimiento.id);
}
async function revertirSincronizacionDepreciacion(nuevos, reemplazados) {
const cambios = nuevos.map(function(m) { return { almacen: ALMACEN_MOVIMIENTOS, accion: "eliminar", clave: m.id }; });
reemplazados.forEach(function(m) { cambios.push({ almacen: ALMACEN_MOVIMIENTOS, accion: "guardar", valor: m }); });
await aplicarCambioContableBD(cambios);
}
/* ALGORITMIA 5 FASES — sincronización/contabilización de depreciación. */
function fase1EntradaSincronizacionDepreciacion(fechaCorte) {
    const fechaSistema = fechaSistemaLocalISO();
    const fechaCorteEfectiva = resolverFechaCorteEfectiva(fechaCorte, fechaSistema);
    return { fechaSistema: fechaSistema, fechaCorteEfectiva: fechaCorteEfectiva };
}
async function fase2ValidarSincronizacionDepreciacion(entrada) {
    const [movimientos, cuentas] = await Promise.all([obtenerMovimientosBD(), obtenerCuentasBD()]);
    const contexto = crearContextoDepreciacion(movimientos, cuentas);
    // Fuerza validación pura de todos los activos antes de planificar persistencia.
    contexto.activos.forEach(function(activo) { calcularDepreciacionAFecha(activo, entrada.fechaCorteEfectiva, entrada.fechaSistema); });
    return { entrada: entrada, contexto: contexto };
}
function fase3ProcesarSincronizacionDepreciacion(validacion) {
    const plan = planificarDepreciacionesPendientes(validacion.contexto, validacion.entrada.fechaCorteEfectiva);
    return { ...validacion, plan: plan };
}
async function fase4PersistirSincronizacionDepreciacion(proceso) {
const cambios = proceso.plan.reemplazar.map(function(m) { return { almacen: ALMACEN_MOVIMIENTOS, accion: "eliminar", clave: m.id }; });
proceso.plan.nuevos.forEach(function(m) { cambios.push({ almacen: ALMACEN_MOVIMIENTOS, accion: "agregar", valor: m }); });
await aplicarCambioContableBD(cambios, proceso.contexto.movimientos);
return proceso;
}
async function fase5VerificarSincronizacionDepreciacion(proceso) {
    const plan = proceso.plan;
    // Inicio fase 5 — Incluir también períodos omitidos por idempotencia.
try {
const idsReemplazados = new Set(plan.reemplazar.map(function(m) { return m.id; }));
const esperados = proceso.contexto.movimientos.filter(function(m) { return esMovimientoDepreciacionAutomatica(m) && !idsReemplazados.has(m.id); }).concat(plan.nuevos);
const verificados = await obtenerMovimientosBD();
if (verificarPersistenciaConsolidada(esperados, verificados).length) throw new Error("La fase 5 no pudo verificar todas las partidas consolidadas de depreciación.");
} catch (error) {
await revertirSincronizacionDepreciacion(plan.nuevos, plan.reemplazar);
throw error;
}
// Fin fase 5
    const resultado = {
        creadas: plan.nuevos.length,
        reemplazadas: plan.reemplazar.length,
        omitidas: plan.omitidas,
        activos: proceso.contexto.activos.length,
        fechaCorteEfectiva: proceso.entrada.fechaCorteEfectiva
    };
    if (typeof publicarEventoContable === "function" && typeof TIPOS_EVENTOS !== "undefined" && TIPOS_EVENTOS.DEPRECIACION_SINCRONIZADA) {
        await publicarEventoContable(TIPOS_EVENTOS.DEPRECIACION_SINCRONIZADA, "depreciacion", resultado.fechaCorteEfectiva, resultado);
    }
    registrarTelemetriaDepreciacion(plan.nuevos.length ? "Sincronizar depreciación consolidada" : "Sincronizar depreciación: sin pendientes", false);
    return resultado;
}
async function sincronizarDepreciacionAutomatica(fechaCorte) {
return ejecutarConBloqueoContable(async function() {
    try {
        // FASE 1 — Entrada/corte efectivo.
        const entrada = fase1EntradaSincronizacionDepreciacion(fechaCorte);
        // FASE 2 — Validación de activos, cuentas e invariantes matemáticos.
        const validacion = await fase2ValidarSincronizacionDepreciacion(entrada);
        // FASE 3 — Planificación determinista e idempotente.
        const proceso = fase3ProcesarSincronizacionDepreciacion(validacion);
        // FASE 4 — Persistencia aislada con rollback.
        await fase4PersistirSincronizacionDepreciacion(proceso);
        // FASE 5 — Relectura/verificación y publicación EDA.
        return await fase5VerificarSincronizacionDepreciacion(proceso);
    } catch (error) {
        registrarTelemetriaDepreciacion("Sincronizar depreciación consolidada", true);
        throw error;
    }
});
}

