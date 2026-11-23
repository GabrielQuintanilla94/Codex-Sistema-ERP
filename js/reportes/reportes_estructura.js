// Inicio fase 0: estructura de presentación de los reportes financieros (pura: sin DOM, IndexedDB ni eventos)
// Recibe resultados ya verificados por motor_contable.js y los ordena como estados financieros (NIIF para las PYMES, secc. 3–5).
const ORDEN_CLASIFICACION_REPORTE = Object.freeze(["Activo", "Pasivo", "Patrimonio", "Ingresos", "Gastos"]);
const COLUMNAS_BALANZA_REPORTE = Object.freeze([
    { clave: "debe", titulo: "Debe" }, { clave: "haber", titulo: "Haber" },
    { clave: "saldoDeudor", titulo: "Saldo deudor" }, { clave: "saldoAcreedor", titulo: "Saldo acreedor" }
]);
// Fin fase 0
// Inicio fase 1: fechas, períodos predefinidos y período comparativo
function centavosReporte(valor) { return Math.round(Number(valor || 0) * 100); }
function fechaUTCReporte(iso) { const [a, m, d] = String(iso).split("-").map(Number); return new Date(Date.UTC(a, m - 1, d)); }
function isoReporte(fecha) { return fecha.toISOString().slice(0, 10); }
function finDeMesReporte(anio, mesCero) { return isoReporte(new Date(Date.UTC(anio, mesCero + 1, 0))); }
function inicioDeMesReporte(anio, mesCero) { return isoReporte(new Date(Date.UTC(anio, mesCero, 1))); }
function restarAniosReporte(iso, anios) {
    const [a, m, d] = String(iso).split("-").map(Number);
    const dia = Math.min(d, new Date(Date.UTC(a - anios, m, 0)).getUTCDate());
    return isoReporte(new Date(Date.UTC(a - anios, m - 1, dia)));
}
function rangoPresetReporte(preset, hoyISO) {
    const hoy = fechaUTCReporte(hoyISO), a = hoy.getUTCFullYear(), m = hoy.getUTCMonth(), t = Math.floor(m / 3) * 3;
    const rangos = {
        "mes": { desde: inicioDeMesReporte(a, m), hasta: finDeMesReporte(a, m) },
        "mes-anterior": { desde: inicioDeMesReporte(a, m - 1), hasta: finDeMesReporte(a, m - 1) },
        "trimestre": { desde: inicioDeMesReporte(a, t), hasta: finDeMesReporte(a, t + 2) },
        "anio": { desde: a + "-01-01", hasta: hoyISO },
        "anio-anterior": { desde: (a - 1) + "-01-01", hasta: (a - 1) + "-12-31" },
        "todo": { desde: "", hasta: "" }
    };
    return rangos[preset] || null;
}
function rangoComparativoReporte(tipo, desde, hasta, modo, hoyISO) {
    if (!modo || modo === "ninguno" || tipo === "balanza") return null;
    if (tipo === "balance") {
        const base = hasta || hoyISO, b = fechaUTCReporte(base);
        return { desde: "", hasta: modo === "anio" ? restarAniosReporte(base, 1) : finDeMesReporte(b.getUTCFullYear(), b.getUTCMonth() - 1) };
    }
    if (!desde || !hasta) return null;
    if (modo === "anio") return { desde: restarAniosReporte(desde, 1), hasta: restarAniosReporte(hasta, 1) };
    const d = fechaUTCReporte(desde), h = fechaUTCReporte(hasta);
    if (d.getUTCDate() === 1 && hasta === finDeMesReporte(h.getUTCFullYear(), h.getUTCMonth())) {
        const meses = (h.getUTCFullYear() - d.getUTCFullYear()) * 12 + h.getUTCMonth() - d.getUTCMonth() + 1;
        return { desde: inicioDeMesReporte(d.getUTCFullYear(), d.getUTCMonth() - meses), hasta: finDeMesReporte(d.getUTCFullYear(), d.getUTCMonth() - 1) };
    }
    const dia = 86400000, dias = Math.round((h - d) / dia) + 1;
    return { desde: isoReporte(new Date(d - dias * dia)), hasta: isoReporte(new Date(d - dia)) };
}
function fechaLargaReporte(iso) {
    return new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(fechaUTCReporte(iso));
}
function etiquetaRangoReporte(tipo, desde, hasta) {
    if (tipo === "balance") return hasta ? "Al " + fechaLargaReporte(hasta) : "A la fecha";
    if (desde && hasta) return "Del " + fechaLargaReporte(desde) + " al " + fechaLargaReporte(hasta);
    if (desde) return "Desde el " + fechaLargaReporte(desde);
    if (hasta) return "Hasta el " + fechaLargaReporte(hasta);
    return "Todas las fechas";
}
function etiquetaColumnaReporte(tipo, desde, hasta) {
    const corta = iso => iso.split("-").reverse().join("/");
    if (tipo === "balance") return hasta ? "Al " + corta(hasta) : "A la fecha";
    if (!desde || !hasta) return "Período";
    const d = fechaUTCReporte(desde), h = fechaUTCReporte(hasta);
    if (desde.endsWith("-01-01") && hasta.endsWith("-12-31") && d.getUTCFullYear() === h.getUTCFullYear()) return String(d.getUTCFullYear());
    if (d.getUTCDate() === 1 && hasta === finDeMesReporte(d.getUTCFullYear(), d.getUTCMonth())) {
        const mes = new Intl.DateTimeFormat("es-SV", { month: "short", timeZone: "UTC" }).format(d).replace(".", "");
        return mes.charAt(0).toUpperCase() + mes.slice(1) + " " + d.getUTCFullYear();
    }
    return corta(desde) + " – " + corta(hasta);
}
// Fin fase 1
// Inicio fase 2: formato contable y variaciones
function formatoContableReporte(valor) {
    const centavos = centavosReporte(valor);
    const texto = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Math.abs(centavos) / 100);
    return centavos < 0 ? "(" + texto + ")" : texto;
}
function formatoPorcentajeReporte(valor) {
    return valor === null || valor === undefined || !Number.isFinite(valor) ? "—" : (valor > 0 ? "+" : "") + valor.toFixed(1) + " %";
}
function variacionReporte(actual, comparativo) {
    const diferencia = (centavosReporte(actual) - centavosReporte(comparativo)) / 100;
    return { diferencia: diferencia, porcentaje: centavosReporte(comparativo) !== 0 ? Math.round(diferencia / Math.abs(comparativo) * 1000) / 10 : null };
}
// Fin fase 2
// Inicio fase 3: renglones por grupo del catálogo (cuenta padre XX00) y comparación
function renglon(tipo, etiqueta, actual, comparativo, extra) { return { tipo: tipo, etiqueta: etiqueta, valores: { actual: actual, comparativo: comparativo }, ...extra }; }
function renglonesCuentasReporte(actuales, comparativas, nombresPorCodigo) {
    const porCodigo = new Map();
    (actuales || []).forEach(c => porCodigo.set(String(c.codigo), { codigo: String(c.codigo), nombre: c.nombre, actual: Number(c.saldoNatural || 0), comparativo: 0 }));
    (comparativas || []).forEach(c => { const x = porCodigo.get(String(c.codigo)) || { codigo: String(c.codigo), nombre: c.nombre, actual: 0, comparativo: 0 }; x.comparativo = Number(c.saldoNatural || 0); porCodigo.set(x.codigo, x); });
    const cuentas = Array.from(porCodigo.values()).sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
    const grupos = new Map();
    cuentas.forEach(c => { const padre = c.codigo.slice(0, 2) + "00"; if (!grupos.has(padre)) grupos.set(padre, []); grupos.get(padre).push(c); });
    const renglones = [];
    let actual = 0, comparativo = 0;
    const variosGrupos = grupos.size > 1;
    grupos.forEach(function(lista, padre) {
        const nombre = nombresPorCodigo.get(padre) || "Grupo " + padre;
        if (variosGrupos) renglones.push(renglon("grupo", nombre));
        let ga = 0, gc = 0;
        lista.forEach(c => { renglones.push(renglon("cuenta", c.nombre, c.actual, c.comparativo, { codigo: c.codigo })); ga += centavosReporte(c.actual); gc += centavosReporte(c.comparativo); });
        if (variosGrupos && lista.length > 1) renglones.push(renglon("subtotal", "Total " + nombre.toLowerCase(), ga / 100, gc / 100));
        actual += ga; comparativo += gc;
    });
    return { renglones: renglones, actual: actual / 100, comparativo: comparativo / 100 };
}
function completarComparacionReporte(estructura, comparar) {
    estructura.comparar = Boolean(comparar);
    estructura.renglones.forEach(function(r) {
        if (!r.valores || r.valores.actual === undefined) return;
        if (!comparar) { delete r.valores.comparativo; return; }
        if (r.formato === "porcentaje") { r.valores.variacion = r.valores.actual === null || r.valores.comparativo === null ? null : Math.round((r.valores.actual - r.valores.comparativo) * 10) / 10; r.valores.variacionPct = null; return; }
        const v = variacionReporte(r.valores.actual, r.valores.comparativo);
        r.valores.variacion = v.diferencia;
        r.valores.variacionPct = v.porcentaje;
    });
    return estructura;
}
// Fin fase 3
// Inicio fase 4: estados financieros
function estructurarEstadoResultadosReporte(estado, comparativo, nombresPorCodigo) {
    const c = comparativo || { ingresos: [], gastos: [], resultadoNeto: 0 };
    const esCosto = x => String(x.codigo).startsWith("5");
    const ingresos = renglonesCuentasReporte(estado.ingresos, c.ingresos, nombresPorCodigo);
    const costo = renglonesCuentasReporte(estado.gastos.filter(esCosto), c.gastos.filter(esCosto), nombresPorCodigo);
    const operacion = renglonesCuentasReporte(estado.gastos.filter(x => !esCosto(x)), c.gastos.filter(x => !esCosto(x)), nombresPorCodigo);
    const resta = (a, b) => (centavosReporte(a) - centavosReporte(b)) / 100;
    const brutaA = resta(ingresos.actual, costo.actual), brutaC = resta(ingresos.comparativo, costo.comparativo);
    const operA = resta(brutaA, operacion.actual), operC = resta(brutaC, operacion.comparativo);
    const margen = (u, i) => centavosReporte(i) !== 0 ? Math.round(u / i * 1000) / 10 : null;
    const neto = estado.resultadoNeto;
    const renglones = [
        renglon("seccion", "Ingresos de operación"), ...ingresos.renglones, renglon("total", "Total ingresos", ingresos.actual, ingresos.comparativo),
        renglon("seccion", "Costo de ventas"), ...costo.renglones, renglon("total", "Total costo de ventas", costo.actual, costo.comparativo),
        renglon("resultado", "Utilidad bruta", brutaA, brutaC), renglon("indicador", "Margen bruto", margen(brutaA, ingresos.actual), margen(brutaC, ingresos.comparativo), { formato: "porcentaje" }),
        renglon("seccion", "Gastos de operación"), ...operacion.renglones, renglon("total", "Total gastos de operación", operacion.actual, operacion.comparativo),
        renglon("resultado", operA >= 0 ? "Utilidad de operación" : "Pérdida de operación", operA, operC),
        renglon("final", neto >= 0 ? "Utilidad neta del período" : "Pérdida neta del período", neto, c.resultadoNeto)
    ];
    return completarComparacionReporte({ renglones: renglones, control: { cuadra: centavosReporte(neto) === centavosReporte(operA), etiqueta: "Resultado neto = ingresos − costo de ventas − gastos" } }, Boolean(comparativo));
}
function estructurarBalanceGeneralReporte(balance, comparativo, nombresPorCodigo) {
    const c = comparativo || { activos: [], pasivos: [], patrimonio: [], resultadoPeriodo: 0, totalActivos: 0, totalPasivos: 0, totalPatrimonioResultado: 0, totalPasivoPatrimonio: 0 };
    const activos = renglonesCuentasReporte(balance.activos, c.activos, nombresPorCodigo);
    const pasivos = renglonesCuentasReporte(balance.pasivos, c.pasivos, nombresPorCodigo);
    const patrimonio = renglonesCuentasReporte(balance.patrimonio, c.patrimonio, nombresPorCodigo);
    const renglones = [
        renglon("seccion", "Activo"), ...activos.renglones, renglon("total", "Total activo", balance.totalActivos, c.totalActivos),
        renglon("seccion", "Pasivo"), ...pasivos.renglones, renglon("total", "Total pasivo", balance.totalPasivos, c.totalPasivos),
        renglon("seccion", "Patrimonio"), ...patrimonio.renglones, renglon("cuenta", balance.resultadoPeriodo >= 0 ? "Utilidad del ejercicio" : "Pérdida del ejercicio", balance.resultadoPeriodo, c.resultadoPeriodo),
        renglon("total", "Total patrimonio", balance.totalPatrimonioResultado, c.totalPatrimonioResultado),
        renglon("final", "Total pasivo y patrimonio", balance.totalPasivoPatrimonio, c.totalPasivoPatrimonio)
    ];
    const diferencia = (centavosReporte(balance.totalActivos) - centavosReporte(balance.totalPasivoPatrimonio)) / 100;
    return completarComparacionReporte({ renglones: renglones, control: { cuadra: diferencia === 0, diferencia: diferencia, etiqueta: "Activo = Pasivo + Patrimonio" } }, Boolean(comparativo));
}
function estructurarBalanzaReporte(balanza) {
    const valores = c => ({ debe: Number(c.debe || 0), haber: Number(c.haber || 0), saldoDeudor: Number(c.saldoDeudor || 0), saldoAcreedor: Number(c.saldoAcreedor || 0) });
    const renglones = [];
    ORDEN_CLASIFICACION_REPORTE.concat(["Sin clasificación"]).forEach(function(clase) {
        const cuentas = balanza.cuentas.filter(c => (ORDEN_CLASIFICACION_REPORTE.includes(c.clasificacion) ? c.clasificacion : "Sin clasificación") === clase);
        if (!cuentas.length) return;
        renglones.push({ tipo: "seccion", etiqueta: clase });
        cuentas.forEach(c => renglones.push({ tipo: "cuenta", etiqueta: c.nombre, codigo: String(c.codigo), valores: valores(c) }));
        if (cuentas.length > 1) {
            const suma = clave => cuentas.reduce((t, c) => t + centavosReporte(c[clave]), 0) / 100;
            renglones.push({ tipo: "subtotal", etiqueta: "Total " + clase.toLowerCase(), valores: { debe: suma("debe"), haber: suma("haber"), saldoDeudor: suma("saldoDeudor"), saldoAcreedor: suma("saldoAcreedor") } });
        }
    });
    renglones.push({ tipo: "final", etiqueta: "Sumas iguales", valores: { debe: balanza.totalDebe, haber: balanza.totalHaber, saldoDeudor: balanza.totalSaldoDeudor, saldoAcreedor: balanza.totalSaldoAcreedor } });
    const cuadra = centavosReporte(balanza.totalDebe) === centavosReporte(balanza.totalHaber) && centavosReporte(balanza.totalSaldoDeudor) === centavosReporte(balanza.totalSaldoAcreedor);
    return { columnas: COLUMNAS_BALANZA_REPORTE.slice(), renglones: renglones, comparar: false, control: { cuadra: cuadra, etiqueta: "Debe = Haber y saldos deudores = saldos acreedores" } };
}
function columnasComparativasReporte(tituloActual, tituloComparativo, comparar) {
    return comparar
        ? [{ clave: "actual", titulo: tituloActual }, { clave: "comparativo", titulo: tituloComparativo }, { clave: "variacion", titulo: "Variación" }, { clave: "variacionPct", titulo: "Var. %", formato: "porcentaje" }]
        : [{ clave: "actual", titulo: tituloActual }];
}
// Fin fase 4
// Inicio fase 5: exportación CSV (separador ; con encabezados, cifras sin formato de moneda)
function valorCeldaReporte(renglonActual, columna) {
    const valor = renglonActual.valores ? renglonActual.valores[columna.clave] : undefined;
    if (valor === undefined) return "";
    if (columna.formato === "porcentaje" || renglonActual.formato === "porcentaje") return valor === null ? "" : (Math.round(valor * 10) / 10).toFixed(1);
    return valor === null ? "" : (centavosReporte(valor) / 100).toFixed(2);
}
function estructuraACSVReporte(estructura, titulo, periodo) {
    const celda = v => /[;"\r\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
    const filas = [[titulo], [periodo], [], ["Código", "Cuenta"].concat(estructura.columnas.map(c => c.titulo))];
    estructura.renglones.forEach(r => filas.push([r.codigo || "", r.etiqueta].concat(estructura.columnas.map(c => valorCeldaReporte(r, c)))));
    return filas.map(f => f.map(celda).join(";")).join("\r\n");
}
// Fin fase 5
