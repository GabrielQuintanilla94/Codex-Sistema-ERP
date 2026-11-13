// Inicio fase 0: validador de compras (reglas puras; lanza Error con el mismo mensaje de siempre)
// Depende de: comercial/operaciones.js, impuestos/iva.js y compras_contrato.js (en ejecución).
// Fin fase 0
// Inicio fase 1: reglas de línea y verificaciones triples
function validarLineaCompra(linea) {
    const sku = String(linea.sku || "").trim();
    const descripcion = String(linea.descripcion || "").trim();
    const cantidad = Number(linea.cantidad);
    const monto = Number(linea.montoGravado);
    if (!sku) throw new Error("El SKU de compra es obligatorio.");
    if (!descripcion) throw new Error("La descripción de compra es obligatoria.");
    if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error("La cantidad de compra debe ser mayor que cero.");
    if (!Number.isFinite(monto) || monto <= 0) throw new Error("El monto gravado de compra debe ser mayor que cero.");
    return { sku: sku, descripcion: descripcion, cantidad: cantidad, montoGravado: comercialADolares(comercialACentavos(monto)) };
}

function verificarResumenCompraTresNiveles(lineas, baseCentavos, calculoIVA) {
    const sumaLineasCentavos = (lineas || []).reduce(function(total, linea) {
        return total + comercialACentavos(linea.montoGravado || 0);
    }, 0);
    const ivaCentavos = comercialACentavos(calculoIVA.iva || 0);
    const totalCentavos = comercialACentavos(calculoIVA.total || 0);
    const nivel1 = sumaLineasCentavos === baseCentavos;
    const nivel2 = Boolean(calculoIVA.verificacion?.valido) && totalCentavos === baseCentavos + ivaCentavos;
    const nivel3 = baseCentavos === totalCentavos - ivaCentavos && baseCentavos >= 0 && ivaCentavos >= 0;
    return {
        valido: nivel1 && nivel2 && nivel3,
        niveles: [
            { nivel: 1, nombre: "Suma de líneas = base", valido: nivel1 },
            { nivel: 2, nombre: "IVA y total verificados", valido: nivel2 },
            { nivel: 3, nombre: "Comprobación inversa", valido: nivel3 }
        ]
    };
}

function verificarCompraConstruidaTresNiveles(registro, movimiento, resumen) {
    const inventarioCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        return String(linea.codigo || "") === CUENTA_INVENTARIO_COMPRA
            ? total + comercialACentavos(linea.debe || 0)
            : total;
    }, 0);
    const ivaCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        return String(linea.codigo || "") === CUENTA_IVA_CREDITO
            ? total + comercialACentavos(linea.debe || 0)
            : total;
    }, 0);
    const proveedoresCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        return String(linea.codigo || "") === CUENTA_PROVEEDORES
            ? total + comercialACentavos(linea.haber || 0)
            : total;
    }, 0);
    const baseCentavos = comercialACentavos(registro.comprasGravadas);
    const creditoCentavos = comercialACentavos(registro.ivaCredito);
    const totalCentavos = comercialACentavos(registro.total);
    const nivel1 = Boolean(resumen.verificacion?.valido) && inventarioCentavos === baseCentavos;
    const nivel2 = ivaCentavos === creditoCentavos && proveedoresCentavos === totalCentavos;
    let nivel3 = false;
    try {
        nivel3 = validarPartidaComercial(movimiento) === true && totalCentavos === baseCentavos + creditoCentavos;
    } catch (error) {
        nivel3 = false;
    }
    return {
        valido: nivel1 && nivel2 && nivel3,
        niveles: [
            { nivel: 1, nombre: "Inventario = base gravada", valido: nivel1 },
            { nivel: 2, nombre: "IVA y proveedor = resumen", valido: nivel2 },
            { nivel: 3, nombre: "Partida doble y total", valido: nivel3 }
        ]
    };
}
// Fin fase 1
// Inicio fase 2: validación contra el estado leído (tercero, período IVA, duplicados e invariantes)
function validarCompraContraEstado(entrada, estado) {
    const tercero = (estado.terceros || []).find(function(t) { return String(t.nrc) === String(entrada.nrc); });
    if (!tercero) throw new Error("El NRC del proveedor no existe en el catálogo de terceros.");
    const canonica = { ...entrada, proveedor: tercero.razonSocial, nrc: tercero.nrc, giro: tercero.giro || "" };
    validarPeriodosEditablesIVA(canonica.fecha, canonica.fecha, estado.movimientos || []);
    const id = crearIdOperacion("COMPRA", canonica.fecha, canonica.documento, canonica.nrc);
    validarIdentidadFiscalDuplicada(entrada, estado.compras || [], estado.idExcluir);
    const duplicada = (estado.compras || []).some(function(c) { return String(c.id) !== String(estado.idExcluir || "") && String(c.id) === String(id); });
    if (duplicada) throw new Error("La compra ya fue registrada para ese proveedor y documento.");
    calcularResumenCompra(canonica.lineas, { estricto: true });
    return { canonica: canonica, id: id };
}
// Fin fase 2
