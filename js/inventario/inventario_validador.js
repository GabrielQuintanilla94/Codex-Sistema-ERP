// Inicio fase 0: validador del inventario (cantidades y triple verificación del estado; lanza Error con los mensajes de siempre)
// Depende de: inventario_contrato.js.
// Fin fase 0
// Inicio fase 1: reglas y verificación
function validarCantidadInventario(cantidad) {
    const numero = Number(cantidad);
    if (!Number.isFinite(numero) || numero <= 0) throw new Error("La cantidad debe ser mayor que cero.");
    return numero;
}
function verificarEstadoInventarioTresNiveles(estado, contexto) {
    const cantidad = Number(estado?.cantidad || 0);
    const valor = Number(estado?.valorInventarioCentavos || 0);
    const promedio = Number(estado?.costoPromedioCentavos || 0);
    const nivel1 = Number.isFinite(cantidad) && cantidad >= 0 && Number.isInteger(valor) && valor >= 0 && Number.isInteger(promedio) && promedio >= 0;
    const nivel2 = cantidad === 0 ? valor === 0 && promedio === 0 : valor > 0;
    const tolerancia = Math.max(1, Math.ceil(Math.abs(cantidad)));
    const nivel3 = cantidad === 0 || Math.abs(Math.round(cantidad * promedio) - valor) <= tolerancia;
    const verificacion = {
        valido: nivel1 && nivel2 && nivel3,
        contexto: String(contexto || "Inventario"),
        niveles: [
            { nivel: 1, nombre: "Límites y enteros monetarios", valido: nivel1 },
            { nivel: 2, nombre: "Existencia coherente con valor", valido: nivel2 },
            { nivel: 3, nombre: "Promedio aproxima valor total", valido: nivel3 }
        ]
    };
    if (!verificacion.valido) throw new Error("El estado de inventario no superó la triple verificación: " + verificacion.contexto + ".");
    return verificacion;
}
// Fin fase 1
