// Inicio fase 0: contrato de la compra (cuentas, normalización, resumen y construcción determinista). Sin DOM ni IndexedDB.
// Depende de: comercial/operaciones.js, impuestos/iva.js, inventario/inventario_costos.js y compras_validador.js (en ejecución).
const CUENTA_INVENTARIO_COMPRA = "1104";
const CUENTA_PROVEEDORES = "2101";
// Fin fase 0
// Inicio fase 1: normalización Zero-Trust de la entrada
function normalizarEntradaCompra(datos) {
    if (!datos || typeof datos !== "object") throw new Error("La entrada de compra no es válida.");
    return {
        ...normalizarIdentificadoresFiscales(datos, "03"),
        fecha: normalizarFechaComercial(datos.fecha),
        documento: normalizarDocumento(datos.documento),
        nrc: String(datos.nrc || "").trim(),
        proveedor: String(datos.proveedor || "").trim(),
        giro: String(datos.giro || "").trim(),
        lineas: Array.isArray(datos.lineas) ? datos.lineas.map(function(linea) { return { ...linea }; }) : [],
        creadoEn: datos.creadoEn ? String(datos.creadoEn) : ""
    };
}
function normalizarLineaCompraParaVista(linea) {
    const monto = Number(linea?.montoGravado || 0);
    return {
        sku: String(linea?.sku || "").trim(),
        descripcion: String(linea?.descripcion || "").trim(),
        cantidad: Number(linea?.cantidad || 0),
        montoGravado: Number.isFinite(monto) && monto > 0 ? comercialADolares(comercialACentavos(monto)) : 0
    };
}
// Fin fase 1
// Inicio fase 2: resumen matemático y construcción de registro + partida
function calcularResumenCompra(lineasEntrada, opciones) {
    const estricto = opciones?.estricto !== false;
    const lineas = (lineasEntrada || []).map(function(linea) {
        return estricto ? validarLineaCompra(linea) : normalizarLineaCompraParaVista(linea);
    });
    if (estricto && !lineas.length) throw new Error("La compra debe contener al menos un material.");
    const baseCentavos = lineas.reduce(function(total, linea) {
        return total + comercialACentavos(linea.montoGravado || 0);
    }, 0);
    const calculoIVA = calcularIVA(comercialADolares(baseCentavos));
    const verificacion = verificarResumenCompraTresNiveles(lineas, baseCentavos, calculoIVA);
    if (!verificacion.valido) throw new Error("El resumen de compra no superó la triple verificación matemática.");
    return {
        lineas: lineas,
        baseCentavos: baseCentavos,
        base: comercialADolares(baseCentavos),
        iva: calculoIVA.iva,
        total: calculoIVA.total,
        verificacion: verificacion
    };
}

function construirCompra(datos, movimientosPrevios, marcaTiempo) {
    const fecha = normalizarFechaComercial(datos.fecha);
    const documento = normalizarDocumento(datos.documento);
    const proveedor = String(datos.proveedor || "").trim();
    const nrc = String(datos.nrc || "").trim();
    if (!proveedor || !nrc) throw new Error("Seleccione un proveedor con NRC.");

    const resumen = calcularResumenCompra(datos.lineas || [], { estricto: true });
    const partida = resumen.lineas.map(function(linea) {
        return {
            codigo: CUENTA_INVENTARIO_COMPRA,
            cuenta: "Inventario de materiales",
            descripcion: linea.descripcion,
            tipoInventario: "Entrada",
            sku: linea.sku,
            cantidadInventario: linea.cantidad,
            descripcionMaterial: linea.descripcion,
            debe: linea.montoGravado,
            haber: 0
        };
    });
    partida.push({ codigo: CUENTA_IVA_CREDITO, cuenta: "IVA Crédito Fiscal", descripcion: "IVA crédito fiscal - " + documento, debe: resumen.iva, haber: 0 });
    partida.push({ codigo: CUENTA_PROVEEDORES, cuenta: "Cuentas por pagar", descripcion: proveedor, debe: 0, haber: resumen.total });

    const selloTiempo = String(marcaTiempo || datos.creadoEn || new Date().toISOString());
    const movimientoBase = {
        id: siguienteIdMovimientoComercial(movimientosPrevios),
        numero: "COMP-" + documento,
        fecha: fecha,
        referencia: documento,
        concepto: "Compra de materiales - " + proveedor,
        origen: "Compra",
        creadoEn: selloTiempo,
        partida: partida
    };
    const movimiento = prepararMovimientoConInventario(movimientoBase, movimientosPrevios || []);
    const registro = {
        id: crearIdOperacion("COMPRA", fecha, documento, nrc),
        movimientoId: movimiento.id,
        ...normalizarIdentificadoresFiscales(datos, "03"),
        fecha: fecha,
        documento: documento,
        proveedor: proveedor,
        nrc: nrc,
        giro: String(datos.giro || "").trim(),
        lineas: resumen.lineas,
        comprasGravadas: resumen.base,
        ivaCredito: resumen.iva,
        total: resumen.total,
        tipoOperacion: 1,
        clasificacion: 1,
        sector: 2,
        tipoCostoGasto: 5,
        creadoEn: selloTiempo
    };
    const verificacion = verificarCompraConstruidaTresNiveles(registro, movimiento, resumen);
    if (!verificacion.valido) throw new Error("La compra no superó la triple verificación antes de contabilizarse.");
    return { registro: registro, movimiento: movimiento, verificacion: verificacion };
}
// Fin fase 2
