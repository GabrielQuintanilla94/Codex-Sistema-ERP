// Inicio fase 0: contrato de la venta (cuentas, tipo de cliente, normalización, resumen y construcción determinista). Sin DOM ni IndexedDB.
// Depende de: comercial/operaciones.js, impuestos/iva.js, inventario/inventario_costos.js y ventas_validador.js (en ejecución).
const CUENTA_VENTAS_MATERIALES = "4101";
const CUENTA_CAJA = "1101";
const CUENTA_CLIENTES = "1103";
// Fin fase 0
// Inicio fase 1: normalización Zero-Trust de la entrada
function normalizarTipoCliente(tipo) {
    const valor = String(tipo || "").trim().toUpperCase();
    if (valor === "CONTRIBUYENTE" || valor === "CONSUMIDOR_FINAL") return valor;
    throw new Error("El tipo de cliente debe ser CONTRIBUYENTE o CONSUMIDOR_FINAL.");
}
function tipoDTEVenta(tipoCliente) { return normalizarTipoCliente(tipoCliente) === "CONTRIBUYENTE" ? "03" : "01"; }
function normalizarEntradaVenta(datos) {
    if (!datos || typeof datos !== "object") throw new Error("La entrada de venta no es válida.");
    return {
        ...normalizarIdentificadoresFiscales(datos, tipoDTEVenta(datos.tipoCliente)),
        fecha: normalizarFechaComercial(datos.fecha),
        documento: normalizarDocumento(datos.documento),
        tipoCliente: normalizarTipoCliente(datos.tipoCliente),
        cliente: String(datos.cliente || "").trim(),
        nrc: String(datos.nrc || "").trim(),
        giro: String(datos.giro || "").trim(),
        lineas: Array.isArray(datos.lineas) ? datos.lineas.map(function(linea) { return { ...linea }; }) : [],
        creadoEn: datos.creadoEn ? String(datos.creadoEn) : ""
    };
}
function normalizarLineaVentaParaVista(linea) {
    const cantidad = Number(linea?.cantidad || 0);
    const precio = Number(linea?.precioUnitario || 0);
    return {
        sku: String(linea?.sku || "").trim(),
        cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 0,
        precioUnitario: Number.isFinite(precio) && precio > 0 ? comercialADolares(comercialACentavos(precio)) : 0
    };
}
// Fin fase 1
// Inicio fase 2: resumen matemático y construcción de registro + partida
function calcularResumenVenta(lineasEntrada, opciones) {
    const estricto = opciones?.estricto !== false;
    const lineas = (lineasEntrada || []).map(function(linea) {
        return estricto ? validarLineaVenta(linea) : normalizarLineaVentaParaVista(linea);
    });
    if (estricto && !lineas.length) throw new Error("La venta debe contener al menos un producto.");
    const subtotalesCentavos = lineas.map(function(linea) {
        return Math.round(Number(linea.cantidad || 0) * comercialACentavos(linea.precioUnitario || 0));
    });
    const baseCentavos = subtotalesCentavos.reduce(function(total, valor) { return total + valor; }, 0);
    const calculoIVA = calcularIVA(comercialADolares(baseCentavos));
    const verificacion = verificarResumenVentaTresNiveles(subtotalesCentavos, baseCentavos, calculoIVA);
    if (!verificacion.valido) throw new Error("El resumen de venta no superó la triple verificación matemática.");
    return {
        lineas: lineas,
        subtotalesCentavos: subtotalesCentavos,
        baseCentavos: baseCentavos,
        base: comercialADolares(baseCentavos),
        iva: calculoIVA.iva,
        total: calculoIVA.total,
        verificacion: verificacion
    };
}

function construirVenta(datos, movimientosPrevios, inventarioActual, marcaTiempo) {
    const fecha = normalizarFechaComercial(datos.fecha);
    const documento = normalizarDocumento(datos.documento);
    const tipoCliente = normalizarTipoCliente(datos.tipoCliente);
    const cliente = tipoCliente === "CONSUMIDOR_FINAL" ? "Consumidor final" : String(datos.cliente || "").trim();
    const nrc = tipoCliente === "CONSUMIDOR_FINAL" ? "" : String(datos.nrc || "").trim();
    if (tipoCliente === "CONTRIBUYENTE" && (!cliente || !nrc)) throw new Error("La venta a contribuyente requiere cliente y NRC.");

    const resumen = calcularResumenVenta(datos.lineas || [], { estricto: true });
    const inventarioPorSKU = validarExistenciaVenta(resumen.lineas, inventarioActual);
    const cuentaCobro = tipoCliente === "CONTRIBUYENTE" ? CUENTA_CLIENTES : CUENTA_CAJA;
    const nombreCuentaCobro = tipoCliente === "CONTRIBUYENTE" ? "Cuentas por cobrar" : "Caja";
    const partida = [
        { codigo: cuentaCobro, cuenta: nombreCuentaCobro, descripcion: cliente, debe: resumen.total, haber: 0 },
        { codigo: CUENTA_VENTAS_MATERIALES, cuenta: "Ventas de materiales", descripcion: "Venta " + documento, debe: 0, haber: resumen.base },
        { codigo: CUENTA_IVA_DEBITO, cuenta: "IVA Débito Fiscal", descripcion: "IVA débito fiscal - " + documento, debe: 0, haber: resumen.iva }
    ];
    resumen.lineas.forEach(function(linea) {
        const producto = inventarioPorSKU.get(linea.sku);
        partida.push({
            codigo: CUENTA_INVENTARIO_MATERIALES,
            cuenta: "Inventario de materiales",
            descripcion: producto.descripcion || linea.sku,
            tipoInventario: "Salida",
            sku: linea.sku,
            cantidadInventario: linea.cantidad,
            descripcionMaterial: producto.descripcion || linea.sku,
            debe: 0,
            haber: 0
        });
    });
    const selloTiempo = String(marcaTiempo || datos.creadoEn || new Date().toISOString());
    const movimientoBase = {
        id: siguienteIdMovimientoComercial(movimientosPrevios),
        numero: "VENTA-" + documento,
        fecha: fecha,
        referencia: documento,
        concepto: "Venta de materiales - " + cliente,
        origen: "Venta",
        creadoEn: selloTiempo,
        partida: partida
    };
    const movimiento = prepararMovimientoConInventario(movimientoBase, movimientosPrevios || []);
    const registro = {
        id: crearIdOperacion("VENTA", fecha, documento, nrc || "CF"),
        movimientoId: movimiento.id,
        ...normalizarIdentificadoresFiscales(datos, tipoDTEVenta(datos.tipoCliente)),
        fecha: fecha,
        documento: documento,
        tipoCliente: tipoCliente,
        cliente: cliente,
        nrc: nrc,
        giro: String(datos.giro || "").trim(),
        lineas: resumen.lineas,
        ventasGravadas: resumen.base,
        ivaDebito: resumen.iva,
        total: resumen.total,
        tipoOperacion: 1,
        tipoIngreso: 3,
        creadoEn: selloTiempo
    };
    const verificacion = verificarVentaConstruidaTresNiveles(registro, movimiento, resumen);
    if (!verificacion.valido) throw new Error("La venta no superó la triple verificación antes de contabilizarse.");
    return { registro: registro, movimiento: movimiento, verificacion: verificacion };
}
// Fin fase 2
