function opsDinero(valor) {
    return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(Number(valor || 0));
}
function opsPeriodoActual() {
    const f = new Date();
    return f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0");
}
function opsCambiarTab(nombre, actualizarHash) {
    const valido = ["compras", "ventas", "impuestos"].includes(nombre) ? nombre : "compras";
    document.querySelectorAll(".module-tab").forEach(function(b) { b.classList.toggle("activo", b.dataset.tab === valido); });
    document.querySelectorAll(".module-panel").forEach(function(p) { p.classList.toggle("activo", p.dataset.panel === valido); });
    if (actualizarHash) history.replaceState(null, "", "#" + valido);
}
async function opsRefrescarResumen() {
    try {
        const periodo = opsPeriodoActual();
        const [compras, ventas] = await Promise.all([obtenerComprasBD(), obtenerVentasBD()]);
        const cm = filtrarPorPeriodo(compras, periodo);
        const vm = filtrarPorPeriodo(ventas, periodo);
        const resumen = resumirIVA(cm, vm);
        const comprasBase = cm.reduce(function(t, x) { return t + Number(x.comprasGravadas || 0); }, 0);
        const ventasBase = vm.reduce(function(t, x) { return t + Number(x.ventasGravadas || 0); }, 0);
        document.getElementById("ops-compras-mes").textContent = opsDinero(comprasBase);
        document.getElementById("ops-ventas-mes").textContent = opsDinero(ventasBase);
        document.getElementById("ops-compras-docs").textContent = cm.length + (cm.length === 1 ? " documento" : " documentos");
        document.getElementById("ops-ventas-docs").textContent = vm.length + (vm.length === 1 ? " documento" : " documentos");
        document.getElementById("ops-iva-credito").textContent = opsDinero(resumen.creditoFiscal);
        document.getElementById("ops-iva-debito").textContent = opsDinero(resumen.debitoFiscal);
        const neto = resumen.ivaPorPagar || resumen.remanenteCreditoFiscal || 0;
        document.getElementById("ops-iva-neto").textContent = opsDinero(neto);
        document.getElementById("ops-iva-estado").textContent = resumen.ivaPorPagar > 0 ? "IVA por pagar" : resumen.remanenteCreditoFiscal > 0 ? "Remanente de crédito" : "Sin diferencia";
    } catch (e) {
        console.error("Resumen comercial:", e);
    }
}
document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".module-tab").forEach(function(b) { b.addEventListener("click", function() { opsCambiarTab(b.dataset.tab, true); }); });
    opsCambiarTab(location.hash.replace("#", "") || "compras", false);
    window.addEventListener("hashchange", function() { opsCambiarTab(location.hash.replace("#", ""), false); });
    setTimeout(opsRefrescarResumen, 100);
});
window.addEventListener("erp:data-updated", opsRefrescarResumen);
