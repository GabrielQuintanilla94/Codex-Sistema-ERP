// Inicio fase 0: contrato de la partida del Libro Diario (funciones puras, sin DOM ni IndexedDB)
const ORIGENES_EDITABLES = Object.freeze(["Manual", "CSV"]);
const ORIGENES_AUTOMATICOS = Object.freeze(["Compra", "Venta", "Depreciación", "Cierre IVA"]);
// Fin fase 0
// Inicio fase 1: tipos primitivos del contrato
function valorACentavos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 0;
    return Math.round(numero * 100);
}
function fechaEsValida(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const partes = fecha.split("-").map(Number);
    const fechaUTC = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));
    return fechaUTC.getUTCFullYear() === partes[0] && fechaUTC.getUTCMonth() === partes[1] - 1 && fechaUTC.getUTCDate() === partes[2];
}
function calcularTotal(partida, columna) {
    return partida.reduce(function(total, linea) { return total + valorACentavos(linea[columna]); }, 0) / 100;
}
function siguienteIdDe(lista) {
    return (lista || []).reduce(function(idMayor, movimiento) { return Math.max(idMayor, Number(movimiento.id) || 0); }, 0) + 1;
}
function esOrigenEditable(origen) { return ORIGENES_EDITABLES.includes(origen); }
function esOrigenAutomatico(origen) { return ORIGENES_AUTOMATICOS.includes(origen); }
function lineaTieneContenido(linea) {
    return Boolean(linea.codigo || linea.descripcion || linea.tipoInventario || linea.sku || linea.cantidadInventario || linea.fechaDisponibleUso || linea.valorResidualCentavos || linea.debeCentavos || linea.haberCentavos);
}
// Fin fase 1
// Inicio fase 2: normalización de entrada (Zero-Trust: todo llega como texto)
function normalizarEntradaPartida(crudo) {
    const texto = v => String(v ?? "").trim();
    return {
        fecha: texto(crudo.fecha), numero: texto(crudo.numero), referencia: texto(crudo.referencia), concepto: texto(crudo.concepto),
        lineas: (crudo.lineas || []).map(function(l) {
            return { codigo: texto(l.codigo), descripcion: texto(l.descripcion), tipoInventario: texto(l.tipoInventario), sku: texto(l.sku), cantidadInventario: Number(l.cantidadInventario || 0),
                fechaDisponibleUso: texto(l.fechaDisponibleUso), valorResidualCentavos: valorACentavos(l.valorResidual), codigoActivo: texto(l.codigoActivo), debeCentavos: valorACentavos(l.debe), haberCentavos: valorACentavos(l.haber) };
        })
    };
}
function normalizarMovimientoExistente(movimiento) {
    return {
        ...movimiento,
        numero: movimiento.numero || movimiento.referencia || "JE-" + String(movimiento.id).padStart(4, "0"),
        referencia: movimiento.referencia || "",
        concepto: movimiento.concepto || "Partida contable",
        origen: movimiento.origen || "Demostración",
        partida: (movimiento.partida || []).map(function(linea) { return { ...linea, descripcion: linea.descripcion || "" }; })
    };
}
// Fin fase 2
// Inicio fase 3: construcción determinista de la partida (misma entrada = mismo objeto)
function construirPartidaContable(datos, cuentasPorCodigo, original, idNuevo, ahoraISO, esActivoFijo) {
    const partida = datos.lineas.filter(lineaTieneContenido).map(function(linea) {
        const cuenta = cuentasPorCodigo.get(linea.codigo);
        return {
            codigo: cuenta.codigo, cuenta: cuenta.nombre, descripcion: linea.descripcion,
            tipoInventario: linea.tipoInventario || "", sku: linea.sku || "", cantidadInventario: Number(linea.cantidadInventario || 0), descripcionMaterial: linea.descripcion || linea.sku || "",
            activoFijo: esActivoFijo(cuenta.codigo) ? { codigoActivo: linea.codigoActivo || "", nombre: linea.descripcion, fechaDisponibleUso: linea.fechaDisponibleUso, valorResidualCentavos: linea.valorResidualCentavos } : null,
            debe: linea.debeCentavos / 100, haber: linea.haberCentavos / 100
        };
    });
    return {
        id: original ? original.id : idNuevo, numero: datos.numero, fecha: datos.fecha, referencia: datos.referencia, concepto: datos.concepto,
        origen: original ? original.origen : "Manual", creadoEn: original ? original.creadoEn : ahoraISO, actualizadoEn: original ? ahoraISO : undefined, partida: partida
    };
}
// Fin fase 3
