// Inicio fase 0: visor de reportes financieros (interfaz y orquestación). La estructura vive en reportes_estructura.js.
const fechaDesdeReporte = document.getElementById("fecha-desde");
const fechaHastaReporte = document.getElementById("fecha-hasta");
const presetReporte = document.getElementById("periodo-preset");
const compararReporte = document.getElementById("comparar-reporte");
const mensajeReporte = document.getElementById("mensaje-reporte");
const sinDatosReporte = document.getElementById("sin-datos-reporte");
const vistaEstadoFinanciero = document.getElementById("vista-estado-financiero");
const botonesReportes = document.querySelectorAll("[data-reporte]");
let cuentasReporte = [];
let movimientosReporte = [];
let tipoReporteActual = "balanza";
let estructuraReporteActual = null;
let solicitudReporte = 0;
const CONFIGURACION_REPORTES = Object.freeze({
    balanza: { titulo: "Balanza de comprobación", nota: "Sumas y saldos del período por cuenta auxiliar. Los totales se calculan en centavos." },
    resultados: { titulo: "Estado de resultados", nota: "Gastos clasificados por función: costo de ventas (cuentas 5) y gastos de operación (cuentas 6)." },
    balance: { titulo: "Balance general", nota: "Saldos acumulados a la fecha. La depreciación acumulada se presenta restando del activo; el resultado del ejercicio, dentro del patrimonio." }
});
// Fin fase 0
// Inicio fase 1: utilidades de la vista
function bloquearGeneracionReporte(bloqueado) {
    const boton = document.getElementById("generar-reporte");
    if (!boton) return;
    boton.disabled = Boolean(bloqueado);
    boton.setAttribute("aria-busy", bloqueado ? "true" : "false");
}
function verificarReporteAntesDeRender(reporte) {
    if (!reporte || !reporte.verificacion || reporte.verificacion.valido !== true || reporte.verificacion.niveles.length !== 3) {
        throw new Error("El reporte no superó la verificación matemática requerida.");
    }
    return true;
}
function formatearDineroReporte(valor) {
    return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(valor || 0));
}
function escaparTextoReporte(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = String(texto ?? "");
    return elemento.innerHTML;
}
function hoyReporte() {
    const f = new Date();
    return f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0") + "-" + String(f.getDate()).padStart(2, "0");
}
function nombresCuentasReporte() { return new Map(cuentasReporte.map(c => [String(c.codigo), c.nombre])); }
async function cargarJSONReporte(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error("No se pudo cargar " + ruta + ".");
    return respuesta.json();
}
async function asegurarDatosReportes() {
    cuentasReporte = await obtenerCuentasBD();
    if (cuentasReporte.length === 0) {
        await guardarCuentasBD(await cargarJSONReporte("datos/catalogo_cuentas.json"));
        cuentasReporte = await obtenerCuentasBD();
    }
    movimientosReporte = await obtenerMovimientosBD();
    if (movimientosReporte.length === 0) {
        await guardarMovimientosBD(await cargarJSONReporte("datos/movimientos_iniciales.json"));
        movimientosReporte = await obtenerMovimientosBD();
    }
}
// Fin fase 1
// Inicio fase 2: documento del reporte (tabla con jerarquía, subtotales y doble subrayado final)
function crearCeldaImporteReporte(renglonActual, columna) {
    const valor = renglonActual.valores ? renglonActual.valores[columna.clave] : undefined;
    if (valor === undefined || (valor === null && columna.clave === "variacionPct")) return '<td class="importe"></td>';
    let texto = formatoContableReporte(valor);
    if (columna.formato === "porcentaje") texto = formatoPorcentajeReporte(valor);
    if (renglonActual.formato === "porcentaje") texto = valor === null ? "—" : columna.clave === "variacion" ? (valor > 0 ? "+" : "") + valor.toFixed(1) + " pp" : valor.toFixed(1) + " %";
    return `<td class="importe">${escaparTextoReporte(texto)}</td>`;
}
function crearFilaReporte(renglonActual, columnas) {
    const celdas = columnas.map(c => crearCeldaImporteReporte(renglonActual, c)).join("");
    if (renglonActual.tipo === "cuenta" && renglonActual.codigo) {
        return `<tr class="renglon-cuenta fila-cuenta-reporte" data-codigo="${escaparTextoReporte(renglonActual.codigo)}" data-nombre="${escaparTextoReporte(renglonActual.etiqueta)}" data-columnas="${columnas.length + 1}" tabindex="0" aria-label="Ver movimientos de ${escaparTextoReporte(renglonActual.etiqueta)}"><td><span class="codigo-cuenta">${escaparTextoReporte(renglonActual.codigo)}</span><span class="nombre-cuenta">${escaparTextoReporte(renglonActual.etiqueta)}</span></td>${celdas}</tr>`;
    }
    if (renglonActual.tipo === "seccion") return `<tr class="renglon-seccion"><th scope="rowgroup" colspan="${columnas.length + 1}">${escaparTextoReporte(renglonActual.etiqueta)}</th></tr>`;
    const sangria = renglonActual.tipo === "cuenta" ? '<span class="codigo-cuenta"></span>' : "";
    return `<tr class="renglon-${renglonActual.tipo}"><td>${sangria}${escaparTextoReporte(renglonActual.etiqueta)}</td>${celdas}</tr>`;
}
function renderizarDocumentoReporte(estructura) {
    estructuraReporteActual = estructura;
    const encabezados = estructura.columnas.map(c => `<th scope="col" class="importe">${escaparTextoReporte(c.titulo)}</th>`).join("");
    vistaEstadoFinanciero.innerHTML = `<table class="tabla-reporte estado-financiero${estructura.comparar ? " comparativo" : ""}"><thead><tr><th scope="col">Cuenta</th>${encabezados}</tr></thead><tbody>${estructura.renglones.map(r => crearFilaReporte(r, estructura.columnas)).join("")}</tbody></table>`;
    const control = document.getElementById("control-reporte");
    control.className = "control-reporte " + (estructura.control.cuadra ? "cuadra" : "descuadre");
    control.textContent = (estructura.control.cuadra ? "✓ Cuadrado: " : "✕ Descuadre de " + formatoContableReporte(estructura.control.diferencia || 0) + ": ") + estructura.control.etiqueta;
    activarDetalleCuentaReporte();
}
// Fin fase 2
// Inicio fase 3: detalle por cuenta (Libro Diario de la cuenta seleccionada)
function movimientoEnPeriodoReporte(movimiento) {
    const fecha = String(movimiento.fecha || "");
    const desde = tipoReporteActual === "balance" ? "" : fechaDesdeReporte.value;
    const hasta = fechaHastaReporte.value;
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
}
function obtenerLineasCuentaReporte(codigo) {
    const lineas = [];
    movimientosReporte.forEach(function(movimiento) {
        if (!movimientoEnPeriodoReporte(movimiento)) return;
        (movimiento.partida || []).forEach(function(linea) {
            if (String(linea.codigo || "") !== String(codigo || "")) return;
            lineas.push({ fecha: movimiento.fecha || "", numero: movimiento.numero || movimiento.referencia || ("JE-" + String(movimiento.id || "")), referencia: movimiento.referencia || "",
                concepto: movimiento.concepto || "Partida contable", descripcion: linea.descripcion || "", debe: Number(linea.debe || 0), haber: Number(linea.haber || 0), movimientoId: movimiento.id, origen: movimiento.origen || "" });
        });
    });
    return lineas.sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.numero).localeCompare(String(b.numero)));
}
function cerrarDetalleCuentaReporte() {
    const actual = document.querySelector(".fila-detalle-cuenta-reporte");
    if (actual) actual.remove();
    document.querySelectorAll(".fila-cuenta-reporte.seleccionada").forEach(function(fila) {
        fila.classList.remove("seleccionada");
        fila.setAttribute("aria-expanded", "false");
    });
}
function crearDetalleCuentaReporte(codigo, nombre, columnas) {
    const lineas = obtenerLineasCuentaReporte(codigo);
    const cuenta = cuentasReporte.find(c => String(c.codigo) === String(codigo));
    const signo = cuenta && cuenta.naturaleza === "Acreedora" ? -1 : 1;
    let saldoCentavos = 0;
    const filas = lineas.length ? lineas.map(function(linea) {
        saldoCentavos += signo * (Math.round(linea.debe * 100) - Math.round(linea.haber * 100));
        return `<tr><td>${escaparTextoReporte(linea.fecha)}</td><td>${escaparTextoReporte(linea.numero)}</td><td>${escaparTextoReporte(linea.concepto)}</td><td>${escaparTextoReporte(linea.descripcion || "—")}</td><td class="importe">${formatearDineroReporte(linea.debe)}</td><td class="importe">${formatearDineroReporte(linea.haber)}</td><td class="importe">${formatoContableReporte(saldoCentavos / 100)}</td><td>${linea.origen === "Compra" || linea.origen === "Venta" ? `<button type="button" class="boton-peligro eliminar-operacion-reporte" data-origen="${escaparTextoReporte(linea.origen)}" data-movimiento-id="${escaparTextoReporte(linea.movimientoId)}">Eliminar</button>` : "—"}</td></tr>`;
    }).join("") : '<tr><td colspan="8" class="estado-sin-cuentas">No hay movimientos de esta cuenta en el período seleccionado.</td></tr>';
    const totalDebe = lineas.reduce((t, l) => t + l.debe, 0), totalHaber = lineas.reduce((t, l) => t + l.haber, 0);
    return `<tr class="fila-detalle-cuenta-reporte"><td colspan="${columnas}">
        <section class="libro-cuenta-reporte">
            <div class="libro-cuenta-cabecera"><div><span>Movimientos del Libro Diario</span><h4>${escaparTextoReporte(codigo)} · ${escaparTextoReporte(nombre)}</h4></div><small>${lineas.length} movimiento${lineas.length === 1 ? "" : "s"}</small></div>
            <div class="libro-cuenta-tabla-contenedor"><table class="libro-cuenta-tabla">
                <thead><tr><th scope="col">Fecha</th><th scope="col">Partida</th><th scope="col">Concepto</th><th scope="col">Descripción</th><th scope="col" class="importe">Debe</th><th scope="col" class="importe">Haber</th><th scope="col" class="importe">Saldo</th><th scope="col">Acción</th></tr></thead>
                <tbody>${filas}</tbody>
                <tfoot><tr><td colspan="4">Totales de la cuenta</td><td class="importe">${formatearDineroReporte(totalDebe)}</td><td class="importe">${formatearDineroReporte(totalHaber)}</td><td class="importe">${formatoContableReporte(saldoCentavos / 100)}</td><td></td></tr></tfoot>
            </table></div>
        </section>
    </td></tr>`;
}
function alternarDetalleCuentaReporte(fila) {
    const estabaSeleccionada = fila.classList.contains("seleccionada");
    cerrarDetalleCuentaReporte();
    if (estabaSeleccionada) return;
    fila.classList.add("seleccionada");
    fila.setAttribute("aria-expanded", "true");
    fila.insertAdjacentHTML("afterend", crearDetalleCuentaReporte(fila.dataset.codigo, fila.dataset.nombre, Number(fila.dataset.columnas || 2)));
    document.querySelectorAll(".eliminar-operacion-reporte").forEach(boton => boton.addEventListener("click", eliminarOperacionDesdeReporte));
}
async function eliminarOperacionDesdeReporte(evento) {
    evento.stopPropagation();
    const boton = evento.currentTarget, origen = boton.dataset.origen, movimientoId = Number(boton.dataset.movimientoId);
    if (!window.confirm("¿Eliminar esta " + origen.toLowerCase() + " y todos sus efectos contables, de inventario e IVA?")) return;
    try {
        const resultado = await eliminarOperacionComercialPorMovimiento(origen, movimientoId);
        await generarReporteActualizado();
        mostrarMensajeReporte(origen + " eliminada correctamente." + (resultado.cierreIVAEliminado ? " El cierre de IVA del período quedó invalidado y fue eliminado." : ""));
    } catch (error) {
        mostrarMensajeReporte("No fue posible eliminar la operación: " + error.message, "error");
    }
}
function activarDetalleCuentaReporte() {
    document.querySelectorAll(".fila-cuenta-reporte").forEach(function(fila) {
        fila.setAttribute("aria-expanded", "false");
        fila.addEventListener("click", () => alternarDetalleCuentaReporte(fila));
        fila.addEventListener("keydown", function(evento) {
            if (evento.key === "Enter" || evento.key === " ") { evento.preventDefault(); alternarDetalleCuentaReporte(fila); }
        });
    });
}
// Fin fase 3
// Inicio fase 4: cifras clave, período y cada reporte
function actualizarResumenReporte(etiqueta1, valor1, detalle1, etiqueta2, valor2, detalle2, etiqueta3, valor3, detalle3) {
    [[etiqueta1, valor1, detalle1], [etiqueta2, valor2, detalle2], [etiqueta3, valor3, detalle3]].forEach(function(v, i) {
        document.getElementById("resumen-etiqueta-" + (i + 1)).textContent = v[0];
        document.getElementById("resumen-valor-" + (i + 1)).textContent = v[1];
        document.getElementById("resumen-detalle-" + (i + 1)).textContent = v[2];
    });
}
function detalleComparativoReporte(actual, comparativo, alternativo) {
    if (comparativo === undefined) return alternativo;
    const v = variacionReporte(actual, comparativo);
    return (v.diferencia > 0 ? "▲ " : v.diferencia < 0 ? "▼ " : "") + (v.porcentaje === null ? formatoContableReporte(Math.abs(v.diferencia)) : Math.abs(v.porcentaje).toFixed(1) + " %") + " vs. comparativo";
}
function actualizarPeriodoReporte() {
    document.getElementById("periodo-reporte").textContent = etiquetaRangoReporte(tipoReporteActual, fechaDesdeReporte.value, fechaHastaReporte.value);
}
function validarPeriodoReporte() {
    if (tipoReporteActual !== "balance" && fechaDesdeReporte.value && fechaHastaReporte.value && fechaDesdeReporte.value > fechaHastaReporte.value) {
        throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
    }
}
function prepararVistaEstado() { cerrarDetalleCuentaReporte(); }
function mostrarMensajeReporte(texto, tipo) {
    mensajeReporte.textContent = texto || "";
    mensajeReporte.className = "mensaje-reporte" + (texto ? " " + (tipo || "correcto") : "");
}
function titulosColumnasReporte(rangoComparativo) {
    return [etiquetaColumnaReporte(tipoReporteActual, fechaDesdeReporte.value, fechaHastaReporte.value), rangoComparativo ? etiquetaColumnaReporte(tipoReporteActual, rangoComparativo.desde, rangoComparativo.hasta) : ""];
}
function mostrarBalanza(balanza) {
    prepararVistaEstado();
    renderizarDocumentoReporte(estructurarBalanzaReporte(balanza));
    actualizarResumenReporte("Total Debe", formatearDineroReporte(balanza.totalDebe), "Movimientos del período", "Total Haber", formatearDineroReporte(balanza.totalHaber), "Movimientos del período", "Cuentas con movimiento", String(balanza.cuentas.length), "Solo cuentas auxiliares");
    sinDatosReporte.style.display = balanza.cuentas.length === 0 ? "block" : "none";
}
function mostrarEstadoResultados(estadoResultados, comparativo, rangoComparativo) {
    prepararVistaEstado();
    const estructura = estructurarEstadoResultadosReporte(estadoResultados, comparativo, nombresCuentasReporte());
    const [actual, anterior] = titulosColumnasReporte(rangoComparativo);
    estructura.columnas = columnasComparativasReporte(actual, anterior, Boolean(comparativo));
    renderizarDocumentoReporte(estructura);
    const c = comparativo || {};
    actualizarResumenReporte("Ingresos", formatearDineroReporte(estadoResultados.totalIngresos), detalleComparativoReporte(estadoResultados.totalIngresos, c.totalIngresos, "Ventas del período"),
        "Costos y gastos", formatearDineroReporte(estadoResultados.totalGastos), detalleComparativoReporte(estadoResultados.totalGastos, c.totalGastos, "Costo de ventas y gastos de operación"),
        estadoResultados.tipoResultado, formatearDineroReporte(estadoResultados.resultadoNeto), detalleComparativoReporte(estadoResultados.resultadoNeto, c.resultadoNeto, "Ingresos menos costos y gastos"));
    sinDatosReporte.style.display = estadoResultados.ingresos.length + estadoResultados.gastos.length === 0 ? "block" : "none";
}
function mostrarBalanceGeneral(balanceGeneral, comparativo, rangoComparativo) {
    prepararVistaEstado();
    const estructura = estructurarBalanceGeneralReporte(balanceGeneral, comparativo, nombresCuentasReporte());
    const [actual, anterior] = titulosColumnasReporte(rangoComparativo);
    estructura.columnas = columnasComparativasReporte(actual, anterior, Boolean(comparativo));
    renderizarDocumentoReporte(estructura);
    const c = comparativo || {};
    actualizarResumenReporte("Total activo", formatearDineroReporte(balanceGeneral.totalActivos), detalleComparativoReporte(balanceGeneral.totalActivos, c.totalActivos, "Bienes y derechos"),
        "Total pasivo", formatearDineroReporte(balanceGeneral.totalPasivos), detalleComparativoReporte(balanceGeneral.totalPasivos, c.totalPasivos, "Obligaciones"),
        "Total patrimonio", formatearDineroReporte(balanceGeneral.totalPatrimonioResultado), detalleComparativoReporte(balanceGeneral.totalPatrimonioResultado, c.totalPatrimonioResultado, "Incluye el resultado del ejercicio"));
    sinDatosReporte.style.display = balanceGeneral.activos.length + balanceGeneral.pasivos.length + balanceGeneral.patrimonio.length === 0 && balanceGeneral.resultadoPeriodo === 0 ? "block" : "none";
}
// Fin fase 4
// Inicio fase 5: filtros, generación y acciones (exportar, imprimir)
function configurarInterfazReporte() {
    const esBalance = tipoReporteActual === "balance";
    document.getElementById("titulo-reporte-pagina").textContent = CONFIGURACION_REPORTES[tipoReporteActual].titulo;
    document.getElementById("nota-reporte").textContent = CONFIGURACION_REPORTES[tipoReporteActual].nota;
    document.getElementById("campo-fecha-desde").classList.toggle("oculto", esBalance);
    document.getElementById("campo-comparar").classList.toggle("oculto", tipoReporteActual === "balanza");
    document.getElementById("etiqueta-fecha-hasta").textContent = esBalance ? "Al" : "Hasta";
    botonesReportes.forEach(function(boton) {
        const activo = boton.dataset.reporte === tipoReporteActual;
        boton.classList.toggle("activo", activo);
        boton.setAttribute("aria-selected", activo ? "true" : "false");
    });
}
function aplicarPresetReporte() {
    const rango = rangoPresetReporte(presetReporte.value, hoyReporte());
    if (!rango) return;
    fechaDesdeReporte.value = rango.desde;
    fechaHastaReporte.value = rango.hasta;
}
function rangoComparativoActualReporte() {
    return rangoComparativoReporte(tipoReporteActual, fechaDesdeReporte.value, fechaHastaReporte.value, compararReporte.value, hoyReporte());
}
function generarReporteConDatos(rango) {
    const desde = rango ? rango.desde : fechaDesdeReporte.value, hasta = rango ? rango.hasta : fechaHastaReporte.value;
    if (!rango) validarPeriodoReporte();
    if (tipoReporteActual === "balance") return generarBalanceGeneral(cuentasReporte, movimientosReporte, hasta);
    if (tipoReporteActual === "resultados") return generarEstadoResultados(cuentasReporte, movimientosReporte, desde, hasta);
    return generarBalanzaComprobacion(cuentasReporte, movimientosReporte, desde, hasta);
}
function mostrarReporteCalculado(reporte, comparativo, rangoComparativo) {
    verificarReporteAntesDeRender(reporte);
    if (comparativo) verificarReporteAntesDeRender(comparativo);
    mostrarMensajeReporte("");
    if (tipoReporteActual === "balance") mostrarBalanceGeneral(reporte, comparativo, rangoComparativo);
    else if (tipoReporteActual === "resultados") mostrarEstadoResultados(reporte, comparativo, rangoComparativo);
    else mostrarBalanza(reporte);
    actualizarPeriodoReporte();
}
function mostrarReporteDesdeProyeccion() { return generarReporteActualizado(); }
async function generarReporteActualizado(propagarError) {
    const solicitud = ++solicitudReporte;
    bloquearGeneracionReporte(true);
    try {
        const [movimientos, cuentas] = await Promise.all([obtenerMovimientosBD(), obtenerCuentasBD()]);
        if (solicitud !== solicitudReporte) return;
        movimientosReporte = movimientos;
        cuentasReporte = cuentas;
        const rangoComparativo = rangoComparativoActualReporte();
        mostrarReporteCalculado(generarReporteConDatos(), rangoComparativo ? generarReporteConDatos(rangoComparativo) : null, rangoComparativo);
    } catch (error) {
        mostrarMensajeReporte(error.message, "error");
        if (propagarError === true) throw error;
    } finally {
        if (solicitud === solicitudReporte) bloquearGeneracionReporte(false);
    }
}
async function seleccionarReporte(evento) {
    tipoReporteActual = evento.currentTarget.dataset.reporte;
    configurarInterfazReporte();
    await generarReporteActualizado();
}
function exportarReporteCSV() {
    if (!estructuraReporteActual) return;
    const titulo = CONFIGURACION_REPORTES[tipoReporteActual].titulo;
    const nombre = titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_") + "_" + (fechaHastaReporte.value || hoyReporte()) + ".csv";
    descargarTexto(nombre, estructuraACSVReporte(estructuraReporteActual, titulo, document.getElementById("periodo-reporte").textContent), true);
}
async function iniciarReportes() {
    try {
        await abrirBaseDatos();
        await asegurarDatosReportes();
        aplicarPresetReporte();
        configurarInterfazReporte();
        await generarReporteActualizado();
    } catch (error) {
        vistaEstadoFinanciero.innerHTML = "";
        mostrarMensajeReporte("No se pudo generar el reporte: " + error.message, "error");
    }
}
function refrescarReportesDesdeEvento() { return generarReporteActualizado(true); }
registrarConsumidorContable("reportes", refrescarReportesDesdeEvento);
botonesReportes.forEach(boton => boton.addEventListener("click", seleccionarReporte));
presetReporte.addEventListener("change", function() { aplicarPresetReporte(); generarReporteActualizado(); });
[fechaDesdeReporte, fechaHastaReporte].forEach(campo => campo.addEventListener("change", function() { presetReporte.value = "personalizado"; generarReporteActualizado(); }));
compararReporte.addEventListener("change", () => generarReporteActualizado());
document.getElementById("generar-reporte").addEventListener("click", () => generarReporteActualizado());
document.getElementById("exportar-reporte").addEventListener("click", exportarReporteCSV);
document.getElementById("imprimir-reporte").addEventListener("click", () => window.print());
iniciarReportes();
// Fin fase 5
