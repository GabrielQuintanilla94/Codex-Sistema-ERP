// Inicio fase 0: validador de partidas manuales (puro; dependencias inyectadas por contexto)
// Requiere libro_diario_contrato.js: fechaEsValida, lineaTieneContenido.
// Fin fase 0
// Inicio fase 1: composición Fail-Fast (la primera regla que falla detiene la evaluación)
function primerErrorPartida(...validaciones) {
    for (const validar of validaciones) { const error = validar(); if (error) return error; }
    return "";
}
// Fin fase 1
// Inicio fase 2: reglas de encabezado y unicidad
function validarEncabezadoPartida(datos) {
    if (!fechaEsValida(datos.fecha)) return "Seleccione una fecha válida.";
    if (datos.numero.length < 3) return "Ingrese un número de partida.";
    if (datos.concepto.length < 3) return "El concepto debe contener al menos 3 caracteres.";
    return "";
}
function validarUnicidadPartida(datos, movimientos, editandoId) {
    const otros = movimientos.filter(m => Number(m.id) !== Number(editandoId));
    if (otros.some(m => String(m.numero).toLowerCase() === datos.numero.toLowerCase())) return "El número de partida ya existe.";
    if (datos.referencia && otros.some(m => m.referencia && String(m.referencia).toLowerCase() === datos.referencia.toLowerCase())) return "La referencia ya fue utilizada.";
    return "";
}
// Fin fase 2
// Inicio fase 3: reglas por línea (inventario, activo fijo, importes)
function validarLineaInventario(linea, n, ctx) {
    if (!(linea.tipoInventario || linea.sku || linea.cantidadInventario)) return "";
    if (linea.codigo !== ctx.cuentaInventario) return "Los datos de inventario solo corresponden a la cuenta 1104, línea " + n + ".";
    if (!["Entrada", "Salida"].includes(linea.tipoInventario)) return "Seleccione Entrada o Salida en la línea " + n + ".";
    if (!linea.sku) return "Ingrese el SKU en la línea " + n + ".";
    if (!(linea.cantidadInventario > 0)) return "Ingrese una cantidad de inventario mayor que cero en la línea " + n + ".";
    return "";
}
function validarLineaActivoFijo(linea, n, fechaPartida, ctx) {
    if (!ctx.esCuentaActivoFijo(linea.codigo)) return linea.fechaDisponibleUso || linea.valorResidualCentavos > 0 ? "Los datos de depreciación solo corresponden a cuentas de Activo Fijo en la línea " + n + "." : "";
    if (!linea.descripcion) return "Ingrese el nombre/descripción del activo fijo en la línea " + n + ".";
    if (linea.debeCentavos <= 0 || linea.haberCentavos > 0) return "La adquisición de activo fijo debe registrarse al Debe en la línea " + n + ".";
    if (!fechaEsValida(linea.fechaDisponibleUso)) return "Ingrese la fecha disponible para uso en la línea " + n + ".";
    if (linea.fechaDisponibleUso < fechaPartida) return "La fecha disponible para uso no puede ser anterior a la fecha de adquisición en la línea " + n + ".";
    if (linea.valorResidualCentavos < 0 || linea.valorResidualCentavos >= linea.debeCentavos) return "El valor residual debe ser menor que el costo del activo en la línea " + n + ".";
    return "";
}
function validarImportesLinea(linea, n, ctx) {
    const esInventario = linea.codigo === ctx.cuentaInventario;
    if (linea.debeCentavos > 0 && linea.haberCentavos > 0) return "La línea " + n + " no puede contener Debe y Haber simultáneamente.";
    const salidaPendiente = esInventario && linea.tipoInventario === "Salida" && linea.sku && linea.cantidadInventario > 0;
    if (linea.debeCentavos <= 0 && linea.haberCentavos <= 0 && !salidaPendiente) return "Ingrese un valor al Debe o Haber en la línea " + n + ".";
    if (esInventario && linea.tipoInventario === "Entrada" && linea.debeCentavos <= 0) return "La entrada de inventario de la línea " + n + " debe llevar su costo total al Debe.";
    return "";
}
function validarLineaPartida(linea, n, fechaPartida, ctx) {
    if (!ctx.cuentasPorCodigo.has(linea.codigo)) return "Seleccione una cuenta auxiliar válida en la línea " + n + ".";
    return primerErrorPartida(() => validarLineaInventario(linea, n, ctx), () => validarLineaActivoFijo(linea, n, fechaPartida, ctx), () => validarImportesLinea(linea, n, ctx));
}
// Fin fase 3
// Inicio fase 4: balance y punto de entrada del validador
function validarBalancePartida(lineas, formatoMoneda) {
    const debe = lineas.reduce((t, l) => t + l.debeCentavos, 0), haber = lineas.reduce((t, l) => t + l.haberCentavos, 0);
    return debe !== haber ? "La partida no está balanceada. La diferencia es " + formatoMoneda(Math.abs(debe - haber)) + "." : "";
}
function validarPartidaManual(datos, contexto = {}) {
    const ctx = {
        movimientos: contexto.movimientos || [], editandoId: contexto.editandoId ?? null, cuentasPorCodigo: contexto.cuentasPorCodigo || new Map(),
        cuentaInventario: contexto.cuentaInventario, esCuentaActivoFijo: contexto.esCuentaActivoFijo || (() => false),
        formatoMoneda: contexto.formatoMoneda || (c => "$" + (Number(c || 0) / 100).toFixed(2))
    };
    const lineas = datos.lineas.filter(lineaTieneContenido);
    return primerErrorPartida(
        () => validarEncabezadoPartida(datos),
        () => validarUnicidadPartida(datos, ctx.movimientos, ctx.editandoId),
        () => lineas.length < 2 ? "La partida debe contener al menos dos líneas." : "",
        () => { for (let i = 0; i < lineas.length; i++) { const error = validarLineaPartida(lineas[i], i + 1, datos.fecha, ctx); if (error) return error; } return ""; },
        () => validarBalancePartida(lineas, ctx.formatoMoneda)
    );
}
// Fin fase 4
