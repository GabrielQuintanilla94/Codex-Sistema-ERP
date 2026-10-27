function convertirACentavos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
        throw new Error("Se encontró un importe contable inválido.");
    }
    return Math.round(numero * 100);
}
function convertirADolares(centavos) {
    return Number(centavos || 0) / 100;
}
function obtenerClasificacionCuenta(codigo) {
    const clasificaciones = {
        "1": "Activo",
        "2": "Pasivo",
        "3": "Patrimonio",
        "4": "Ingresos",
        "5": "Gastos",
        "6": "Gastos"
    };
    return clasificaciones[String(codigo || "").charAt(0)] || "Sin clasificación";
}
function calcularSaldoNatural(totalDebeCentavos, totalHaberCentavos, naturaleza) {
    if (naturaleza === "Deudora") {
        return totalDebeCentavos - totalHaberCentavos;
    }
    if (naturaleza === "Acreedora") {
        return totalHaberCentavos - totalDebeCentavos;
    }
    throw new Error("La naturaleza de una cuenta no es válida.");
}
function estaDentroDelPeriodo(fecha, fechaDesde, fechaHasta) {
    if (fechaDesde && fecha < fechaDesde) return false;
    if (fechaHasta && fecha > fechaHasta) return false;
    return true;
}
function validarPartidaDoble(movimiento, cuentasPorCodigo) {
    if (!movimiento || !Array.isArray(movimiento.partida) || movimiento.partida.length < 2) {
        throw new Error("La partida " + String(movimiento && movimiento.numero || "sin número") + " no tiene suficientes líneas.");
    }
    let debeCentavos = 0;
    let haberCentavos = 0;
    movimiento.partida.forEach(function(linea) {
        const codigo = String(linea.codigo || "");
        const cuenta = cuentasPorCodigo.get(codigo);
        if (!cuenta) {
            throw new Error("La cuenta " + codigo + " no existe en el catálogo.");
        }
        if (!cuenta.permiteMovimientos) {
            throw new Error("La cuenta " + codigo + " no permite movimientos directos.");
        }
        const debe = convertirACentavos(linea.debe || 0);
        const haber = convertirACentavos(linea.haber || 0);
        if (debe < 0 || haber < 0 || (debe > 0 && haber > 0) || (debe === 0 && haber === 0)) {
            throw new Error("La partida " + movimiento.numero + " contiene una línea inválida.");
        }
        debeCentavos += debe;
        haberCentavos += haber;
    });
    if (debeCentavos !== haberCentavos) {
        throw new Error("La partida " + movimiento.numero + " está descuadrada.");
    }
    return { debeCentavos: debeCentavos, haberCentavos: haberCentavos };
}
function generarSaldos(cuentas, movimientos, fechaDesde, fechaHasta) {
    if (!Array.isArray(cuentas) || !Array.isArray(movimientos)) {
        throw new Error("El catálogo y los movimientos deben ser listas.");
    }
    const cuentasPorCodigo = new Map();
    const saldosPorCodigo = new Map();
    cuentas.forEach(function(cuenta) {
        const codigo = String(cuenta.codigo || "");
        if (!codigo || cuentasPorCodigo.has(codigo)) {
            throw new Error("El catálogo contiene códigos vacíos o duplicados.");
        }
        cuentasPorCodigo.set(codigo, cuenta);
        if (cuenta.permiteMovimientos) {
            saldosPorCodigo.set(codigo, { debeCentavos: 0, haberCentavos: 0 });
        }
    });
    movimientos.forEach(function(movimiento) {
        validarPartidaDoble(movimiento, cuentasPorCodigo);
        if (!estaDentroDelPeriodo(movimiento.fecha, fechaDesde, fechaHasta)) return;
        movimiento.partida.forEach(function(linea) {
            const saldo = saldosPorCodigo.get(String(linea.codigo));
            saldo.debeCentavos += convertirACentavos(linea.debe || 0);
            saldo.haberCentavos += convertirACentavos(linea.haber || 0);
        });
    });
    return Array.from(saldosPorCodigo.entries()).map(function(entrada) {
        const codigo = entrada[0];
        const acumulado = entrada[1];
        const cuenta = cuentasPorCodigo.get(codigo);
        const diferencia = acumulado.debeCentavos - acumulado.haberCentavos;
        return {
            codigo: codigo,
            nombre: cuenta.nombre,
            clasificacion: obtenerClasificacionCuenta(codigo),
            naturaleza: cuenta.naturaleza,
            debe: convertirADolares(acumulado.debeCentavos),
            haber: convertirADolares(acumulado.haberCentavos),
            saldoDeudor: convertirADolares(Math.max(diferencia, 0)),
            saldoAcreedor: convertirADolares(Math.max(-diferencia, 0)),
            saldoNatural: convertirADolares(calcularSaldoNatural(
                acumulado.debeCentavos,
                acumulado.haberCentavos,
                cuenta.naturaleza
            ))
        };
    }).filter(function(cuenta) {
        return cuenta.debe !== 0 || cuenta.haber !== 0;
    }).sort(function(a, b) {
        return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
    });
}
function verificarBalanzaTresNiveles(resultado) {
    const debe = convertirACentavos(resultado.totalDebe);
    const haber = convertirACentavos(resultado.totalHaber);
    const saldoDeudor = convertirACentavos(resultado.totalSaldoDeudor);
    const saldoAcreedor = convertirACentavos(resultado.totalSaldoAcreedor);
    const nivel1 = debe === haber;
    const nivel2 = saldoDeudor === saldoAcreedor;
    const nivel3 = resultado.cuentas.every(function(cuenta) {
        return convertirACentavos(cuenta.debe) - convertirACentavos(cuenta.haber) === convertirACentavos(cuenta.saldoDeudor) - convertirACentavos(cuenta.saldoAcreedor);
    });
    const verificacion = { valido: nivel1 && nivel2 && nivel3, niveles: [
        { nivel: 1, nombre: "Debe = Haber", valido: nivel1 },
        { nivel: 2, nombre: "Saldo deudor = saldo acreedor", valido: nivel2 },
        { nivel: 3, nombre: "Saldo por cuenta consistente", valido: nivel3 }
    ]};
    if (!verificacion.valido) throw new Error("La balanza no superó la triple verificación matemática.");
    return verificacion;
}
function verificarEstadoResultadosTresNiveles(resultado) {
    const ingresos = sumarSaldoNaturalCentavos(resultado.ingresos);
    const gastos = sumarSaldoNaturalCentavos(resultado.gastos);
    const neto = convertirACentavos(resultado.resultadoNeto);
    const nivel1 = ingresos === convertirACentavos(resultado.totalIngresos);
    const nivel2 = gastos === convertirACentavos(resultado.totalGastos);
    const nivel3 = neto === ingresos - gastos;
    const verificacion = { valido: nivel1 && nivel2 && nivel3, niveles: [
        { nivel: 1, nombre: "Suma ingresos", valido: nivel1 },
        { nivel: 2, nombre: "Suma gastos", valido: nivel2 },
        { nivel: 3, nombre: "Resultado = ingresos - gastos", valido: nivel3 }
    ]};
    if (!verificacion.valido) throw new Error("El estado de resultados no superó la triple verificación matemática.");
    return verificacion;
}
function verificarBalanceGeneralTresNiveles(resultado) {
    const activos = convertirACentavos(resultado.totalActivos);
    const pasivos = convertirACentavos(resultado.totalPasivos);
    const patrimonio = convertirACentavos(resultado.totalPatrimonio);
    const resultadoPeriodo = convertirACentavos(resultado.resultadoPeriodo);
    const patrimonioResultado = convertirACentavos(resultado.totalPatrimonioResultado);
    const pasivoPatrimonio = convertirACentavos(resultado.totalPasivoPatrimonio);
    const nivel1 = patrimonioResultado === patrimonio + resultadoPeriodo;
    const nivel2 = pasivoPatrimonio === pasivos + patrimonioResultado;
    const nivel3 = activos === pasivoPatrimonio;
    const verificacion = { valido: nivel1 && nivel2 && nivel3, niveles: [
        { nivel: 1, nombre: "Patrimonio + resultado", valido: nivel1 },
        { nivel: 2, nombre: "Pasivo + patrimonio", valido: nivel2 },
        { nivel: 3, nombre: "Activo = pasivo + patrimonio", valido: nivel3 }
    ]};
    if (!verificacion.valido) throw new Error("El balance general no superó la triple verificación matemática.");
    return verificacion;
}
function generarBalanzaComprobacion(cuentas, movimientos, fechaDesde, fechaHasta) {
    const saldos = generarSaldos(cuentas, movimientos, fechaDesde || "", fechaHasta || "");
    const totalesCentavos = saldos.reduce(function(totales, cuenta) {
        totales.debe += convertirACentavos(cuenta.debe);
        totales.haber += convertirACentavos(cuenta.haber);
        totales.saldoDeudor += convertirACentavos(cuenta.saldoDeudor);
        totales.saldoAcreedor += convertirACentavos(cuenta.saldoAcreedor);
        return totales;
    }, { debe: 0, haber: 0, saldoDeudor: 0, saldoAcreedor: 0 });
    if (totalesCentavos.debe !== totalesCentavos.haber) {
        throw new Error("Existe una inconsistencia entre los cargos y abonos almacenados.");
    }
    const resultado = {
        cuentas: saldos,
        totalDebe: convertirADolares(totalesCentavos.debe),
        totalHaber: convertirADolares(totalesCentavos.haber),
        totalSaldoDeudor: convertirADolares(totalesCentavos.saldoDeudor),
        totalSaldoAcreedor: convertirADolares(totalesCentavos.saldoAcreedor)
    };
    resultado.verificacion = verificarBalanzaTresNiveles(resultado);
    return resultado;
}
function sumarSaldoNaturalCentavos(cuentas) {
    return cuentas.reduce(function(total, cuenta) {
        return total + convertirACentavos(cuenta.saldoNatural);
    }, 0);
}
function generarEstadoResultados(cuentas, movimientos, fechaDesde, fechaHasta) {
    const saldos = generarSaldos(cuentas, movimientos, fechaDesde || "", fechaHasta || "");
    const ingresos = saldos.filter(function(cuenta) {
        return cuenta.clasificacion === "Ingresos" && cuenta.saldoNatural !== 0;
    });
    const gastos = saldos.filter(function(cuenta) {
        return cuenta.clasificacion === "Gastos" && cuenta.saldoNatural !== 0;
    });
    const totalIngresosCentavos = sumarSaldoNaturalCentavos(ingresos);
    const totalGastosCentavos = sumarSaldoNaturalCentavos(gastos);
    const resultadoNetoCentavos = totalIngresosCentavos - totalGastosCentavos;
    const resultado = {
        ingresos: ingresos,
        gastos: gastos,
        totalIngresos: convertirADolares(totalIngresosCentavos),
        totalGastos: convertirADolares(totalGastosCentavos),
        resultadoNeto: convertirADolares(resultadoNetoCentavos),
        tipoResultado: resultadoNetoCentavos >= 0 ? "Utilidad neta" : "Pérdida neta"
    };
    resultado.verificacion = verificarEstadoResultadosTresNiveles(resultado);
    return resultado;
}
function generarBalanceGeneral(cuentas, movimientos, fechaHasta) {
    const saldos = generarSaldos(cuentas, movimientos, "", fechaHasta || "");
    const activos = saldos.filter(function(cuenta) {
        return cuenta.clasificacion === "Activo" && cuenta.saldoNatural !== 0;
    }).map(function(cuenta) {
        return cuenta.naturaleza === "Acreedora"
            ? { ...cuenta, saldoNatural: -cuenta.saldoNatural }
            : cuenta;
    });
    const pasivos = saldos.filter(function(cuenta) {
        return cuenta.clasificacion === "Pasivo" && cuenta.saldoNatural !== 0;
    });
    const patrimonio = saldos.filter(function(cuenta) {
        return cuenta.clasificacion === "Patrimonio" && cuenta.saldoNatural !== 0;
    });
    const estadoResultados = generarEstadoResultados(cuentas, movimientos, "", fechaHasta || "");
    const totalActivosCentavos = sumarSaldoNaturalCentavos(activos);
    const totalPasivosCentavos = sumarSaldoNaturalCentavos(pasivos);
    const totalPatrimonioCentavos = sumarSaldoNaturalCentavos(patrimonio);
    const resultadoCentavos = convertirACentavos(estadoResultados.resultadoNeto);
    const totalPatrimonioResultadoCentavos = totalPatrimonioCentavos + resultadoCentavos;
    const totalPasivoPatrimonioCentavos = totalPasivosCentavos + totalPatrimonioResultadoCentavos;
    if (totalActivosCentavos !== totalPasivoPatrimonioCentavos) {
        throw new Error("El Balance general no cumple Activo = Pasivo + Patrimonio.");
    }
    const resultado = {
        activos: activos,
        pasivos: pasivos,
        patrimonio: patrimonio,
        totalActivos: convertirADolares(totalActivosCentavos),
        totalPasivos: convertirADolares(totalPasivosCentavos),
        totalPatrimonio: convertirADolares(totalPatrimonioCentavos),
        resultadoPeriodo: estadoResultados.resultadoNeto,
        tipoResultado: estadoResultados.resultadoNeto >= 0
            ? "Resultado del período"
            : "Pérdida del período",
        totalPatrimonioResultado: convertirADolares(totalPatrimonioResultadoCentavos),
        totalPasivoPatrimonio: convertirADolares(totalPasivoPatrimonioCentavos)
    };
    resultado.verificacion = verificarBalanceGeneralTresNiveles(resultado);
    return resultado;
}
