let comprasImpuestos = [];
let ventasImpuestos = [];

function dineroImpuesto(valor) {
    return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(Number(valor || 0));
}
function escaparImpuesto(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function periodoActual() {
    const fecha = new Date();
    return fecha.getFullYear() + "-" + String(fecha.getMonth() + 1).padStart(2, "0");
}
function bloquearBotonImpuesto(boton, bloqueado) {
    if (!boton) return;
    boton.disabled = Boolean(bloqueado);
    boton.setAttribute("aria-busy", bloqueado ? "true" : "false");
}
function renderLibroCompras(lista) {
    document.getElementById("libro-compras-f07").innerHTML = lista.map(function(c) {
        return `<tr><td>${escaparImpuesto(c.fecha)}</td><td>${escaparImpuesto(c.documento)}</td><td>${escaparImpuesto(c.proveedor)}</td><td>${escaparImpuesto(c.nrc)}</td><td>${dineroImpuesto(c.comprasGravadas)}</td><td>${dineroImpuesto(c.ivaCredito)}</td><td>${dineroImpuesto(c.total)}</td><td><div class="acciones-fila"><button type="button" class="boton-secundario-azul editar-f07-compra" data-id="${escaparImpuesto(c.id)}">Editar origen</button><button type="button" class="boton-peligro eliminar-f07-compra" data-id="${escaparImpuesto(c.id)}">Eliminar</button></div></td></tr>`;
    }).join("");
}
function renderLibroVentas(id, lista) {
    document.getElementById(id).innerHTML = lista.map(function(v) {
        return `<tr><td>${escaparImpuesto(v.fecha)}</td><td>${escaparImpuesto(v.documento)}</td><td>${escaparImpuesto(v.cliente)}</td><td>${escaparImpuesto(v.nrc || "—")}</td><td>${dineroImpuesto(v.ventasGravadas)}</td><td>${dineroImpuesto(v.ivaDebito)}</td><td>${dineroImpuesto(v.total)}</td><td><div class="acciones-fila"><button type="button" class="boton-secundario-azul editar-f07-venta" data-id="${escaparImpuesto(v.id)}">Editar origen</button><button type="button" class="boton-peligro eliminar-f07-venta" data-id="${escaparImpuesto(v.id)}">Eliminar</button></div></td></tr>`;
    }).join("");
}
function refrescarImpuestos() {
    const periodo = document.getElementById("periodo-iva").value;
    const compras = filtrarPorPeriodo(comprasImpuestos, periodo);
    const ventas = filtrarPorPeriodo(ventasImpuestos, periodo);
    const resumen = resumirIVA(compras, ventas);
    if (!resumen.verificacion?.valido || resumen.verificacion.niveles.length !== 3) throw new Error("No se renderizará el IVA sin triple verificación.");
    document.getElementById("iva-debito").textContent = dineroImpuesto(resumen.debitoFiscal);
    document.getElementById("iva-credito").textContent = dineroImpuesto(resumen.creditoFiscal);
    document.getElementById("iva-pagar").textContent = dineroImpuesto(resumen.ivaPorPagar);
    document.getElementById("iva-remanente").textContent = dineroImpuesto(resumen.remanenteCreditoFiscal);
    document.getElementById("estado-iva").textContent = resumen.ivaPorPagar > 0 ? "IVA por pagar" : resumen.remanenteCreditoFiscal > 0 ? "Remanente de crédito fiscal" : "Sin diferencia";
    renderLibroCompras(compras);
    renderLibroVentas("libro-ventas-contribuyentes", ventas.filter(function(v) { return v.tipoCliente === "CONTRIBUYENTE"; }));
    renderLibroVentas("libro-ventas-cf", ventas.filter(function(v) { return v.tipoCliente === "CONSUMIDOR_FINAL"; }));
    document.querySelectorAll(".editar-f07-compra").forEach(function(b) { b.addEventListener("click", editarCompraDesdeImpuestos); });
    document.querySelectorAll(".eliminar-f07-compra").forEach(function(b) { b.addEventListener("click", eliminarCompraDesdeImpuestos); });
    document.querySelectorAll(".editar-f07-venta").forEach(function(b) { b.addEventListener("click", editarVentaDesdeImpuestos); });
    document.querySelectorAll(".eliminar-f07-venta").forEach(function(b) { b.addEventListener("click", eliminarVentaDesdeImpuestos); });
    window.dispatchEvent(new Event("erp:data-updated"));
}
function exportar(tipo) {
    const periodo = document.getElementById("periodo-iva").value;
    let csv = "", nombre = "";
    if (tipo === "compras") {
        csv = generarCSVF07Compras(comprasImpuestos, periodo); nombre = `F07_Anexo3_Compras_${periodo}.csv`;
    } else if (tipo === "contribuyentes") {
        csv = generarCSVF07VentasContribuyentes(ventasImpuestos, periodo); nombre = `F07_Anexo1_Ventas_Contribuyentes_${periodo}.csv`;
    } else {
        csv = generarCSVF07VentasConsumidorFinal(ventasImpuestos, periodo); nombre = `F07_Anexo2_Ventas_Consumidor_Final_${periodo}.csv`;
    }
    if (!csv) {
        document.getElementById("mensaje-impuestos").textContent = "No hay registros para exportar en ese anexo y período.";
        return;
    }
    descargarTexto(nombre, csv);
    document.getElementById("mensaje-impuestos").textContent = "CSV generado sin encabezados y con estructura verificada para el anexo seleccionado.";
}
async function recargarDatosImpuestos() {
    [comprasImpuestos, ventasImpuestos] = await Promise.all([obtenerComprasBD(), obtenerVentasBD()]);
    refrescarImpuestos();
}
function activarPestanaOperacion(nombre) {
    const boton = document.querySelector('.module-tab[data-tab="' + nombre + '"]');
    if (boton) boton.click();
}
function editarCompraDesdeImpuestos(evento) {
    activarPestanaOperacion("compras");
    iniciarEdicionCompraUI({ currentTarget: evento.currentTarget });
}
function editarVentaDesdeImpuestos(evento) {
    activarPestanaOperacion("ventas");
    iniciarEdicionVentaUI({ currentTarget: evento.currentTarget });
}
async function eliminarCompraDesdeImpuestos(evento) {
    const boton = evento.currentTarget;
    const id = boton.dataset.id;
    const compra = comprasImpuestos.find(function(c) { return String(c.id) === String(id); });
    if (!compra) return;
    if (!window.confirm("¿Eliminar la compra " + compra.documento + " desde el libro fiscal?\n\nSe eliminará la operación de origen y todos sus efectos relacionados.")) return;
    bloquearBotonImpuesto(boton, true);
    try {
        const resultado = await eliminarCompra(id);
        document.getElementById("mensaje-impuestos").textContent = "Compra eliminada." + (resultado.cierreIVAEliminado ? " El cierre IVA del período fue eliminado y debe contabilizarse otra vez." : "");
        await recargarDatosImpuestos();
    } catch (error) {
        document.getElementById("mensaje-impuestos").textContent = "No fue posible eliminar la compra: " + error.message;
        bloquearBotonImpuesto(boton, false);
    }
}
async function eliminarVentaDesdeImpuestos(evento) {
    const boton = evento.currentTarget;
    const id = boton.dataset.id;
    const venta = ventasImpuestos.find(function(v) { return String(v.id) === String(id); });
    if (!venta) return;
    if (!window.confirm("¿Eliminar la venta " + venta.documento + " desde el libro fiscal?\n\nSe eliminará la operación de origen y todos sus efectos relacionados.")) return;
    bloquearBotonImpuesto(boton, true);
    try {
        const resultado = await eliminarVenta(id);
        document.getElementById("mensaje-impuestos").textContent = "Venta eliminada." + (resultado.cierreIVAEliminado ? " El cierre IVA del período fue eliminado y debe contabilizarse otra vez." : "");
        await recargarDatosImpuestos();
    } catch (error) {
        document.getElementById("mensaje-impuestos").textContent = "No fue posible eliminar la venta: " + error.message;
        bloquearBotonImpuesto(boton, false);
    }
}
async function cerrarIVA(evento) {
    const boton = evento.currentTarget;
    bloquearBotonImpuesto(boton, true);
    try {
        const resultado = await contabilizarCierreIVA(document.getElementById("periodo-iva").value);
        document.getElementById("mensaje-impuestos").textContent = "Cierre contabilizado. " + (resultado.resumen.ivaPorPagar > 0 ? "IVA por pagar: " + dineroImpuesto(resultado.resumen.ivaPorPagar) : "Remanente de crédito fiscal: " + dineroImpuesto(resultado.resumen.remanenteCreditoFiscal));
        await recargarDatosImpuestos();
    } catch (error) {
        document.getElementById("mensaje-impuestos").textContent = error.message;
    } finally {
        bloquearBotonImpuesto(boton, false);
    }
}
async function iniciarImpuestos() {
    await abrirBaseDatos();
    [comprasImpuestos, ventasImpuestos] = await Promise.all([obtenerComprasBD(), obtenerVentasBD()]);
    document.getElementById("periodo-iva").value = periodoActual();
    document.getElementById("periodo-iva").addEventListener("change", refrescarImpuestos);
    document.getElementById("exportar-compras-f07").addEventListener("click", function() { exportar("compras"); });
    document.getElementById("exportar-contribuyentes-f07").addEventListener("click", function() { exportar("contribuyentes"); });
    document.getElementById("exportar-cf-f07").addEventListener("click", function() { exportar("cf"); });
    document.getElementById("cerrar-iva").addEventListener("click", cerrarIVA);
    refrescarImpuestos();
}
document.addEventListener("DOMContentLoaded", function() {
    iniciarImpuestos().catch(function(error) {
        document.getElementById("mensaje-impuestos").textContent = "No fue posible iniciar Impuestos/F07: " + error.message;
    });
});
