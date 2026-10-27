function parsearCSV(texto, separadorForzado) {
    const entrada = String(texto || "").replace(/^\uFEFF/, "");
    const candidatos = separadorForzado ? [separadorForzado] : [";", ","];
    let mejor = [];

    candidatos.forEach(function(separador) {
        const filas = parsearCSVConSeparador(entrada, separador);
        if (filas.length && (!mejor.length || filas[0].length > mejor[0].length)) mejor = filas;
    });

    return mejor;
}
function parsearCSVConSeparador(entrada, separador) {
    const filas = [];
    let fila = [], campo = "", comillas = false;
    for (let i = 0; i < entrada.length; i++) {
        const c = entrada[i];
        if (c === '"') {
            if (comillas && entrada[i + 1] === '"') { campo += '"'; i++; }
            else comillas = !comillas;
        } else if (c === separador && !comillas) {
            fila.push(campo.trim()); campo = "";
        } else if ((c === "\n" || c === "\r") && !comillas) {
            if (c === "\r" && entrada[i + 1] === "\n") i++;
            fila.push(campo.trim()); campo = "";
            if (fila.some(function(v) { return v !== ""; })) filas.push(fila);
            fila = [];
        } else campo += c;
    }
    if (campo || fila.length) {
        fila.push(campo.trim());
        if (fila.some(function(v) { return v !== ""; })) filas.push(fila);
    }
    return filas;
}
function convertirCSVAObjetos(texto) {
    const filas = parsearCSV(texto);
    if (filas.length < 2) return [];
    const encabezados = filas[0].map(function(h) { return String(h).trim().toLowerCase(); });
    return filas.slice(1).map(function(fila, indice) {
        const objeto = { __fila: indice + 2 };
        encabezados.forEach(function(encabezado, col) { objeto[encabezado] = fila[col] ?? ""; });
        return objeto;
    });
}
function agruparPorDocumento(registros, claveExtra) {
    const mapa = new Map();
    (registros || []).forEach(function(registro) {
        const clave = [registro.fecha, registro.documento, claveExtra ? registro[claveExtra] : ""].join("|");
        if (!mapa.has(clave)) mapa.set(clave, []);
        mapa.get(clave).push(registro);
    });
    return Array.from(mapa.values());
}
