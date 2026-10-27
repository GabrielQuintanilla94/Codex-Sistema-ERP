const TIPOS_EVENTOS = Object.freeze({
    CUENTA_CREADA: "CuentaCreada",
    CUENTA_ELIMINADA: "CuentaEliminada",
    PARTIDA_REGISTRADA: "PartidaRegistrada",
    PARTIDA_EDITADA: "PartidaEditada",
    PARTIDA_ELIMINADA: "PartidaEliminada",
    PARTIDAS_IMPORTADAS: "PartidasImportadas",
    COMPRA_REGISTRADA: "CompraRegistrada",
    COMPRA_EDITADA: "CompraEditada",
    COMPRA_ELIMINADA: "CompraEliminada",
    VENTA_REGISTRADA: "VentaRegistrada",
    VENTA_EDITADA: "VentaEditada",
    VENTA_ELIMINADA: "VentaEliminada",
    IVA_CERRADO: "IVACerrado",
    DEPRECIACION_SINCRONIZADA: "DepreciacionSincronizada"
});
function crearIdEvento() {
    if (typeof crypto === "undefined") {
        throw new Error("El navegador no ofrece un generador criptográfico seguro.");
    }
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto.getRandomValues !== "function") {
        throw new Error("El navegador no ofrece un generador criptográfico seguro.");
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hexadecimal = Array.from(bytes, function(byte) {
        return byte.toString(16).padStart(2, "0");
    }).join("");
    return hexadecimal.slice(0, 8) + "-" +
        hexadecimal.slice(8, 12) + "-" +
        hexadecimal.slice(12, 16) + "-" +
        hexadecimal.slice(16, 20) + "-" +
        hexadecimal.slice(20);
}
function copiarDatosEvento(datos) {
    if (datos === undefined || datos === null) return Object.freeze({});
    if (typeof datos !== "object" || Array.isArray(datos)) {
        throw new Error("Los datos del evento deben ser un objeto.");
    }
    try {
        const copia = typeof structuredClone === "function"
            ? structuredClone(datos)
            : JSON.parse(JSON.stringify(datos));
        return Object.freeze(copia);
    } catch (error) {
        throw new Error("Los datos del evento no se pueden copiar de forma segura.");
    }
}
function validarEventoContable(evento) {
    if (!evento || typeof evento !== "object") return false;
    if (!Object.values(TIPOS_EVENTOS).includes(evento.tipo)) return false;
    if (typeof evento.id !== "string" || evento.id.length < 16) return false;
    if (typeof evento.entidad !== "string" || !evento.entidad.trim()) return false;
    if (typeof evento.entidadId !== "string" || !evento.entidadId.trim()) return false;
    if (typeof evento.fecha !== "string" || Number.isNaN(Date.parse(evento.fecha))) return false;
    if (evento.version !== 1) return false;
    return Boolean(evento.datos) && typeof evento.datos === "object" && !Array.isArray(evento.datos);
}
function crearEventoContable(tipo, entidad, entidadId, datos) {
    const evento = {
        id: crearIdEvento(),
        tipo: tipo,
        entidad: String(entidad || "").trim(),
        entidadId: String(entidadId === undefined || entidadId === null ? "" : entidadId).trim(),
        fecha: new Date().toISOString(),
        version: 1,
        datos: copiarDatosEvento(datos)
    };
    if (!validarEventoContable(evento)) {
        throw new Error("El evento contable no cumple el contrato requerido.");
    }
    return Object.freeze(evento);
}
