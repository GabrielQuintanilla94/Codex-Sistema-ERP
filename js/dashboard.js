const DASHBOARD_PERIODO_STORAGE = "lc:dashboard:periodo";
const DASHBOARD_MESES_TENDENCIA = 6;
let dashboardPeriodoSeleccionado = "";
let dashboardDatos = { cuentas: [], movimientos: [], compras: [], ventas: [] };
let dashboardRefrescoEnCurso = null;
let dashboardRefrescoPendiente = false;
// Inicio fase 1: utilidades de período y formato
function dashboardDinero(valor) { return graficoFormatoMoneda(valor); }
function dashboardEscapar(valor) {
    return String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function dashboardFechaActual() {
    const f = new Date();
    return f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0") + "-" + String(f.getDate()).padStart(2, "0");
}
function dashboardPeriodoActual() { return dashboardFechaActual().slice(0, 7); }
function dashboardPeriodoValido(periodo) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(periodo || "")); }
function dashboardDiasMes(periodo) {
    const [anio, mes] = String(periodo).split("-").map(Number);
    return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}
function dashboardRangoPeriodo(periodo) {
    if (!dashboardPeriodoValido(periodo)) throw new Error("El período de análisis no es válido.");
    return { desde: periodo + "-01", hasta: periodo + "-" + String(dashboardDiasMes(periodo)).padStart(2, "0") };
}
function dashboardFormatearMes(periodo, opciones) {
    const [anio, mes] = periodo.split("-").map(Number);
    const texto = new Intl.DateTimeFormat("es-SV", { ...opciones, timeZone: "UTC" }).format(new Date(Date.UTC(anio, mes - 1, 1))).replace(".", "");
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}
function dashboardEtiquetaPeriodo(periodo) { return dashboardPeriodoValido(periodo) ? dashboardFormatearMes(periodo, { month: "long", year: "numeric" }) : "Período"; }
function dashboardEtiquetaCorta(periodo, conAnio) { return dashboardFormatearMes(periodo, { month: "short" }) + (conAnio ? " " + periodo.slice(2, 4) : ""); }
function dashboardEnRango(fecha, desde, hasta) { return String(fecha || "") >= desde && String(fecha || "") <= hasta; }
function dashboardSumar(lista, campo) { return (lista || []).reduce(function(t, x) { return t + Number(x[campo] || 0); }, 0); }
function dashboardDesplazarPeriodo(periodo, meses) {
    const [anio, mes] = periodo.split("-").map(Number);
    const d = new Date(Date.UTC(anio, mes - 1 + meses, 1));
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}
function dashboardPeriodoPrevio(periodo) { return dashboardDesplazarPeriodo(periodo, -1); }
function dashboardPeriodoSiguiente(periodo) { return dashboardDesplazarPeriodo(periodo, 1); }
function dashboardVariacion(actual, anterior, sentido = 1, referencia = "mes anterior") {
    const v = graficoVariacion(actual, anterior, { sentido: sentido, referencia: referencia });
    return { texto: v.texto, clase: { bueno: "positive", malo: "negative", neutral: "neutral" }[v.tono] };
}
// Fin fase 1
// Inicio fase 2: cálculo puro de la serie mensual (sin DOM)
function dashboardDisponibilidad(datos, hasta) {
    return generarBalanzaComprobacion(datos.cuentas, datos.movimientos, "", hasta).cuentas
        .filter(c => c.clasificacion === "Activo" && /(banco|caja)/i.test(String(c.nombre || ""))).reduce((t, c) => t + Number(c.saldoNatural || 0), 0);
}
function dashboardSerieMensual(datos, periodo, meses = DASHBOARD_MESES_TENDENCIA) {
    const periodos = Array.from({ length: meses }, (_, i) => dashboardDesplazarPeriodo(periodo, i - meses + 1));
    return periodos.map(function(p, i) {
        const r = dashboardRangoPeriodo(p), enRango = x => dashboardEnRango(x.fecha, r.desde, r.hasta);
        const compras = datos.compras.filter(enRango), ventas = datos.ventas.filter(enRango);
        const estado = generarEstadoResultados(datos.cuentas, datos.movimientos, r.desde, r.hasta);
        return { periodo: p, etiqueta: dashboardEtiquetaCorta(p, i === 0 || p.endsWith("-01")), etiquetaLarga: dashboardEtiquetaPeriodo(p), compras: compras, ventas: ventas,
            ventasBase: dashboardSumar(ventas, "ventasGravadas"), comprasBase: dashboardSumar(compras, "comprasGravadas"), estado: estado, disponibilidad: dashboardDisponibilidad(datos, r.hasta) };
    });
}
function dashboardComposicionResultado(estado) {
    const costo = (estado.gastos || []).filter(c => String(c.codigo).startsWith("5")).reduce((t, c) => t + Number(c.saldoNatural || 0), 0);
    const ingresos = Math.max(0, Number(estado.totalIngresos || 0)), gastos = Math.max(0, Number(estado.totalGastos || 0));
    return { ingresos: ingresos, gastos: gastos, costo: costo, operacion: gastos - costo, margen: ingresos > 0 ? (ingresos - costo) / ingresos : null };
}
// Fin fase 2
// Inicio fase 3: renderizado de cada bloque (solo cambia lo que recibió datos nuevos)
function dashboardTexto(id, texto) { const nodo = document.getElementById(id); if (nodo && nodo.textContent !== texto) nodo.textContent = texto; }
function dashboardRenderTendencia(serie, activo) {
    return graficoColumnas(document.getElementById("dashboard-tendencia"), {
        descripcion: "Ventas y compras gravadas de los últimos " + serie.length + " meses",
        categorias: serie.map(x => x.etiqueta), etiquetasLargas: serie.map(x => x.etiquetaLarga), activo: activo,
        series: [{ nombre: "Ventas", valores: serie.map(x => x.ventasBase) }, { nombre: "Compras", valores: serie.map(x => x.comprasBase) }]
    });
}
function dashboardRenderRanking(gastos) {
    graficoRanking(document.getElementById("dashboard-gastos-ranking"), (gastos || []).map(x => ({ nombre: x.nombre, valor: x.saldoNatural })), { vacio: "Sin costos ni gastos en el período." });
}
function dashboardRenderActividad(compras, ventas) {
    const ops = compras.map(c => ({fecha:c.fecha,tipo:"Compra",documento:c.documento,tercero:c.proveedor,base:c.comprasGravadas,iva:c.ivaCredito,total:c.total}))
        .concat(ventas.map(v => ({fecha:v.fecha,tipo:"Venta",documento:v.documento,tercero:v.cliente,base:v.ventasGravadas,iva:v.ivaDebito,total:v.total})))
        .sort((a,b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0,8);
    document.getElementById("dashboard-actividad").innerHTML = ops.map(function(o) {
        return `<tr><td>${dashboardEscapar(o.fecha)}</td><td><span class="type-badge ${o.tipo.toLowerCase()}">${o.tipo}</span></td><td>${dashboardEscapar(o.documento)}</td><td>${dashboardEscapar(o.tercero || "—")}</td><td class="numero">${dashboardDinero(o.base)}</td><td class="numero">${dashboardDinero(o.iva)}</td><td class="numero"><strong>${dashboardDinero(o.total)}</strong></td></tr>`;
    }).join("");
    document.getElementById("dashboard-sin-actividad").style.display = ops.length ? "none" : "block";
}
function dashboardActualizarVariacion(id, actual, anterior, sentido = 1, referencia = "mes anterior") {
    const nodo = document.getElementById(id);
    if (!nodo) return;
    const v = dashboardVariacion(actual, anterior, sentido, referencia);
    nodo.textContent = v.texto;
    nodo.className = "kpi-delta " + v.clase;
}
function dashboardRenderKPI(clave, valor, serie, campo, sentido, referencia) {
    dashboardTexto("kpi-" + clave, dashboardDinero(valor));
    dashboardActualizarVariacion("kpi-" + clave + "-delta", valor, campo(serie[serie.length - 2]), sentido, referencia);
    graficoSparkline(document.getElementById("kpi-" + clave + "-tendencia"), serie.map(campo), "Últimos " + serie.length + " meses");
}
function dashboardRenderResultado(estado) {
    const r = dashboardComposicionResultado(estado), escala = Math.max(r.ingresos, r.gastos, 1);
    dashboardTexto("dashboard-ingresos", dashboardDinero(r.ingresos));
    dashboardTexto("dashboard-gastos", dashboardDinero(r.gastos));
    dashboardTexto("dashboard-costo-ventas", dashboardDinero(r.costo));
    dashboardTexto("dashboard-gastos-operacion", dashboardDinero(r.operacion));
    dashboardTexto("dashboard-resultado-neto", dashboardDinero(estado.resultadoNeto));
    dashboardTexto("dashboard-margen", r.margen === null ? "—" : (r.margen * 100).toFixed(1) + " %");
    document.getElementById("dashboard-resultado-neto").className = "headline-amount " + (estado.resultadoNeto < 0 ? "negativo" : "");
    document.getElementById("dashboard-barra-ingresos").style.width = (r.ingresos / escala * 100).toFixed(2) + "%";
    document.getElementById("dashboard-barra-gastos").style.width = (r.gastos / escala * 100).toFixed(2) + "%";
    document.getElementById("dashboard-margen-barra").style.width = (Math.max(0, Math.min(1, r.margen || 0)) * 100).toFixed(2) + "%";
}
function dashboardRenderIVA(iva, periodo) {
    const ivaNeto = iva.ivaPorPagar || iva.remanenteCreditoFiscal || 0, escala = Math.max(iva.debitoFiscal, iva.creditoFiscal, 1);
    const estado = iva.ivaPorPagar > 0 ? "IVA por pagar" : iva.remanenteCreditoFiscal > 0 ? "Remanente de crédito" : "Sin diferencia";
    dashboardTexto("kpi-iva", dashboardDinero(ivaNeto));
    dashboardTexto("kpi-iva-estado", estado);
    dashboardTexto("dashboard-iva-debito", dashboardDinero(iva.debitoFiscal));
    dashboardTexto("dashboard-iva-credito", dashboardDinero(iva.creditoFiscal));
    dashboardTexto("dashboard-iva-neto", dashboardDinero(ivaNeto));
    dashboardTexto("dashboard-iva-etiqueta", estado);
    dashboardTexto("dashboard-periodo-iva", dashboardEtiquetaPeriodo(periodo));
    document.getElementById("dashboard-barra-debito").style.width = (iva.debitoFiscal / escala * 100).toFixed(2) + "%";
    document.getElementById("dashboard-barra-credito").style.width = (iva.creditoFiscal / escala * 100).toFixed(2) + "%";
}
// Fin fase 3
// Inicio fase 4: orquestación del período, datos y suscripción EDA
function dashboardElegirPeriodoInicial(compras, ventas) {
    const guardado = localStorage.getItem(DASHBOARD_PERIODO_STORAGE);
    if (dashboardPeriodoValido(guardado)) return guardado;
    const periodos = compras.concat(ventas).map(x => String(x.fecha || "").slice(0,7)).filter(dashboardPeriodoValido).sort();
    return periodos.length ? periodos[periodos.length - 1] : dashboardPeriodoActual();
}
async function dashboardCargarDatos() {
    dashboardDatos = {
        cuentas: await obtenerCuentasBD(),
        movimientos: await obtenerMovimientosBD(),
        compras: await obtenerComprasBD(),
        ventas: await obtenerVentasBD()
    };
    return dashboardDatos;
}
function dashboardRenderPeriodo(periodo) {
    if (!dashboardPeriodoValido(periodo)) throw new Error("El período seleccionado no es válido.");
    dashboardPeriodoSeleccionado = periodo;
    localStorage.setItem(DASHBOARD_PERIODO_STORAGE, periodo);
    const selector = document.getElementById("dashboard-periodo");
    if (selector && selector.value !== periodo) selector.value = periodo;
    dashboardTexto("dashboard-periodo-etiqueta", dashboardEtiquetaPeriodo(periodo));
    const serie = dashboardSerieMensual(dashboardDatos, periodo), actual = serie[serie.length - 1];
    const referencia = dashboardEtiquetaCorta(dashboardPeriodoPrevio(periodo)).toLowerCase();
    dashboardRenderKPI("ventas", actual.ventasBase, serie, x => x.ventasBase, 1, referencia);
    dashboardRenderKPI("compras", actual.comprasBase, serie, x => x.comprasBase, 0, referencia);
    dashboardRenderKPI("resultado", actual.estado.resultadoNeto, serie, x => x.estado.resultadoNeto, 1, referencia);
    dashboardRenderKPI("disponibilidad", actual.disponibilidad, serie, x => x.disponibilidad, 1, referencia);
    dashboardRenderIVA(resumirIVA(actual.compras, actual.ventas), periodo);
    graficoSparkline(document.getElementById("kpi-iva-tendencia"), serie.map(x => { const i = resumirIVA(x.compras, x.ventas); return i.debitoFiscal - i.creditoFiscal; }), "IVA débito menos crédito, últimos " + serie.length + " meses");
    dashboardRenderTendencia(serie, serie.length - 1);
    dashboardRenderResultado(actual.estado);
    dashboardRenderRanking(actual.estado.gastos);
    dashboardRenderActividad(actual.compras, actual.ventas);
}
async function dashboardRefrescarDesdeBD() {
dashboardRefrescoPendiente = true;
if (dashboardRefrescoEnCurso) return dashboardRefrescoEnCurso;
dashboardRefrescoEnCurso = (async function() {
do {
dashboardRefrescoPendiente = false;
await dashboardCargarDatos();
const periodo = dashboardPeriodoSeleccionado || dashboardElegirPeriodoInicial(dashboardDatos.compras, dashboardDatos.ventas);
dashboardRenderPeriodo(periodo);
} while (dashboardRefrescoPendiente);
})();
try { await dashboardRefrescoEnCurso; } finally { dashboardRefrescoEnCurso = null; }
}
function dashboardSuscribirEDA() {
return registrarConsumidorContable("dashboard",dashboardRefrescarDesdeBD);
}
async function iniciarDashboard() {
    await abrirBaseDatos();
    await dashboardCargarDatos();
    dashboardPeriodoSeleccionado = dashboardElegirPeriodoInicial(dashboardDatos.compras, dashboardDatos.ventas);
    const selector = document.getElementById("dashboard-periodo");
    selector.value = dashboardPeriodoSeleccionado;
    selector.addEventListener("change", function() {
        if (dashboardPeriodoValido(selector.value)) dashboardRenderPeriodo(selector.value);
    });
    const navegar = (id, destino) => document.getElementById(id).addEventListener("click", () => dashboardRenderPeriodo(destino()));
    navegar("dashboard-periodo-anterior", () => dashboardPeriodoPrevio(dashboardPeriodoSeleccionado));
    navegar("dashboard-periodo-siguiente", () => dashboardPeriodoSiguiente(dashboardPeriodoSeleccionado));
    navegar("dashboard-periodo-actual", dashboardPeriodoActual);
    dashboardRenderPeriodo(dashboardPeriodoSeleccionado);
}
dashboardSuscribirEDA();
document.addEventListener("DOMContentLoaded", function() {
    iniciarDashboard().catch(function(e) { console.error(e); });
});
// Fin fase 4
