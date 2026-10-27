const TASA_IVA = 0.13;
const TASA_IVA_ENTERA = 13;
const CUENTA_IVA_CREDITO = "1105";
const CUENTA_REMANENTE_IVA = "1106";
const CUENTA_IVA_DEBITO = "2102";
const CUENTA_IVA_POR_PAGAR = "2103";

function ivaACentavos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) throw new Error("El importe para IVA no es válido.");
    return Math.round(numero * 100);
}
function ivaADolares(centavos) { return Number(centavos || 0) / 100; }
function calcularIVACentavos(baseCentavos) {
    const base = Number(baseCentavos);
    if (!Number.isInteger(base) || base < 0) throw new Error("La base en centavos para IVA no es válida.");
    return Math.round(base * TASA_IVA_ENTERA / 100);
}
function verificarCalculoIVATresNiveles(baseCentavos, ivaCentavos, totalCentavos) {
    const nivel1 = ivaCentavos === calcularIVACentavos(baseCentavos);
    const nivel2 = totalCentavos === baseCentavos + ivaCentavos;
    const nivel3 = baseCentavos === totalCentavos - ivaCentavos && baseCentavos >= 0 && ivaCentavos >= 0 && totalCentavos >= 0;
    return {
        valido: nivel1 && nivel2 && nivel3,
        niveles: [
            { nivel: 1, nombre: "Tasa 13%", valido: nivel1 },
            { nivel: 2, nombre: "Total = base + IVA", valido: nivel2 },
            { nivel: 3, nombre: "Comprobación inversa y límites", valido: nivel3 }
        ]
    };
}
function calcularIVA(base) {
    const baseCentavos = ivaACentavos(base);
    if (baseCentavos < 0) throw new Error("La base imponible no puede ser negativa.");
    const ivaCentavos = calcularIVACentavos(baseCentavos);
    const totalCentavos = baseCentavos + ivaCentavos;
    const verificacion = verificarCalculoIVATresNiveles(baseCentavos, ivaCentavos, totalCentavos);
    if (!verificacion.valido) throw new Error("El cálculo de IVA no superó la triple verificación matemática.");
    return {
        base: ivaADolares(baseCentavos),
        iva: ivaADolares(ivaCentavos),
        total: ivaADolares(totalCentavos),
        verificacion: verificacion
    };
}
function verificarResumenIVATresNiveles(creditoCentavos, debitoCentavos, resultado) {
    const diferencia = debitoCentavos - creditoCentavos;
    const pagarCentavos = ivaACentavos(resultado.ivaPorPagar || 0);
    const remanenteCentavos = ivaACentavos(resultado.remanenteCreditoFiscal || 0);
    const nivel1 = ivaACentavos(resultado.creditoFiscal || 0) === creditoCentavos && ivaACentavos(resultado.debitoFiscal || 0) === debitoCentavos;
    const nivel2 = diferencia >= 0 ? pagarCentavos === diferencia && remanenteCentavos === 0 : remanenteCentavos === -diferencia && pagarCentavos === 0;
    const nivel3 = debitoCentavos + remanenteCentavos === creditoCentavos + pagarCentavos;
    return {
        valido: nivel1 && nivel2 && nivel3,
        niveles: [
            { nivel: 1, nombre: "Acumulados = libros", valido: nivel1 },
            { nivel: 2, nombre: "Diferencia = pagar/remanente", valido: nivel2 },
            { nivel: 3, nombre: "Identidad de liquidación", valido: nivel3 }
        ]
    };
}
function resumirIVA(compras, ventas) {
    const creditoCentavos = (compras || []).reduce(function(total, item) {
        return total + ivaACentavos(item.ivaCredito || 0);
    }, 0);
    const debitoCentavos = (ventas || []).reduce(function(total, item) {
        return total + ivaACentavos(item.ivaDebito || 0);
    }, 0);
    const diferencia = debitoCentavos - creditoCentavos;
    const resultado = {
        creditoFiscal: ivaADolares(creditoCentavos),
        debitoFiscal: ivaADolares(debitoCentavos),
        ivaPorPagar: diferencia > 0 ? ivaADolares(diferencia) : 0,
        remanenteCreditoFiscal: diferencia < 0 ? ivaADolares(-diferencia) : 0
    };
    resultado.verificacion = verificarResumenIVATresNiveles(creditoCentavos, debitoCentavos, resultado);
    if (!resultado.verificacion.valido) throw new Error("El resumen de IVA no superó la triple verificación matemática.");
    return resultado;
}
function normalizarFechaF07(fechaISO) {
    const partes = String(fechaISO || "").split("-");
    if (partes.length !== 3) throw new Error("Fecha inválida para F07.");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}
function soloAlfanumerico(valor) {
    return String(valor || "").replace(/[^A-Za-z0-9]/g, "");
}
function numeroF07(valor) {
    return Number(valor || 0).toFixed(2);
}
function escaparCSVF07(valor) {
    const texto = String(valor ?? "");
    if (/[";,\n\r]/.test(texto)) return '"' + texto.replace(/"/g, '""') + '"';
    return texto;
}
function construirCSVSinEncabezados(filas) {
    return (filas || []).map(function(fila) {
        return fila.map(escaparCSVF07).join(";");
    }).join("\r\n");
}
function descargarTexto(nombre, contenido, usarBOM) {
    const prefijo = usarBOM ? "\ufeff" : "";
    const blob = new Blob([prefijo + contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
}
