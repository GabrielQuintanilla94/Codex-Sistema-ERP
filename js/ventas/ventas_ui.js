let tercerosVentas = [];
let inventarioVentas = [];
let ventaEnEdicionId = null;

function dineroVenta(valor) {
    return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(Number(valor || 0));
}
function escaparVenta(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function fechaLocalISOVenta() {
    const fecha = new Date();
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
}
function bloquearBotonVenta(boton, bloqueado) {
    if (!boton) return;
    boton.disabled = Boolean(bloqueado);
    boton.setAttribute("aria-busy", bloqueado ? "true" : "false");
}
function llenarClientes() {
    const select = document.getElementById("venta-cliente");
    select.innerHTML = '<option value="">Seleccione cliente</option>' + tercerosVentas.map(function(t) {
        return `<option value="${escaparVenta(t.nrc)}">${escaparVenta(t.razonSocial)} · NRC ${escaparVenta(t.nrc)}</option>`;
    }).join("");
}
function llenarProductos() {
    document.querySelectorAll(".venta-sku").forEach(function(select) {
        const actual = select.value;
        select.innerHTML = '<option value="">Seleccione SKU</option>' + inventarioVentas.map(function(producto) {
            const seleccionado = String(producto.sku) === String(actual) ? " selected" : "";
            return `<option value="${escaparVenta(producto.sku)}"${seleccionado}>${escaparVenta(producto.sku)} · ${escaparVenta(producto.descripcion)} · ${Number(producto.cantidad || 0)} disponibles</option>`;
        }).join("");
    });
}
function actualizarCliente() {
    const tipo = document.getElementById("venta-tipo-cliente").value;
    const bloque = document.getElementById("campos-cliente-contribuyente");
    bloque.classList.toggle("oculto", tipo !== "CONTRIBUYENTE");
    if (tipo !== "CONTRIBUYENTE") {
        document.getElementById("venta-cliente").value = "";
        document.getElementById("venta-nrc").value = "";
        document.getElementById("venta-giro").value = "";
        return;
    }
    const tercero = buscarTerceroPorNRC(tercerosVentas, document.getElementById("venta-cliente").value);
    document.getElementById("venta-nrc").value = tercero?.nrc || "";
    document.getElementById("venta-giro").value = tercero?.giro || "";
}
function nuevaFilaVenta(datos) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><select class="venta-sku" required></select></td>
        <td><input class="venta-cantidad" type="number" min="0.01" step="0.01" value="${Number(datos?.cantidad || 1)}" required></td>
        <td><input class="venta-precio" type="number" min="0.01" step="0.01" value="${datos?.precioUnitario || ""}" required></td>
        <td class="venta-subtotal">$0.00</td>
        <td><button type="button" class="boton-icono eliminar-linea">×</button></td>`;
    tr.querySelector(".eliminar-linea").addEventListener("click", function() { tr.remove(); actualizarTotalesVenta(); });
    tr.querySelectorAll("input,select").forEach(function(control) { control.addEventListener("input", actualizarTotalesVenta); });
    document.getElementById("cuerpo-lineas-venta").appendChild(tr);
    llenarProductos();
    actualizarTotalesVenta();
}
function obtenerLineasVentaUI() {
    return Array.from(document.querySelectorAll("#cuerpo-lineas-venta tr")).map(function(tr) {
        return {
            sku: tr.querySelector(".venta-sku").value,
            cantidad: tr.querySelector(".venta-cantidad").value,
            precioUnitario: tr.querySelector(".venta-precio").value
        };
    });
}
function actualizarTotalesVenta() {
    try {
        const resumen = calcularResumenVenta(obtenerLineasVentaUI(), { estricto: false });
        document.querySelectorAll("#cuerpo-lineas-venta tr").forEach(function(tr, indice) {
            tr.querySelector(".venta-subtotal").textContent = dineroVenta(comercialADolares(resumen.subtotalesCentavos[indice] || 0));
        });
        if (!resumen.verificacion?.valido || resumen.verificacion.niveles.length !== 3) throw new Error("Verificación incompleta.");
        document.getElementById("venta-base").textContent = dineroVenta(resumen.base);
        document.getElementById("venta-iva").textContent = dineroVenta(resumen.iva);
        document.getElementById("venta-total").textContent = dineroVenta(resumen.total);
    } catch (error) {
        document.getElementById("venta-base").textContent = dineroVenta(0);
        document.getElementById("venta-iva").textContent = dineroVenta(0);
        document.getElementById("venta-total").textContent = dineroVenta(0);
    }
}
async function refrescarInventarioVenta() {
    inventarioVentas = (await obtenerInventariosBD()).slice().sort(function(a, b) {
        return String(a.sku).localeCompare(String(b.sku), "es", { numeric: true });
    });
    llenarProductos();
}
async function refrescarVentas() {
    const ventas = filtrarPorPeriodo(await obtenerVentasBD(),opsObtenerPeriodoConsulta()).slice().sort(function(a, b) {
        return String(b.fecha || "").localeCompare(String(a.fecha || "")) || String(b.id || "").localeCompare(String(a.id || ""));
    });
    document.getElementById("ventas-registradas").innerHTML = ventas.map(function(v) {
        return `<tr><td>${escaparVenta(v.fecha)}</td><td>${escaparVenta(v.documento)}</td><td>${v.tipoCliente === "CONTRIBUYENTE" ? "Contribuyente" : "Consumidor final"}</td><td>${escaparVenta(v.cliente)}</td><td>${escaparVenta(v.nrc || "—")}</td><td>${dineroVenta(v.ventasGravadas)}</td><td>${dineroVenta(v.ivaDebito)}</td><td>${dineroVenta(v.total)}</td><td><div class="acciones-fila"><button type="button" class="boton-secundario-azul editar-venta" data-id="${escaparVenta(v.id)}">Editar</button><button type="button" class="boton-peligro eliminar-venta" data-id="${escaparVenta(v.id)}">Eliminar</button></div></td></tr>`;
    }).join("");
    document.getElementById("sin-ventas").style.display = ventas.length ? "none" : "block";
    document.querySelectorAll(".editar-venta").forEach(function(boton) { boton.addEventListener("click", iniciarEdicionVentaUI); });
    document.querySelectorAll(".eliminar-venta").forEach(function(boton) { boton.addEventListener("click", eliminarVentaUI); });
    window.dispatchEvent(new Event("erp:data-updated"));
}
function restablecerFormularioVenta() {
    ventaEnEdicionId = null;
    const formulario = document.getElementById("form-venta");
    formulario.reset();
    document.getElementById("venta-fecha").value = fechaLocalISOVenta();
    document.getElementById("venta-tipo-cliente").value = "CONSUMIDOR_FINAL";
    document.getElementById("cuerpo-lineas-venta").innerHTML = "";
    actualizarCliente();
    nuevaFilaVenta();
    document.getElementById("guardar-venta").textContent = "Registrar venta";
    document.getElementById("cancelar-edicion-venta").classList.add("oculto");
    actualizarTotalesVenta();
}
async function iniciarEdicionVentaUI(evento) {
    const id = evento.currentTarget.dataset.id;
    const [ventas, movimientos] = await Promise.all([obtenerVentasBD(), obtenerMovimientosBD()]);
    const venta = ventas.find(function(item) { return String(item.id) === String(id); });
    if (!venta) return;
    try {
        validarPeriodosEditablesIVA(venta.fecha, venta.fecha, movimientos);
    } catch (error) {
        document.getElementById("mensaje-ventas").textContent = error.message;
        return;
    }
    ventaEnEdicionId = venta.id;
    await refrescarInventarioVenta();
    document.getElementById("venta-fecha").value = venta.fecha;
    document.getElementById("venta-documento").value = venta.documento;
    document.getElementById("venta-clase-documento").value = venta.claseDocumento || "";
    document.getElementById("venta-tipo-documento").value = venta.tipoDocumento || "";
    document.getElementById("venta-codigo-generacion").value = venta.codigoGeneracion || "";
    document.getElementById("venta-numero-control").value = venta.numeroControl || "";
    document.getElementById("venta-sello-recepcion").value = venta.selloRecepcion || "";
    document.getElementById("venta-hora-emision").value = venta.horaEmision || "";

    document.getElementById("venta-tipo-cliente").value = venta.tipoCliente;
    actualizarCliente();
    if (venta.tipoCliente === "CONTRIBUYENTE") {
        document.getElementById("venta-cliente").value = venta.nrc;
        actualizarCliente();
    }
    document.getElementById("cuerpo-lineas-venta").innerHTML = "";
    (venta.lineas || []).forEach(function(linea) { nuevaFilaVenta(linea); });
    if (!(venta.lineas || []).length) nuevaFilaVenta();
    document.getElementById("guardar-venta").textContent = "Guardar cambios";
    document.getElementById("cancelar-edicion-venta").classList.remove("oculto");
    document.getElementById("mensaje-ventas").textContent = "Editando venta " + venta.documento + ". Los cambios recalcularán ingreso, IVA, inventario, costo y F07.";
    document.getElementById("form-venta").scrollIntoView({ behavior: "smooth", block: "start" });
}
async function eliminarVentaUI(evento) {
    const boton = evento.currentTarget;
    const id = boton.dataset.id;
    const ventas = await obtenerVentasBD();
    const venta = ventas.find(function(v) { return String(v.id) === String(id); });
    if (!venta) return;
    if (!window.confirm("¿Eliminar la venta " + venta.documento + "?\n\nSe revertirán ingreso, IVA Débito Fiscal, salida de inventario y costo de ventas. Si el período ya tenía cierre de IVA, ese cierre será invalidado y deberá contabilizarse nuevamente.")) return;
    bloquearBotonVenta(boton, true);
    try {
        const resultado = await eliminarVenta(id);
        document.getElementById("mensaje-ventas").textContent = "Venta eliminada correctamente." + (resultado.cierreIVAEliminado ? " El cierre de IVA del período fue eliminado y debe generarse nuevamente." : "");
        await refrescarInventarioVenta();
        await refrescarVentas();
    } catch (error) {
        document.getElementById("mensaje-ventas").textContent = "No fue posible eliminar la venta: " + error.message;
        bloquearBotonVenta(boton, false);
    }
}
async function guardarVentaUI(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const boton = document.getElementById("guardar-venta");
    const tipo = document.getElementById("venta-tipo-cliente").value;
    const tercero = buscarTerceroPorNRC(tercerosVentas, document.getElementById("venta-cliente").value);
    bloquearBotonVenta(boton, true);
    try {
        const datosVenta = {
            fecha: document.getElementById("venta-fecha").value,
            documento: document.getElementById("venta-documento").value,
            claseDocumento: document.getElementById("venta-clase-documento").value,
            tipoDocumento: document.getElementById("venta-tipo-documento").value,
            codigoGeneracion: document.getElementById("venta-codigo-generacion").value,
            numeroControl: document.getElementById("venta-numero-control").value,
            selloRecepcion: document.getElementById("venta-sello-recepcion").value,
            horaEmision: document.getElementById("venta-hora-emision").value,

            tipoCliente: tipo,
            cliente: tercero?.razonSocial || "Consumidor final",
            nrc: tercero?.nrc || "",
            giro: tercero?.giro || "",
            lineas: obtenerLineasVentaUI()
        };
        const fueEdicion = Boolean(ventaEnEdicionId);
        if (fueEdicion) await editarVenta(ventaEnEdicionId, datosVenta);
        else await registrarVenta(datosVenta);
        document.getElementById("mensaje-ventas").textContent = fueEdicion ? "Venta actualizada; ingreso, IVA, inventario, costo y F07 fueron recalculados." : "Venta registrada; ingreso, IVA Débito Fiscal, inventario y costo de ventas fueron actualizados.";
        await refrescarInventarioVenta();
        restablecerFormularioVenta();
        await refrescarVentas();
    } catch (error) {
        document.getElementById("mensaje-ventas").textContent = error.message;
    } finally {
        bloquearBotonVenta(boton, false);
        actualizarTotalesVenta();
    }
}
async function importarVentasUI() {
    const boton = document.getElementById("importar-ventas");
    const input = document.getElementById("archivo-ventas");
    const archivo = input.files[0];
    if (!archivo) return;
    bloquearBotonVenta(boton, true);
    try {
        const objetos = convertirCSVAObjetos(await archivo.text());
        const resultados = await importarVentas(objetos);
        const ok = resultados.filter(function(r) { return r.ok; }).length;
        const errores = resultados.filter(function(r) { return !r.ok; });
        document.getElementById("resultado-importacion-ventas").innerHTML = `<strong>${ok} documentos importados.</strong>` + (errores.length ? `<ul>${errores.map(function(e) { return `<li>${escaparVenta(e.documento)}: ${escaparVenta(e.error)}</li>`; }).join("")}</ul>` : "");
        input.value = "";
        await refrescarInventarioVenta();
        await refrescarVentas();
    } catch (error) {
        document.getElementById("resultado-importacion-ventas").textContent = "No fue posible importar: " + error.message;
    } finally {
        bloquearBotonVenta(boton, false);
    }
}
async function iniciarVentas() {
    await abrirBaseDatos();
    tercerosVentas = await cargarCatalogoTerceros();
    llenarClientes();
    await refrescarInventarioVenta();
    document.getElementById("venta-fecha").value = fechaLocalISOVenta();
    document.getElementById("venta-tipo-cliente").addEventListener("change", actualizarCliente);
    document.getElementById("venta-cliente").addEventListener("change", actualizarCliente);
    document.getElementById("agregar-linea-venta").addEventListener("click", function() { nuevaFilaVenta(); });
    document.getElementById("form-venta").addEventListener("submit", guardarVentaUI);
    document.getElementById("importar-ventas").addEventListener("click", importarVentasUI);
    document.getElementById("cancelar-edicion-venta").addEventListener("click", restablecerFormularioVenta);
    actualizarCliente();
    nuevaFilaVenta();
    await refrescarVentas();
}
document.addEventListener("DOMContentLoaded", iniciarVentas);
