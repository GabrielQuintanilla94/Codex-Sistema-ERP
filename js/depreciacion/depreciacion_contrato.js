// Inicio fase 0: contrato de depreciación (configuración PPE, fechas, metadatos del activo e identificación de partidas automáticas). Puro.
const CONFIGURACION_DEPRECIACION = Object.freeze({
    "1201": Object.freeze({ categoria: "Edificios", vidaUtilAnios: 20, tasaFiscalAnual: 0.05, cuentaDepreciacionAcumulada: "1301", cuentaGastoDepreciacion: "6201" }),
    "1202": Object.freeze({ categoria: "Maquinaria", vidaUtilAnios: 5, tasaFiscalAnual: 0.20, cuentaDepreciacionAcumulada: "1302", cuentaGastoDepreciacion: "6202" }),
    "1203": Object.freeze({ categoria: "Automóviles", vidaUtilAnios: 4, tasaFiscalAnual: 0.25, cuentaDepreciacionAcumulada: "1303", cuentaGastoDepreciacion: "6203" }),
    "1204": Object.freeze({ categoria: "Otros bienes muebles", vidaUtilAnios: 2, tasaFiscalAnual: 0.50, cuentaDepreciacionAcumulada: "1304", cuentaGastoDepreciacion: "6204" })
});
// Fin fase 0
// Inicio fase 1: configuración, conversión y fechas deterministas
function obtenerConfiguracionDepreciacion(codigoCuenta) {
    return CONFIGURACION_DEPRECIACION[String(codigoCuenta || "")] || null;
}
function esCuentaActivoFijo(codigoCuenta) {
    return Boolean(obtenerConfiguracionDepreciacion(codigoCuenta));
}
function depreciacionACentavos(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
}
function depreciacionADolares(centavos) {
    return Number(centavos || 0) / 100;
}
function fechaDepreciacionValida(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ""))) return false;
    const [anio, mes, dia] = String(fecha).split("-").map(Number);
    const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));
    return fechaUTC.getUTCFullYear() === anio && fechaUTC.getUTCMonth() === mes - 1 && fechaUTC.getUTCDate() === dia;
}
function fechaUTCDesdeISO(fecha) {
    const [anio, mes, dia] = String(fecha).split("-").map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
}
function ultimoDiaMesUTC(anio, mesCero) {
    return new Date(Date.UTC(anio, mesCero + 1, 0));
}
function periodoISO(anio, mesCero) {
    return String(anio).padStart(4, "0") + "-" + String(mesCero + 1).padStart(2, "0");
}
function fechaSistemaLocalISO() {
    const ahora = new Date();
    return String(ahora.getFullYear()).padStart(4, "0") + "-" + String(ahora.getMonth() + 1).padStart(2, "0") + "-" + String(ahora.getDate()).padStart(2, "0");
}
function resolverFechaCorteEfectiva(fechaCorte, fechaSistema) {
    if (!fechaDepreciacionValida(fechaCorte)) throw new Error("La fecha de corte no es válida.");
    if (!fechaDepreciacionValida(fechaSistema)) throw new Error("La fecha del sistema no es válida.");
    return fechaCorte <= fechaSistema ? fechaCorte : fechaSistema;
}
function fechaCorteEfectivaDepreciacion(fechaCorte, fechaSistema) {
    return resolverFechaCorteEfectiva(fechaCorte, fechaSistema || fechaSistemaLocalISO());
}
function ultimoDiaPeriodoISO(periodo) {
    if (!/^\d{4}-\d{2}$/.test(String(periodo || ""))) throw new Error("El período de depreciación no es válido.");
    const [anio, mes] = String(periodo).split("-").map(Number);
    return ultimoDiaMesUTC(anio, mes - 1).toISOString().slice(0, 10);
}
function periodoCerradoAFecha(periodo, fechaCorteEfectiva) {
    if (!fechaDepreciacionValida(fechaCorteEfectiva)) throw new Error("La fecha efectiva de corte no es válida.");
    return ultimoDiaPeriodoISO(periodo) <= fechaCorteEfectiva;
}
// Fin fase 1
// Inicio fase 2: metadatos del activo y auxiliar PPE reconstruido desde movimientos
function construirMetadataActivoFijo(movimiento, linea, indice, validado) {
    const c = validado.configuracion;
    return {
        codigoActivo: String(validado.datos.codigoActivo || ("AF-" + String(movimiento.numero || movimiento.id || "SIN-ID") + "-" + (indice + 1))).trim(),
        nombre: validado.nombre,
        categoria: c.categoria,
        fechaAdquisicion: movimiento.fecha,
        fechaDisponibleUso: validado.fechaDisponibleUso,
        costoCentavos: validado.costoCentavos,
        valorResidualCentavos: validado.residualCentavos,
        vidaUtilAnios: c.vidaUtilAnios,
        tasaFiscalAnual: c.tasaFiscalAnual,
        metodo: "LINEA_RECTA",
        cuentaActivo: String(linea.codigo),
        cuentaDepreciacionAcumulada: c.cuentaDepreciacionAcumulada,
        cuentaGastoDepreciacion: c.cuentaGastoDepreciacion
    };
}
function activoDesdeLineaMovimiento(movimiento, linea, indice) {
    if (!esCuentaActivoFijo(linea.codigo) || !(Number(linea.debe || 0) > 0) || !linea.activoFijo) return null;
    const datos = linea.activoFijo;
    if (!fechaDepreciacionValida(datos.fechaDisponibleUso)) return null;
    const configuracion = obtenerConfiguracionDepreciacion(linea.codigo);
    return {
        codigoActivo: String(datos.codigoActivo || ("AF-" + movimiento.id + "-" + (indice + 1))),
        nombre: String(datos.nombre || linea.descripcion || linea.cuenta || "Activo fijo"),
        categoria: String(datos.categoria || configuracion.categoria),
        cuentaActivo: String(linea.codigo),
        fechaAdquisicion: String(datos.fechaAdquisicion || movimiento.fecha),
        fechaDisponibleUso: String(datos.fechaDisponibleUso),
        costoCentavos: Number(datos.costoCentavos || depreciacionACentavos(linea.debe)),
        valorResidualCentavos: Number(datos.valorResidualCentavos || 0),
        vidaUtilAnios: Number(datos.vidaUtilAnios || configuracion.vidaUtilAnios),
        tasaFiscalAnual: Number(datos.tasaFiscalAnual || configuracion.tasaFiscalAnual),
        cuentaDepreciacionAcumulada: String(datos.cuentaDepreciacionAcumulada || configuracion.cuentaDepreciacionAcumulada),
        cuentaGastoDepreciacion: String(datos.cuentaGastoDepreciacion || configuracion.cuentaGastoDepreciacion),
        movimientoId: movimiento.id,
        numeroPartida: movimiento.numero || ""
    };
}
function extraerActivosFijosDesdeMovimientos(movimientos) {
    const activos = [];
    (Array.isArray(movimientos) ? movimientos : []).forEach(function(movimiento) {
        (movimiento.partida || []).forEach(function(linea, indice) {
            const activo = activoDesdeLineaMovimiento(movimiento, linea, indice);
            if (activo) activos.push(activo);
        });
    });
    activos.sort(function(a, b) { return a.fechaDisponibleUso.localeCompare(b.fechaDisponibleUso) || a.codigoActivo.localeCompare(b.codigoActivo); });
    return activos;
}
// Fin fase 2
// Inicio fase 3: identificación e idempotencia de partidas automáticas
function claveDepreciacionAutomatica(codigoActivo, periodo) {
    return String(codigoActivo || "") + "|" + String(periodo || "");
}
function detallesDepreciacionMovimiento(movimiento) {
    const meta = movimiento && movimiento.depreciacionAutomatica;
    if (!meta) return [];
    if (Array.isArray(meta.detalles)) {
        return meta.detalles.map(function(detalle) {
            return { codigoActivo: String(detalle.codigoActivo || ""), periodo: String(detalle.periodo || meta.periodo || ""), montoCentavos: Number(detalle.montoCentavos || 0) };
        }).filter(function(detalle) { return detalle.codigoActivo && detalle.periodo; });
    }
    if (meta.codigoActivo && meta.periodo) return [{ codigoActivo: String(meta.codigoActivo), periodo: String(meta.periodo), montoCentavos: Number(meta.montoCentavos || 0) }];
    return [];
}
function movimientoCorrespondeDepreciacion(movimiento, codigoActivo, periodo) {
    if (detallesDepreciacionMovimiento(movimiento).some(function(detalle) { return claveDepreciacionAutomatica(detalle.codigoActivo, detalle.periodo) === claveDepreciacionAutomatica(codigoActivo, periodo); })) return true;
    return Boolean(movimiento) && movimiento.origen === "Depreciación" && String(movimiento.referencia || "") === String(codigoActivo || "") && String(movimiento.concepto || "").includes(String(periodo || ""));
}
function esMovimientoDepreciacionAutomatica(movimiento) {
    return Boolean(movimiento && (movimiento.depreciacionAutomatica || (movimiento.origen === "Depreciación" && /^DEP-/i.test(String(movimiento.numero || "")))));
}
function periodoDepreciacionMovimiento(movimiento) {
    const meta = movimiento && movimiento.depreciacionAutomatica;
    if (meta && meta.periodo) return String(meta.periodo);
    const detalles = detallesDepreciacionMovimiento(movimiento);
    if (detalles.length) return detalles[0].periodo;
    const coincidencia = String(movimiento && movimiento.concepto || "").match(/\b(\d{4}-\d{2})\b/);
    return coincidencia ? coincidencia[1] : "";
}
function numeroPartidaDepreciacion(periodo, numerosExistentes) {
    const base = "DEP-" + String(periodo).replace("-", "");
    let numero = base;
    let sufijo = 2;
    while (numerosExistentes.has(numero.toLowerCase())) numero = base + "-" + sufijo++;
    numerosExistentes.add(numero.toLowerCase());
    return numero;
}
// Fin fase 3
