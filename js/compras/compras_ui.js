let tercerosCompras = [];
let compraEnEdicionId = null;

function dineroCompra(v) { return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(Number(v || 0)); }
function nuevaFilaCompra(datos) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><input class="compra-sku" value="${datos?.sku || ""}" required></td>
        <td><input class="compra-descripcion" value="${datos?.descripcion || ""}" required></td>
        <td><input class="compra-cantidad" type="number" min="0.01" step="0.01" value="${datos?.cantidad || 1}" required></td>
        <td><input class="compra-monto" type="number" min="0.01" step="0.01" value="${datos?.montoGravado || ""}" required></td>
        <td><button type="button" class="boton-icono eliminar-linea">×</button></td>`;
    tr.querySelector(".eliminar-linea").addEventListener("click", function() { tr.remove(); actualizarTotalesCompra(); });
    tr.querySelectorAll("input").forEach(function(i) { i.addEventListener("input", actualizarTotalesCompra); });
    document.getElementById("cuerpo-lineas-compra").appendChild(tr);
    actualizarTotalesCompra();
}
function obtenerLineasCompraUI() {
    return Array.from(document.querySelectorAll("#cuerpo-lineas-compra tr")).map(function(tr) {
        return {
            sku: tr.querySelector(".compra-sku").value,
            descripcion: tr.querySelector(".compra-descripcion").value,
            cantidad: tr.querySelector(".compra-cantidad").value,
            montoGravado: tr.querySelector(".compra-monto").value
        };
    });
}
function actualizarTotalesCompra() {
    try {
        const resumen = calcularResumenCompra(obtenerLineasCompraUI(), { estricto: false });
        if (!resumen.verificacion?.valido || resumen.verificacion.niveles.length !== 3) {
            throw new Error("No se renderizarán totales sin triple verificación.");
        }
        document.getElementById("compra-base").textContent = dineroCompra(resumen.base);
        document.getElementById("compra-iva").textContent = dineroCompra(resumen.iva);
        document.getElementById("compra-total").textContent = dineroCompra(resumen.total);
    } catch (error) {
        document.getElementById("compra-base").textContent = dineroCompra(0);
        document.getElementById("compra-iva").textContent = dineroCompra(0);
        document.getElementById("compra-total").textContent = dineroCompra(0);
    }
}
function llenarProveedores() {
    const select = document.getElementById("compra-proveedor");
    select.innerHTML = '<option value="">Seleccione proveedor</option>' + tercerosCompras.map(function(t) {
        return `<option value="${t.nrc}">${t.razonSocial} · NRC ${t.nrc}</option>`;
    }).join("");
}
function actualizarProveedor() {
    const t = buscarTerceroPorNRC(tercerosCompras, document.getElementById("compra-proveedor").value);
    document.getElementById("compra-nrc").value = t?.nrc || "";
    document.getElementById("compra-giro").value = t?.giro || "";
}
function ordenarComprasParaUI(compras) {
    return (compras || []).slice().sort(function(a, b) {
        return String(b.fecha || "").localeCompare(String(a.fecha || "")) || String(b.id || "").localeCompare(String(a.id || ""));
    });
}
async function refrescarCompras() {
    const compras = ordenarComprasParaUI(await obtenerComprasBD());
    document.getElementById("compras-registradas").innerHTML = compras.map(function(c) {
        return `<tr><td>${c.fecha}</td><td>${c.documento}</td><td>${c.proveedor}</td><td>${c.nrc}</td><td>${dineroCompra(c.comprasGravadas)}</td><td>${dineroCompra(c.ivaCredito)}</td><td>${dineroCompra(c.total)}</td><td><div class="acciones-fila"><button type="button" class="boton-secundario-azul editar-compra" data-id="${c.id}">Editar</button><button type="button" class="boton-peligro eliminar-compra" data-id="${c.id}">Eliminar</button></div></td></tr>`;
    }).join("");
    document.getElementById("sin-compras").style.display = compras.length ? "none" : "block";
    document.querySelectorAll(".editar-compra").forEach(function(boton) { boton.addEventListener("click", iniciarEdicionCompraUI); });
    document.querySelectorAll(".eliminar-compra").forEach(function(boton) {
        boton.addEventListener("click", eliminarCompraUI);
    });
    window.dispatchEvent(new Event("erp:data-updated"));
}
function bloquearBotonCompra(boton, bloqueado) {
    if (!boton) return;
    boton.disabled = Boolean(bloqueado);
    boton.setAttribute("aria-busy", bloqueado ? "true" : "false");
}
function restablecerFormularioCompra() {
    compraEnEdicionId = null;
    const formulario = document.getElementById("form-compra");
    formulario.reset();
    document.getElementById("compra-fecha").value = fechaLocalISOCompra();
    document.getElementById("cuerpo-lineas-compra").innerHTML = "";
    nuevaFilaCompra();
    actualizarProveedor();
    document.getElementById("guardar-compra").textContent = "Registrar compra";
    document.getElementById("cancelar-edicion-compra").classList.add("oculto");
    actualizarTotalesCompra();
}
async function iniciarEdicionCompraUI(evento) {
    const id = evento.currentTarget.dataset.id;
    const [compras, movimientos] = await Promise.all([obtenerComprasBD(), obtenerMovimientosBD()]);
    const compra = compras.find(function(item) { return String(item.id) === String(id); });
    if (!compra) return;
    try {
        validarPeriodosEditablesIVA(compra.fecha, compra.fecha, movimientos);
    } catch (error) {
        document.getElementById("mensaje-compras").textContent = error.message;
        return;
    }
    compraEnEdicionId = compra.id;
    document.getElementById("compra-fecha").value = compra.fecha;
    document.getElementById("compra-documento").value = compra.documento;
    document.getElementById("compra-clase-documento").value = compra.claseDocumento || "";
    document.getElementById("compra-tipo-documento").value = compra.tipoDocumento || "";
    document.getElementById("compra-codigo-generacion").value = compra.codigoGeneracion || "";
    document.getElementById("compra-numero-control").value = compra.numeroControl || "";
    document.getElementById("compra-sello-recepcion").value = compra.selloRecepcion || "";
    document.getElementById("compra-hora-emision").value = compra.horaEmision || "";

    document.getElementById("compra-proveedor").value = compra.nrc;
    actualizarProveedor();
    document.getElementById("cuerpo-lineas-compra").innerHTML = "";
    (compra.lineas || []).forEach(function(linea) { nuevaFilaCompra(linea); });
    if (!(compra.lineas || []).length) nuevaFilaCompra();
    document.getElementById("guardar-compra").textContent = "Guardar cambios";
    document.getElementById("cancelar-edicion-compra").classList.remove("oculto");
    document.getElementById("mensaje-compras").textContent = "Editando compra " + compra.documento + ". Los cambios recalcularán inventario, IVA, diario y F07.";
    document.getElementById("form-compra").scrollIntoView({ behavior: "smooth", block: "start" });
}
async function eliminarCompraUI(evento) {
    const boton = evento.currentTarget;
    const id = boton.dataset.id;
    const compras = await obtenerComprasBD();
    const compra = compras.find(function(item) { return String(item.id) === String(id); });
    if (!compra) return;
    if (!window.confirm("¿Eliminar la compra " + compra.documento + " de " + compra.proveedor + "?\n\nSe eliminarán también su partida contable, IVA Crédito Fiscal y efecto de inventario. Si el período ya tenía cierre de IVA, ese cierre será invalidado y deberá contabilizarse nuevamente.")) return;
    bloquearBotonCompra(boton, true);
    try {
        const resultado = await eliminarCompra(id);
        document.getElementById("mensaje-compras").textContent = "Compra eliminada correctamente." + (resultado.cierreIVAEliminado ? " El cierre de IVA del período fue eliminado y debe generarse nuevamente." : "");
        await refrescarCompras();
    } catch (error) {
        document.getElementById("mensaje-compras").textContent = "No fue posible eliminar la compra: " + error.message;
        bloquearBotonCompra(boton, false);
    }
}
async function guardarCompraUI(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const boton = document.getElementById("guardar-compra");
    const tercero = buscarTerceroPorNRC(tercerosCompras, document.getElementById("compra-proveedor").value);
    bloquearBotonCompra(boton, true);
    try {
        const datosCompra = {
            fecha: document.getElementById("compra-fecha").value,
            documento: document.getElementById("compra-documento").value,
            claseDocumento: document.getElementById("compra-clase-documento").value,
            tipoDocumento: document.getElementById("compra-tipo-documento").value,
            codigoGeneracion: document.getElementById("compra-codigo-generacion").value,
            numeroControl: document.getElementById("compra-numero-control").value,
            selloRecepcion: document.getElementById("compra-sello-recepcion").value,
            horaEmision: document.getElementById("compra-hora-emision").value,

            proveedor: tercero?.razonSocial,
            nrc: tercero?.nrc,
            giro: tercero?.giro,
            lineas: obtenerLineasCompraUI()
        };
        const fueEdicion = Boolean(compraEnEdicionId);
        if (fueEdicion) await editarCompra(compraEnEdicionId, datosCompra);
        else await registrarCompra(datosCompra);
        document.getElementById("mensaje-compras").textContent = fueEdicion
            ? "Compra actualizada; inventario, IVA, diario y F07 fueron recalculados."
            : "Compra registrada; inventario e IVA Crédito Fiscal fueron actualizados.";
        restablecerFormularioCompra();
        await refrescarCompras();
    } catch (error) {
        document.getElementById("mensaje-compras").textContent = error.message;
    } finally {
        bloquearBotonCompra(boton, false);
        actualizarTotalesCompra();
    }
}

async function importarComprasUI() {
    const boton = document.getElementById("importar-compras");
    const input = document.getElementById("archivo-compras");
    const archivo = input.files[0];
    if (!archivo) return;
    bloquearBotonCompra(boton, true);
    try {
        const objetos = convertirCSVAObjetos(await archivo.text());
        const resultados = await importarCompras(objetos);
        const ok = resultados.filter(function(r){return r.ok;}).length;
        const errores = resultados.filter(function(r){return !r.ok;});
        document.getElementById("resultado-importacion-compras").innerHTML = `<strong>${ok} documentos importados.</strong>` + (errores.length ? `<ul>${errores.map(function(e){return `<li>${e.documento}: ${e.error}</li>`;}).join("")}</ul>` : "");
        input.value = "";
        await refrescarCompras();
    } catch (error) {
        document.getElementById("resultado-importacion-compras").textContent = "No fue posible importar: " + error.message;
    } finally {
        bloquearBotonCompra(boton, false);
    }
}
function fechaLocalISOCompra() {
    const fecha = new Date();
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
}
async function iniciarCompras() {
    await abrirBaseDatos();
    tercerosCompras = await cargarCatalogoTerceros();
    llenarProveedores();
    document.getElementById("compra-fecha").value = fechaLocalISOCompra();
    document.getElementById("compra-proveedor").addEventListener("change", actualizarProveedor);
    document.getElementById("agregar-linea-compra").addEventListener("click", function(){ nuevaFilaCompra(); });
    document.getElementById("form-compra").addEventListener("submit", guardarCompraUI);
    document.getElementById("importar-compras").addEventListener("click", importarComprasUI);
    document.getElementById("cancelar-edicion-compra").addEventListener("click", restablecerFormularioCompra);
    nuevaFilaCompra();
    actualizarProveedor();
    await refrescarCompras();
}
document.addEventListener("DOMContentLoaded", iniciarCompras);
