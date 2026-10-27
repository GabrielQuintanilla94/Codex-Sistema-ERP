let productosInventarioUI = [];

function dineroInventarioUI(valor) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(valor || 0));
}
function escaparInventarioUI(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function verificarTotalesInventarioUI(productos, totalUnidades, valorTotalCentavos) {
    const unidadesRecalculadas = (productos || []).reduce(function(total, p) { return total + Number(p.cantidad || 0); }, 0);
    const valorRecalculado = (productos || []).reduce(function(total, p) { return total + Number(p.valorInventarioCentavos || 0); }, 0);
    const nivel1 = Math.abs(unidadesRecalculadas - totalUnidades) < 1e-9;
    const nivel2 = valorRecalculado === valorTotalCentavos;
    const nivel3 = (productos || []).every(function(p) {
        return verificarEstadoInventarioTresNiveles(p, "Render " + p.sku).valido;
    });
    if (!(nivel1 && nivel2 && nivel3)) throw new Error("El resumen de inventario no superó la triple verificación.");
    return true;
}
async function cargarResumenInventarioUI() {
    const movimientos = await obtenerMovimientosBD();
    const reconstruccion = await reconstruirInventarioDesdeMovimientos(movimientos);
    productosInventarioUI = reconstruccion.productos.slice().sort(function(a, b) {
        return String(a.sku).localeCompare(String(b.sku), "es", { numeric: true });
    });
    const totalUnidades = productosInventarioUI.reduce(function(total, producto) { return total + Number(producto.cantidad || 0); }, 0);
    const valorTotalCentavos = productosInventarioUI.reduce(function(total, producto) { return total + Number(producto.valorInventarioCentavos || 0); }, 0);
    verificarTotalesInventarioUI(productosInventarioUI, totalUnidades, valorTotalCentavos);
    document.getElementById("inventario-total-skus").textContent = String(productosInventarioUI.length);
    document.getElementById("inventario-total-unidades").textContent = totalUnidades.toLocaleString("en-US", { maximumFractionDigits: 4 });
    document.getElementById("inventario-valor-total").textContent = dineroInventarioUI(inventarioADolares(valorTotalCentavos));
    const maxValorCentavos = Math.max(1, ...productosInventarioUI.map(function(p) { return Number(p.valorInventarioCentavos || 0); }));
    document.getElementById("cuerpo-inventario").innerHTML = productosInventarioUI.map(function(producto) {
        const valor = Number(producto.valorInventarioCentavos || 0);
        const participacion = valorTotalCentavos > 0 ? valor / valorTotalCentavos * 100 : 0;
        return '<tr><td><strong>' + escaparInventarioUI(producto.sku) + '</strong></td>' +
            '<td>' + escaparInventarioUI(producto.descripcion) + '</td>' +
            '<td class="numero">' + Number(producto.cantidad || 0).toLocaleString("en-US", { maximumFractionDigits: 4 }) + '</td>' +
            '<td class="numero">' + dineroInventarioUI(inventarioADolares(producto.costoPromedioCentavos)) + '</td>' +
            '<td class="numero"><strong>' + dineroInventarioUI(inventarioADolares(valor)) + '</strong></td>' +
            '<td><div class="participacion-cell"><div class="participacion-track"><i style="width:' + participacion.toFixed(2) + '%"></i></div><span>' + participacion.toFixed(1) + '%</span></div></td></tr>';
    }).join("");
    const ranking = productosInventarioUI.slice().sort(function(a,b){ return Number(b.valorInventarioCentavos||0)-Number(a.valorInventarioCentavos||0); }).slice(0,6);
    const rankingEl = document.getElementById("inventario-ranking");
    if (rankingEl) rankingEl.innerHTML = ranking.length ? ranking.map(function(p){
        const valor = Number(p.valorInventarioCentavos||0);
        return '<div class="ranking-row"><div><span>' + escaparInventarioUI(p.descripcion) + '</span><strong>' + dineroInventarioUI(inventarioADolares(valor)) + '</strong></div><div class="ranking-track"><i style="width:' + (valor/maxValorCentavos*100).toFixed(2) + '%"></i></div></div>';
    }).join("") : '<p class="dashboard-vacio">Sin inventario disponible.</p>';
    document.getElementById("inventario-sin-registros").style.display = productosInventarioUI.length ? "none" : "block";
}
async function actualizarInventarioUI() {
    const boton = document.getElementById("actualizar-inventario");
    boton.disabled = true;
    boton.setAttribute("aria-busy", "true");
    try {
        await cargarResumenInventarioUI();
        const mensaje = document.getElementById("mensaje-inventario-reporte");
        mensaje.textContent = "Inventario actualizado desde los movimientos contables.";
        mensaje.className = "mensaje-movimiento exito";
    } catch (error) {
        const mensaje = document.getElementById("mensaje-inventario-reporte");
        mensaje.textContent = "No se pudo reconstruir el inventario: " + error.message;
        mensaje.className = "mensaje-movimiento error";
    } finally {
        boton.disabled = false;
        boton.setAttribute("aria-busy", "false");
    }
}
async function iniciarInventarioUI() {
    await abrirBaseDatos();
    await actualizarInventarioUI();
}
document.getElementById("actualizar-inventario").addEventListener("click", actualizarInventarioUI);
iniciarInventarioUI().catch(function(error) {
    const mensaje = document.getElementById("mensaje-inventario-reporte");
    mensaje.textContent = "No se pudo iniciar Inventario: " + error.message;
    mensaje.className = "mensaje-movimiento error";
});
