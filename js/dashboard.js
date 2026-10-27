const DASHBOARD_PERIODO_STORAGE = "lc:dashboard:periodo";
let dashboardPeriodoSeleccionado = "";
let dashboardDatos = { cuentas: [], movimientos: [], compras: [], ventas: [] };
let dashboardRefrescoEnCurso = null;

function dashboardDinero(valor) {
    return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(valor || 0));
}
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
function dashboardEtiquetaPeriodo(periodo) {
    if (!dashboardPeriodoValido(periodo)) return "Período";
    const [anio, mes] = periodo.split("-").map(Number);
    const texto = new Intl.DateTimeFormat("es-SV", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(anio, mes - 1, 1)));
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}
function dashboardEnRango(fecha, desde, hasta) { return String(fecha || "") >= desde && String(fecha || "") <= hasta; }
function dashboardSumar(lista, campo) { return (lista || []).reduce(function(t, x) { return t + Number(x[campo] || 0); }, 0); }
function dashboardPeriodoPrevio(periodo) {
    const [anio, mes] = periodo.split("-").map(Number);
    const d = new Date(Date.UTC(anio, mes - 2, 1));
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}
function dashboardVariacion(actual, anterior) {
    actual = Number(actual || 0); anterior = Number(anterior || 0);
    if (anterior === 0) return actual === 0 ? { texto: "Sin cambio", clase: "neutral" } : { texto: "Nuevo período", clase: "positive" };
    const pct = (actual - anterior) / Math.abs(anterior) * 100;
    return { texto: (pct >= 0 ? "+" : "") + pct.toFixed(1) + "% vs. mes anterior", clase: pct >= 0 ? "positive" : "negative" };
}
function dashboardBloquesPeriodo(periodo, compras, ventas) {
    const ultimo = dashboardDiasMes(periodo);
    const rangos = [[1,5],[6,10],[11,15],[16,20],[21,25],[26,ultimo]];
    return rangos.filter(r => r[0] <= ultimo).map(function(r) {
        const di = periodo + "-" + String(r[0]).padStart(2,"0");
        const df = periodo + "-" + String(r[1]).padStart(2,"0");
        return {
            etiqueta: String(r[0]).padStart(2,"0") + "–" + String(r[1]).padStart(2,"0"),
            ventas: dashboardSumar(ventas.filter(x => dashboardEnRango(x.fecha, di, df)), "ventasGravadas"),
            compras: dashboardSumar(compras.filter(x => dashboardEnRango(x.fecha, di, df)), "comprasGravadas")
        };
    });
}
function dashboardRenderTendencia(bloques) {
    const max = Math.max(1, ...bloques.flatMap(x => [x.ventas, x.compras]));
    const nodo = document.getElementById("dashboard-tendencia");
    nodo.innerHTML = bloques.map(function(b) {
        return `<div class="trend-group"><div class="trend-bars"><i class="trend-bar ventas" style="height:${b.ventas ? Math.max(3,b.ventas/max*100) : 0}%" title="Ventas ${dashboardDinero(b.ventas)}"></i><i class="trend-bar compras" style="height:${b.compras ? Math.max(3,b.compras/max*100) : 0}%" title="Compras ${dashboardDinero(b.compras)}"></i></div><span>${b.etiqueta}</span></div>`;
    }).join("");
}
function dashboardRenderRanking(gastos) {
    const lista = (gastos || []).filter(x => Number(x.saldoNatural || 0) > 0).sort((a,b) => Number(b.saldoNatural || 0) - Number(a.saldoNatural || 0)).slice(0,5);
    const max = Math.max(1, ...lista.map(x => Number(x.saldoNatural || 0)));
    document.getElementById("dashboard-gastos-ranking").innerHTML = lista.length ? lista.map(function(x) {
        const v = Number(x.saldoNatural || 0);
        return `<div class="ranking-row"><div><span>${dashboardEscapar(x.nombre)}</span><strong>${dashboardDinero(v)}</strong></div><div class="ranking-track"><i style="width:${v/max*100}%"></i></div></div>`;
    }).join("") : '<p class="dashboard-vacio">Sin gastos en el período.</p>';
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
function dashboardActualizarVariacion(id, actual, anterior) {
    const nodo = document.getElementById(id);
    if (!nodo) return;
    const v = dashboardVariacion(actual, anterior);
    nodo.textContent = v.texto;
    nodo.className = "kpi-delta " + v.clase;
}
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
    document.getElementById("dashboard-periodo-etiqueta").textContent = dashboardEtiquetaPeriodo(periodo);

    const { cuentas, movimientos, compras, ventas } = dashboardDatos;
    const rango = dashboardRangoPeriodo(periodo);
    const periodoPrevio = dashboardPeriodoPrevio(periodo);
    const rangoPrevio = dashboardRangoPeriodo(periodoPrevio);
    const comprasPeriodo = compras.filter(c => dashboardEnRango(c.fecha, rango.desde, rango.hasta));
    const ventasPeriodo = ventas.filter(v => dashboardEnRango(v.fecha, rango.desde, rango.hasta));
    const comprasPrev = compras.filter(c => dashboardEnRango(c.fecha, rangoPrevio.desde, rangoPrevio.hasta));
    const ventasPrev = ventas.filter(v => dashboardEnRango(v.fecha, rangoPrevio.desde, rangoPrevio.hasta));

    const balanza = generarBalanzaComprobacion(cuentas, movimientos, "", rango.hasta);
    const estado = generarEstadoResultados(cuentas, movimientos, rango.desde, rango.hasta);
    const estadoPrev = generarEstadoResultados(cuentas, movimientos, rangoPrevio.desde, rangoPrevio.hasta);
    const disponibilidad = balanza.cuentas.filter(c => c.clasificacion === "Activo" && /(banco|caja)/i.test(String(c.nombre || ""))).reduce((t,c) => t + Number(c.saldoNatural || 0), 0);
    const iva = resumirIVA(comprasPeriodo, ventasPeriodo);
    const ventasBase = dashboardSumar(ventasPeriodo, "ventasGravadas");
    const comprasBase = dashboardSumar(comprasPeriodo, "comprasGravadas");
    const ventasPrevBase = dashboardSumar(ventasPrev, "ventasGravadas");
    const comprasPrevBase = dashboardSumar(comprasPrev, "comprasGravadas");

    document.getElementById("kpi-disponibilidad").textContent = dashboardDinero(disponibilidad);
    document.getElementById("kpi-ventas").textContent = dashboardDinero(ventasBase);
    document.getElementById("kpi-compras").textContent = dashboardDinero(comprasBase);
    document.getElementById("kpi-resultado").textContent = dashboardDinero(estado.resultadoNeto);
    dashboardActualizarVariacion("kpi-ventas-delta", ventasBase, ventasPrevBase);
    dashboardActualizarVariacion("kpi-compras-delta", comprasBase, comprasPrevBase);
    dashboardActualizarVariacion("kpi-resultado-delta", estado.resultadoNeto, estadoPrev.resultadoNeto);

    const ivaNeto = iva.ivaPorPagar || iva.remanenteCreditoFiscal || 0;
    document.getElementById("kpi-iva").textContent = dashboardDinero(ivaNeto);
    document.getElementById("kpi-iva-estado").textContent = iva.ivaPorPagar > 0 ? "IVA por pagar" : iva.remanenteCreditoFiscal > 0 ? "Remanente de crédito" : "Sin diferencia";
    document.getElementById("dashboard-iva-debito").textContent = dashboardDinero(iva.debitoFiscal);
    document.getElementById("dashboard-iva-credito").textContent = dashboardDinero(iva.creditoFiscal);
    document.getElementById("dashboard-iva-neto").textContent = dashboardDinero(ivaNeto);
    document.getElementById("dashboard-iva-etiqueta").textContent = iva.ivaPorPagar > 0 ? "IVA por pagar" : iva.remanenteCreditoFiscal > 0 ? "Remanente" : "Resultado";
    document.getElementById("dashboard-periodo-iva").textContent = dashboardEtiquetaPeriodo(periodo);

    const ingresos = Math.max(0, Number(estado.totalIngresos || 0));
    const gastos = Math.max(0, Number(estado.totalGastos || 0));
    const escala = Math.max(ingresos, gastos, 1);
    document.getElementById("dashboard-ingresos").textContent = dashboardDinero(ingresos);
    document.getElementById("dashboard-gastos").textContent = dashboardDinero(gastos);
    document.getElementById("dashboard-resultado-neto").textContent = dashboardDinero(estado.resultadoNeto);
    document.getElementById("dashboard-barra-ingresos").style.width = (ingresos / escala * 100).toFixed(2) + "%";
    document.getElementById("dashboard-barra-gastos").style.width = (gastos / escala * 100).toFixed(2) + "%";

    dashboardRenderTendencia(dashboardBloquesPeriodo(periodo, comprasPeriodo, ventasPeriodo));
    dashboardRenderRanking(estado.gastos);
    dashboardRenderActividad(comprasPeriodo, ventasPeriodo);
}
async function dashboardRefrescarDesdeBD() {
    if (dashboardRefrescoEnCurso) return dashboardRefrescoEnCurso;
    dashboardRefrescoEnCurso = (async function() {
        await dashboardCargarDatos();
        const periodo = dashboardPeriodoSeleccionado || dashboardElegirPeriodoInicial(dashboardDatos.compras, dashboardDatos.ventas);
        dashboardRenderPeriodo(periodo);
    })();
    try { await dashboardRefrescoEnCurso; } finally { dashboardRefrescoEnCurso = null; }
}
function dashboardSuscribirEDA() {
    if (typeof suscribirEventoContable !== "function" || typeof TIPOS_EVENTOS === "undefined") return;
    [
        TIPOS_EVENTOS.COMPRA_REGISTRADA, TIPOS_EVENTOS.COMPRA_EDITADA, TIPOS_EVENTOS.COMPRA_ELIMINADA,
        TIPOS_EVENTOS.VENTA_REGISTRADA, TIPOS_EVENTOS.VENTA_EDITADA, TIPOS_EVENTOS.VENTA_ELIMINADA,
        TIPOS_EVENTOS.PARTIDA_REGISTRADA, TIPOS_EVENTOS.PARTIDA_EDITADA, TIPOS_EVENTOS.PARTIDA_ELIMINADA,
        TIPOS_EVENTOS.PARTIDAS_IMPORTADAS, TIPOS_EVENTOS.IVA_CERRADO, TIPOS_EVENTOS.DEPRECIACION_SINCRONIZADA
    ].filter(Boolean).forEach(function(tipo) {
        suscribirEventoContable(tipo, async function() { await dashboardRefrescarDesdeBD(); });
    });
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
    document.getElementById("dashboard-periodo-anterior").addEventListener("click", function() {
        dashboardRenderPeriodo(dashboardPeriodoPrevio(dashboardPeriodoSeleccionado));
    });
    document.getElementById("dashboard-periodo-actual").addEventListener("click", function() {
        dashboardRenderPeriodo(dashboardPeriodoActual());
    });
    dashboardSuscribirEDA();
    dashboardRenderPeriodo(dashboardPeriodoSeleccionado);
}
document.addEventListener("DOMContentLoaded", function() {
    iniciarDashboard().catch(function(e) { console.error(e); });
});
