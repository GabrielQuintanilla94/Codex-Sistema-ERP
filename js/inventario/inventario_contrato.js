// Inicio fase 0: contrato del inventario (método, cuentas, conversiones y forma del estado por SKU). Puro.
const METODO_VALUACION_INVENTARIO = "PROMEDIO_PONDERADO_PERPETUO";
const CUENTA_INVENTARIO_MATERIALES = "1104";
const CUENTA_COSTO_MATERIALES = "5001";
// Fin fase 0
// Inicio fase 1: conversión y normalización
function inventarioACentavos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) throw new Error("El importe de inventario no es válido.");
    return Math.round(numero * 100);
}

function inventarioADolares(centavos) {
    return Number(centavos || 0) / 100;
}
function normalizarSKU(sku) {
    const valor = String(sku || "").trim();
    if (!valor) throw new Error("El SKU es obligatorio.");
    return valor;
}

function normalizarTipoInventario(tipo) {
    const valor = String(tipo || "").trim().toLowerCase();
    if (!valor) return "";
    if (valor === "entrada") return "Entrada";
    if (valor === "salida") return "Salida";
    throw new Error("El tipo de inventario debe ser Entrada o Salida.");
}
// Fin fase 1
// Inicio fase 2: forma del estado por SKU
function crearEstadoInventarioVacio(sku, descripcion, marcaTiempo) {
    return {
        sku: normalizarSKU(sku),
        descripcion: String(descripcion || "").trim(),
        cantidad: 0,
        valorInventarioCentavos: 0,
        costoPromedioCentavos: 0,
        metodoValuacion: METODO_VALUACION_INVENTARIO,
        actualizadoEn: String(marcaTiempo || "")
    };
}

function clonarEstadoInventario(estado) {
    return estado ? { ...estado } : null;
}
// Fin fase 2
