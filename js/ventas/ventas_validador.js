// Inicio fase 0: validador de ventas (reglas puras; lanza Error con el mismo mensaje de siempre)
// Depende de: comercial/operaciones.js, impuestos/iva.js, inventario/inventario_costos.js y ventas_contrato.js (en ejecución).
// Fin fase 0
// Inicio fase 1: reglas de línea, existencias y verificaciones triples
function validarLineaVenta(linea) {
    const sku = String(linea.sku || "").trim();
    const cantidad = Number(linea.cantidad);
    const precio = Number(linea.precioUnitario);
    if (!sku) throw new Error("El SKU de venta es obligatorio.");
    if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error("La cantidad de venta debe ser mayor que cero.");
    if (!Number.isFinite(precio) || precio <= 0) throw new Error("El precio unitario debe ser mayor que cero.");
    return {
        sku: sku,
        cantidad: cantidad,
        precioUnitario: comercialADolares(comercialACentavos(precio))
    };
}

function validarExistenciaVenta(lineas, inventarioActual) {
    const inventarioPorSKU = new Map((inventarioActual || []).map(function(producto) {
        return [String(producto.sku), producto];
    }));
    const requeridoPorSKU = new Map();
    (lineas || []).forEach(function(linea) {
        requeridoPorSKU.set(linea.sku, Number(requeridoPorSKU.get(linea.sku) || 0) + Number(linea.cantidad || 0));
    });
    requeridoPorSKU.forEach(function(cantidad, sku) {
        const producto = inventarioPorSKU.get(sku);
        if (!producto) throw new Error("El SKU " + sku + " no existe en inventario.");
        if (cantidad > Number(producto.cantidad || 0)) {
            throw new Error("La venta acumulada de " + sku + " supera la existencia disponible (" + Number(producto.cantidad || 0) + ").");
        }
    });
    return inventarioPorSKU;
}

function verificarResumenVentaTresNiveles(subtotalesCentavos, baseCentavos, calculoIVA) {
    const ivaCentavos = comercialACentavos(calculoIVA.iva);
    const totalCentavos = comercialACentavos(calculoIVA.total);
    const nivel1 = baseCentavos === subtotalesCentavos.reduce(function(total, valor) { return total + valor; }, 0);
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

function verificarVentaConstruidaTresNiveles(registro, movimiento, resumen) {
    const ventasCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        return String(linea.codigo || "") === CUENTA_VENTAS_MATERIALES ? total + comercialACentavos(linea.haber || 0) : total;
    }, 0);
    const ivaCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        return String(linea.codigo || "") === CUENTA_IVA_DEBITO ? total + comercialACentavos(linea.haber || 0) : total;
    }, 0);
    const cobroCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        const codigo = String(linea.codigo || "");
        return codigo === CUENTA_CAJA || codigo === CUENTA_CLIENTES ? total + comercialACentavos(linea.debe || 0) : total;
    }, 0);
    const baseCentavos = comercialACentavos(registro.ventasGravadas);
    const debitoCentavos = comercialACentavos(registro.ivaDebito);
    const totalCentavos = comercialACentavos(registro.total);
    const nivel1 = Boolean(resumen.verificacion?.valido) && ventasCentavos === baseCentavos;
    const nivel2 = ivaCentavos === debitoCentavos && cobroCentavos === totalCentavos;
    let nivel3 = false;
    try {
        nivel3 = validarPartidaComercial(movimiento) === true && totalCentavos === baseCentavos + debitoCentavos;
    } catch (error) {
        nivel3 = false;
    }
    return {
        valido: nivel1 && nivel2 && nivel3,
        niveles: [
            { nivel: 1, nombre: "Ventas = base gravada", valido: nivel1 },
            { nivel: 2, nombre: "IVA y cobro = resumen", valido: nivel2 },
            { nivel: 3, nombre: "Partida doble y total", valido: nivel3 }
        ]
    };
}
// Fin fase 1
// Inicio fase 2: validación contra el estado leído (cliente, período IVA, duplicados, stock e invariantes)
function validarVentaContraEstado(entrada, estado) {
    const movimientos = estado.movimientos || [], ventas = estado.ventas || [];
    let canonica = { ...entrada };
    if (entrada.tipoCliente === "CONTRIBUYENTE") {
        const tercero = (estado.terceros || []).find(function(t) { return String(t.nrc) === String(entrada.nrc); });
        if (!tercero) throw new Error("El NRC del cliente no existe en el catálogo de terceros.");
        canonica = { ...entrada, cliente: tercero.razonSocial, nrc: tercero.nrc, giro: tercero.giro || "" };
    }
    validarPeriodosEditablesIVA(canonica.fecha, canonica.fecha, movimientos);
    const id = crearIdOperacion("VENTA", canonica.fecha, canonica.documento, String(canonica.nrc || "CF"));
    validarIdentidadFiscalDuplicada(entrada, ventas, estado.idExcluir);
    const duplicada = ventas.some(function(v) { return String(v.id) !== String(estado.idExcluir || "") && String(v.id) === String(id); });
    if (duplicada) throw new Error("La venta ya fue registrada para ese cliente y documento.");
    const resumen = calcularResumenVenta(canonica.lineas, { estricto: true });
    const anterior = estado.idExcluir ? ventas.find(function(v) { return String(v.id) === String(estado.idExcluir); }) : null;
    const inventarioValidacion = anterior ? Array.from(construirMapaInventarioDesdeMovimientos(movimientos.filter(function(m) { return Number(m.id) !== Number(anterior.movimientoId); })).estados.values()) : estado.inventario;
    validarExistenciaVenta(resumen.lineas, inventarioValidacion);
    return { canonica: canonica, id: id };
}
// Fin fase 2
