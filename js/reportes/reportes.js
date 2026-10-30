const cuerpoBalanza = document.getElementById("cuerpo-balanza");
const fechaDesdeReporte = document.getElementById("fecha-desde");
const fechaHastaReporte = document.getElementById("fecha-hasta");
const mensajeReporte = document.getElementById("mensaje-reporte");
const sinDatosReporte = document.getElementById("sin-datos-reporte");
const vistaBalanza = document.getElementById("vista-balanza");
const vistaEstadoFinanciero = document.getElementById("vista-estado-financiero");
const botonesReportes = document.querySelectorAll("[data-reporte]");
let cuentasReporte = [];
let movimientosReporte = [];
let tipoReporteActual = "balanza";
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
    return new Intl.NumberFormat("es-SV", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2
    }).format(Number(valor || 0));
}
function escaparTextoReporte(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = String(texto || "");
    return elemento.innerHTML;
}
async function cargarJSONReporte(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error("No se pudo cargar " + ruta + ".");
    return respuesta.json();
}
async function asegurarDatosReportes() {
    cuentasReporte = await obtenerCuentasBD();
    if (cuentasReporte.length === 0) {
        const cuentasIniciales = await cargarJSONReporte("datos/catalogo_cuentas.json");
        await guardarCuentasBD(cuentasIniciales);
        cuentasReporte = await obtenerCuentasBD();
    }
    movimientosReporte = await obtenerMovimientosBD();
    if (movimientosReporte.length === 0) {
        const movimientosIniciales = await cargarJSONReporte("datos/movimientos_iniciales.json");
        await guardarMovimientosBD(movimientosIniciales);
        movimientosReporte = await obtenerMovimientosBD();
    }
}
function crearFilaBalanza(cuenta) {
    return `<tr class="fila-cuenta-reporte" data-codigo="${escaparTextoReporte(cuenta.codigo)}" data-nombre="${escaparTextoReporte(cuenta.nombre)}" data-columnas="8" tabindex="0" aria-label="Ver movimientos de ${escaparTextoReporte(cuenta.nombre)}">
        <td>${escaparTextoReporte(cuenta.codigo)}</td>
        <td><span class="cuenta-reporte-enlace">${escaparTextoReporte(cuenta.nombre)}</span></td>
        <td>${escaparTextoReporte(cuenta.clasificacion)}</td>
        <td>${escaparTextoReporte(cuenta.naturaleza)}</td>
        <td>${formatearDineroReporte(cuenta.debe)}</td>
        <td>${formatearDineroReporte(cuenta.haber)}</td>
        <td>${formatearDineroReporte(cuenta.saldoDeudor)}</td>
        <td>${formatearDineroReporte(cuenta.saldoAcreedor)}</td>
    </tr>`;
}
function crearFilaEstado(cuenta) {
    return `<tr class="fila-cuenta-reporte" data-codigo="${escaparTextoReporte(cuenta.codigo)}" data-nombre="${escaparTextoReporte(cuenta.nombre)}" data-columnas="3" tabindex="0" aria-label="Ver movimientos de ${escaparTextoReporte(cuenta.nombre)}">
        <td>${escaparTextoReporte(cuenta.codigo)}</td>
        <td><span class="cuenta-reporte-enlace">${escaparTextoReporte(cuenta.nombre)}</span></td>
        <td>${formatearDineroReporte(cuenta.saldoNatural)}</td>
    </tr>`;
}
function crearSeccionEstado(titulo, cuentas, etiquetaTotal, total, filaAdicional) {
    const filas = cuentas.map(crearFilaEstado).join("");
    const vacio = filas || filaAdicional
        ? ""
        : '<tr><td colspan="3" class="estado-sin-cuentas">Sin cuentas con saldo</td></tr>';
    return `<article class="seccion-estado">
        <h3>${escaparTextoReporte(titulo)}</h3>
        <table class="tabla-estado">
            <thead><tr><th>Código</th><th>Cuenta</th><th>Saldo</th></tr></thead>
            <tbody>${filas}${vacio}${filaAdicional || ""}</tbody>
            <tfoot><tr><td colspan="2">${escaparTextoReporte(etiquetaTotal)}</td><td>${formatearDineroReporte(total)}</td></tr></tfoot>
        </table>
    </article>`;
}
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
            lineas.push({
                fecha: movimiento.fecha || "",
                numero: movimiento.numero || movimiento.referencia || ("JE-" + String(movimiento.id || "")),
                referencia: movimiento.referencia || "",
                concepto: movimiento.concepto || "Partida contable",
                descripcion: linea.descripcion || "",
                debe: Number(linea.debe || 0),
                haber: Number(linea.haber || 0),
                movimientoId: movimiento.id,
                origen: movimiento.origen || ""
            });
        });
    });
    return lineas.sort(function(a, b) {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
        return String(a.numero).localeCompare(String(b.numero));
    });
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
    const filas = lineas.length ? lineas.map(function(linea) {
        return `<tr>
            <td>${escaparTextoReporte(linea.fecha)}</td>
            <td>${escaparTextoReporte(linea.numero)}</td>
            <td>${escaparTextoReporte(linea.concepto)}</td>
            <td>${escaparTextoReporte(linea.descripcion || "—")}</td>
            <td>${formatearDineroReporte(linea.debe)}</td>
            <td>${formatearDineroReporte(linea.haber)}</td>
            <td>${linea.origen === "Compra" || linea.origen === "Venta" ? `<button type="button" class="boton-peligro eliminar-operacion-reporte" data-origen="${escaparTextoReporte(linea.origen)}" data-movimiento-id="${escaparTextoReporte(linea.movimientoId)}">Eliminar</button>` : "—"}</td>
        </tr>`;
    }).join("") : '<tr><td colspan="7" class="estado-sin-cuentas">No hay movimientos de esta cuenta en el período seleccionado.</td></tr>';
    const totalDebe = lineas.reduce(function(total, linea) { return total + linea.debe; }, 0);
    const totalHaber = lineas.reduce(function(total, linea) { return total + linea.haber; }, 0);
    return `<tr class="fila-detalle-cuenta-reporte"><td colspan="${columnas}">
        <section class="libro-cuenta-reporte">
            <div class="libro-cuenta-cabecera">
                <div><span>LIBRO DIARIO · CUENTA SELECCIONADA</span><h4>${escaparTextoReporte(codigo)} · ${escaparTextoReporte(nombre)}</h4></div>
                <small>${lineas.length} movimiento${lineas.length === 1 ? "" : "s"}</small>
            </div>
            <div class="libro-cuenta-tabla-contenedor">
                <table class="libro-cuenta-tabla">
                    <thead><tr><th>Fecha</th><th>Partida</th><th>Concepto</th><th>Descripción</th><th>Debe</th><th>Haber</th><th>Acción</th></tr></thead>
                    <tbody>${filas}</tbody>
                    <tfoot><tr><td colspan="4">Totales de la cuenta</td><td>${formatearDineroReporte(totalDebe)}</td><td>${formatearDineroReporte(totalHaber)}</td><td></td></tr></tfoot>
                </table>
            </div>
        </section>
    </td></tr>`;
}
function alternarDetalleCuentaReporte(fila) {
    const codigo = fila.dataset.codigo;
    const nombre = fila.dataset.nombre;
    const columnas = Number(fila.dataset.columnas || 3);
    const estabaSeleccionada = fila.classList.contains("seleccionada");
    cerrarDetalleCuentaReporte();
    if (estabaSeleccionada) return;
    fila.classList.add("seleccionada");
    fila.setAttribute("aria-expanded", "true");
    fila.insertAdjacentHTML("afterend", crearDetalleCuentaReporte(codigo, nombre, columnas));
    document.querySelectorAll(".eliminar-operacion-reporte").forEach(function(boton) {
        boton.addEventListener("click", eliminarOperacionDesdeReporte);
    });
}
async function eliminarOperacionDesdeReporte(evento) {
    evento.stopPropagation();
    const boton = evento.currentTarget;
    const origen = boton.dataset.origen;
    const movimientoId = Number(boton.dataset.movimientoId);
    if (!window.confirm("¿Eliminar esta " + origen.toLowerCase() + " y todos sus efectos contables, de inventario e IVA?")) return;
    try {
        const resultado = await eliminarOperacionComercialPorMovimiento(origen, movimientoId);
        mensajeReporte.textContent = origen + " eliminada correctamente." + (resultado.cierreIVAEliminado ? " El cierre de IVA del período quedó invalidado y fue eliminado." : "");
        mensajeReporte.className = "mensaje-reporte correcto";
        await generarReporteActualizado();
    } catch (error) {
        mensajeReporte.textContent = "No fue posible eliminar la operación: " + error.message;
        mensajeReporte.className = "mensaje-reporte error";
    }
}

function activarDetalleCuentaReporte() {
    document.querySelectorAll(".fila-cuenta-reporte").forEach(function(fila) {
        fila.setAttribute("aria-expanded", "false");
        fila.addEventListener("click", function() { alternarDetalleCuentaReporte(fila); });
        fila.addEventListener("keydown", function(evento) {
            if (evento.key === "Enter" || evento.key === " ") {
                evento.preventDefault();
                alternarDetalleCuentaReporte(fila);
            }
        });
    });
}
function actualizarResumenReporte(etiqueta1, valor1, detalle1, etiqueta2, valor2, detalle2, etiqueta3, valor3, detalle3) {
    document.getElementById("resumen-etiqueta-1").textContent = etiqueta1;
    document.getElementById("resumen-valor-1").textContent = valor1;
    document.getElementById("resumen-detalle-1").textContent = detalle1;
    document.getElementById("resumen-etiqueta-2").textContent = etiqueta2;
    document.getElementById("resumen-valor-2").textContent = valor2;
    document.getElementById("resumen-detalle-2").textContent = detalle2;
    document.getElementById("resumen-etiqueta-3").textContent = etiqueta3;
    document.getElementById("resumen-valor-3").textContent = valor3;
    document.getElementById("resumen-detalle-3").textContent = detalle3;
}
function actualizarPeriodoReporte() {
    const desde = fechaDesdeReporte.value;
    const hasta = fechaHastaReporte.value;
    let texto = "Período completo";
    if (tipoReporteActual === "balance") {
        texto = hasta ? "Al " + hasta : "A la fecha";
    } else if (desde && hasta) {
        texto = "Del " + desde + " al " + hasta;
    } else if (desde) {
        texto = "Desde " + desde;
    } else if (hasta) {
        texto = "Hasta " + hasta;
    }
    document.getElementById("periodo-reporte").textContent = texto;
}
function validarPeriodoReporte() {
    if (tipoReporteActual !== "balance" && fechaDesdeReporte.value &&
        fechaHastaReporte.value && fechaDesdeReporte.value > fechaHastaReporte.value) {
        throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
    }
}
function prepararVistaBalanza() {
    cerrarDetalleCuentaReporte();
    vistaBalanza.classList.remove("oculto");
    vistaEstadoFinanciero.classList.add("oculto");
    vistaEstadoFinanciero.innerHTML = "";
}
function prepararVistaEstado() {
    cerrarDetalleCuentaReporte();
    vistaBalanza.classList.add("oculto");
    vistaEstadoFinanciero.classList.remove("oculto");
}
function mostrarMensajeReporte(texto) {
    mensajeReporte.textContent = texto;
    mensajeReporte.className = "mensaje-reporte correcto";
}
function mostrarBalanza(balanza) {
    prepararVistaBalanza();
    cuerpoBalanza.innerHTML = balanza.cuentas.map(crearFilaBalanza).join("");
    document.getElementById("pie-total-debe").textContent = formatearDineroReporte(balanza.totalDebe);
    document.getElementById("pie-total-haber").textContent = formatearDineroReporte(balanza.totalHaber);
    document.getElementById("pie-saldo-deudor").textContent = formatearDineroReporte(balanza.totalSaldoDeudor);
    document.getElementById("pie-saldo-acreedor").textContent = formatearDineroReporte(balanza.totalSaldoAcreedor);
    actualizarResumenReporte(
        "Total Debe", formatearDineroReporte(balanza.totalDebe), "Movimientos del período",
        "Total Haber", formatearDineroReporte(balanza.totalHaber), "Movimientos del período",
        "Cuentas con movimiento", String(balanza.cuentas.length), "Solo cuentas auxiliares"
    );
    sinDatosReporte.style.display = balanza.cuentas.length === 0 ? "block" : "none";
    mostrarMensajeReporte("Balanza generada para " + balanza.cuentas.length + " cuentas con movimientos.");
    actualizarPeriodoReporte();
    activarDetalleCuentaReporte();
}
function mostrarEstadoResultados(estadoResultados) {
    prepararVistaEstado();
    const seccionIngresos = crearSeccionEstado(
        "Ingresos",
        estadoResultados.ingresos,
        "Total ingresos",
        estadoResultados.totalIngresos
    );
    const seccionGastos = crearSeccionEstado(
        "Gastos",
        estadoResultados.gastos,
        "Total gastos",
        estadoResultados.totalGastos
    );
    vistaEstadoFinanciero.innerHTML = `<div class="estado-resultados-contenido">
        ${seccionIngresos}
        ${seccionGastos}
        <div class="resultado-estado">
            <span>${escaparTextoReporte(estadoResultados.tipoResultado)}</span>
            <strong>${formatearDineroReporte(estadoResultados.resultadoNeto)}</strong>
        </div>
    </div>`;
    actualizarResumenReporte(
        "Ingresos", formatearDineroReporte(estadoResultados.totalIngresos), "Cuentas de naturaleza acreedora",
        "Gastos", formatearDineroReporte(estadoResultados.totalGastos), "Cuentas de naturaleza deudora",
        estadoResultados.tipoResultado, formatearDineroReporte(estadoResultados.resultadoNeto), "Ingresos menos gastos"
    );
    const cantidad = estadoResultados.ingresos.length + estadoResultados.gastos.length;
    sinDatosReporte.style.display = cantidad === 0 ? "block" : "none";
    mostrarMensajeReporte("Estado de resultados generado para " + cantidad + " cuentas.");
    actualizarPeriodoReporte();
    activarDetalleCuentaReporte();
}
function mostrarBalanceGeneral(balanceGeneral) {
    prepararVistaEstado();
    const filaResultado = `<tr class="fila-resultado-periodo">
        <td>—</td>
        <td>${escaparTextoReporte(balanceGeneral.tipoResultado)}</td>
        <td>${formatearDineroReporte(balanceGeneral.resultadoPeriodo)}</td>
    </tr>`;
    const seccionActivos = crearSeccionEstado(
        "Activo",
        balanceGeneral.activos,
        "Total activo",
        balanceGeneral.totalActivos
    );
    const seccionPasivos = crearSeccionEstado(
        "Pasivo",
        balanceGeneral.pasivos,
        "Total pasivo",
        balanceGeneral.totalPasivos
    );
    const seccionPatrimonio = crearSeccionEstado(
        "Patrimonio",
        balanceGeneral.patrimonio,
        "Total patrimonio y resultado",
        balanceGeneral.totalPatrimonioResultado,
        filaResultado
    );
    vistaEstadoFinanciero.innerHTML = `<div class="columnas-estados">
        <div>${seccionActivos}</div>
        <div>${seccionPasivos}${seccionPatrimonio}</div>
    </div>
    <div class="ecuacion-balance">
        <span>Total activo <strong>${formatearDineroReporte(balanceGeneral.totalActivos)}</strong></span>
        <span>Total pasivo + patrimonio <strong>${formatearDineroReporte(balanceGeneral.totalPasivoPatrimonio)}</strong></span>
    </div>`;
    actualizarResumenReporte(
        "Total activo", formatearDineroReporte(balanceGeneral.totalActivos), "Bienes y derechos",
        "Total pasivo", formatearDineroReporte(balanceGeneral.totalPasivos), "Obligaciones",
        "Patrimonio + resultado", formatearDineroReporte(balanceGeneral.totalPatrimonioResultado), "Participación residual"
    );
    const cantidad = balanceGeneral.activos.length + balanceGeneral.pasivos.length + balanceGeneral.patrimonio.length;
    sinDatosReporte.style.display = cantidad === 0 && balanceGeneral.resultadoPeriodo === 0 ? "block" : "none";
    mostrarMensajeReporte("Balance general generado.");
    actualizarPeriodoReporte();
    activarDetalleCuentaReporte();
}
function configurarInterfazReporte() {
    const configuraciones = {
        balanza: {
            titulo: "Balanza de comprobación",
            descripcion: "Movimientos y saldos de las cuentas contables.",
            detalle: "Detalle por cuenta",
            nota: "Los totales se calculan en centavos para evitar diferencias por decimales."
        },
        balance: {
            titulo: "Balance general",
            descripcion: "Activo, pasivo y patrimonio acumulados a una fecha.",
            detalle: "Situación financiera",
            nota: "El resultado acumulado se presenta dentro del patrimonio para completar la ecuación contable."
        },
        resultados: {
            titulo: "Estado de resultados",
            descripcion: "Ingresos, gastos y resultado neto del período.",
            detalle: "Rendimiento del período",
            nota: "El resultado neto corresponde a ingresos menos gastos."
        }
    };
    const configuracion = configuraciones[tipoReporteActual];
    document.getElementById("titulo-reporte-pagina").textContent = configuracion.titulo;
    document.getElementById("descripcion-reporte").textContent = configuracion.descripcion;
    document.getElementById("titulo-detalle-reporte").textContent = configuracion.detalle;
    document.getElementById("nota-reporte").textContent = configuracion.nota;
    const esBalance = tipoReporteActual === "balance";
    document.getElementById("campo-fecha-desde").classList.toggle("oculto", esBalance);
    document.getElementById("etiqueta-fecha-hasta").textContent = esBalance ? "Al" : "Hasta";
    if (esBalance) fechaDesdeReporte.value = "";
    botonesReportes.forEach(function(boton) {
        boton.classList.toggle("activo", boton.dataset.reporte === tipoReporteActual);
    });
}
function generarReporteConDatos() {
    validarPeriodoReporte();
    if (tipoReporteActual === "balance") {
        return generarBalanceGeneral(cuentasReporte, movimientosReporte, fechaHastaReporte.value);
    }
    if (tipoReporteActual === "resultados") {
        return generarEstadoResultados(
            cuentasReporte,
            movimientosReporte,
            fechaDesdeReporte.value,
            fechaHastaReporte.value
        );
    }
    return generarBalanzaComprobacion(
        cuentasReporte,
        movimientosReporte,
        fechaDesdeReporte.value,
        fechaHastaReporte.value
    );
}
function mostrarReporteCalculado(reporte) {
    verificarReporteAntesDeRender(reporte);
    mensajeReporte.textContent = "";
    mensajeReporte.className = "mensaje-reporte";
    if (tipoReporteActual === "balance") mostrarBalanceGeneral(reporte);
    else if (tipoReporteActual === "resultados") mostrarEstadoResultados(reporte);
    else mostrarBalanza(reporte);
}
function mostrarReporteDesdeProyeccion() {
    return generarReporteActualizado();
}
async function generarReporteActualizado(propagarError) {
    bloquearGeneracionReporte(true);
    try {
        movimientosReporte = await obtenerMovimientosBD();
        cuentasReporte = await obtenerCuentasBD();
        mostrarReporteCalculado(generarReporteConDatos());
    } catch (error) {
        mensajeReporte.textContent = error.message;
        mensajeReporte.className = "mensaje-reporte error";
        if (propagarError === true) throw error;
    } finally {
        bloquearGeneracionReporte(false);
    }
}
async function seleccionarReporte(evento) {
    tipoReporteActual = evento.currentTarget.dataset.reporte;
    configurarInterfazReporte();
    await generarReporteActualizado();
}
async function iniciarReportes() {
    try {
        await abrirBaseDatos();
        await asegurarDatosReportes();
        configurarInterfazReporte();
        await generarReporteActualizado();
    } catch (error) {
        cuerpoBalanza.innerHTML = "";
        vistaEstadoFinanciero.innerHTML = "";
        mensajeReporte.textContent = "No se pudo generar el reporte: " + error.message;
        mensajeReporte.className = "mensaje-reporte error";
    }
}
function refrescarReportesDesdeEvento() {return generarReporteActualizado(true);}
registrarConsumidorContable("reportes",refrescarReportesDesdeEvento);
botonesReportes.forEach(function(boton) {
    boton.addEventListener("click", seleccionarReporte);
});
document.getElementById("generar-reporte").addEventListener("click", generarReporteActualizado);
iniciarReportes();
