const cuerpoDepreciacion = document.getElementById("cuerpo-depreciacion");
const encabezadoMesesDepreciacion = document.getElementById("encabezado-meses-depreciacion");
const fechaCorteDepreciacion = document.getElementById("fecha-corte-depreciacion");
const anioDepreciacion = document.getElementById("anio-depreciacion");
const mensajeDepreciacion = document.getElementById("mensaje-depreciacion");
const botonContabilizarDepreciacion = document.getElementById("contabilizar-depreciacion");
const sinActivosDepreciacion = document.getElementById("depreciacion-sin-activos");
const totalActivosDepreciacion = document.getElementById("depreciacion-total-activos");
const totalCostoDepreciacion = document.getElementById("depreciacion-costo-total");
const totalAcumuladaDepreciacion = document.getElementById("depreciacion-acumulada-total");
const totalLibrosDepreciacion = document.getElementById("depreciacion-libros-total");
const MESES_DEPRECIACION = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
let activosDepreciacion = [];

/* FASE UI 01 — Formato/escape: sin cálculo contable. */
function dineroDepreciacion(centavos) {
    return "$" + (Number(centavos || 0) / 100).toFixed(2);
}
function fechaLocalDepreciacion() {
    const ahora = new Date();
    return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function escaparDepreciacion(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = String(texto || "");
    return elemento.innerHTML;
}

/* FASE UI 02 — Entrada: solo recuperar y reconstruir activos. */
async function cargarActivosDepreciacion() {
    activosDepreciacion = extraerActivosFijosDesdeMovimientos(await obtenerMovimientosBD());
    return activosDepreciacion;
}

/* FASE UI 03 — Años: solo poblar el selector. */
function prepararAniosDepreciacion() {
    const actual = Number(fechaCorteDepreciacion.value.slice(0, 4)) || new Date().getFullYear();
    let minimo = actual;
    let maximo = actual;
    activosDepreciacion.forEach(function(activo) {
        const calendario = generarCalendarioDepreciacion(activo).calendario;
        if (!calendario.length) return;
        minimo = Math.min(minimo, Number(calendario[0].periodo.slice(0, 4)));
        maximo = Math.max(maximo, Number(calendario[calendario.length - 1].periodo.slice(0, 4)));
    });
    const seleccionado = Number(anioDepreciacion.value) || actual;
    anioDepreciacion.innerHTML = "";
    for (let anio = minimo; anio <= maximo; anio++) {
        const opcion = document.createElement("option");
        opcion.value = String(anio);
        opcion.textContent = String(anio);
        if (anio === seleccionado) opcion.selected = true;
        anioDepreciacion.appendChild(opcion);
    }
    if (!anioDepreciacion.value) anioDepreciacion.value = String(actual);
}

/* FASE UI 04 — Cálculo verificado: el DOM recibe únicamente resultados que superaron 3 controles. */
function calcularFilasDepreciacionParaRender(fechaCorte, anio, fechaSistema) {
    return activosDepreciacion.map(function(activo) {
        const corte = calcularDepreciacionAFecha(activo, fechaCorte, fechaSistema);
        if (!corte.verificacion || !corte.verificacion.valido || corte.verificacion.niveles.length !== 3) throw new Error("No se renderizará un cálculo de depreciación sin triple verificación.");
        const calendario = new Map(corte.calendario.map(function(item) { return [item.periodo, item]; }));
        const meses = MESES_DEPRECIACION.map(function(_, indice) {
            const periodo = String(anio) + "-" + String(indice + 1).padStart(2, "0");
            const dato = calendario.get(periodo);
            return dato && periodoCerradoAFecha(periodo, corte.fechaCorteEfectiva) ? dato.montoCentavos : null;
        });
        return { activo, corte, meses };
    });
}
function calcularTotalesDepreciacion(filas) {
    return filas.reduce(function(totales, fila) {
        totales.costo += Number(fila.activo.costoCentavos || 0);
        totales.acumulada += Number(fila.corte.depreciacionAcumuladaCentavos || 0);
        totales.libros += Number(fila.corte.valorLibrosCentavos || 0);
        return totales;
    }, { costo: 0, acumulada: 0, libros: 0 });
}
function construirHtmlFilaDepreciacion(fila) {
    const activo = fila.activo;
    const corte = fila.corte;
    const meses = fila.meses.map(function(monto) { return `<td>${monto === null ? "—" : dineroDepreciacion(monto)}</td>`; }).join("");
    return `
        <td><strong>${escaparDepreciacion(activo.codigoActivo)}</strong></td>
        <td>${escaparDepreciacion(activo.nombre)}</td>
        <td>${escaparDepreciacion(activo.categoria)}</td>
        <td>${escaparDepreciacion(activo.fechaDisponibleUso)}</td>
        <td>${dineroDepreciacion(activo.costoCentavos)}</td>
        <td>${activo.vidaUtilAnios} años</td>
        <td>${dineroDepreciacion(corte.cuotaMensualCentavos)}</td>
        ${meses}
        <td>${dineroDepreciacion(corte.depreciacionAcumuladaCentavos)}</td>
        <td>${dineroDepreciacion(corte.valorLibrosCentavos)}</td>
    `;
}
function renderizarFilasDepreciacion(filas) {
    cuerpoDepreciacion.innerHTML = "";
    filas.forEach(function(fila) {
        const tr = document.createElement("tr");
        tr.innerHTML = construirHtmlFilaDepreciacion(fila);
        cuerpoDepreciacion.appendChild(tr);
    });
}

function renderizarPortafolioDepreciacion(filas) {
    const contenedor = document.getElementById("depreciacion-portafolio");
    if (!contenedor) return;
    contenedor.innerHTML = filas.length ? filas.map(function(fila) {
        const costo = Math.max(1, Number(fila.activo.costoCentavos || 0));
        const acumulada = Math.max(0, Number(fila.corte.depreciacionAcumuladaCentavos || 0));
        const porcentaje = Math.min(100, acumulada / costo * 100);
        return `<div class="asset-card"><div class="asset-card-head"><div><strong>${escaparDepreciacion(fila.activo.nombre)}</strong><small>${escaparDepreciacion(fila.activo.codigoActivo)} · ${escaparDepreciacion(fila.activo.categoria)}</small></div><span>${porcentaje.toFixed(1)}%</span></div><div class="asset-progress"><i style="width:${porcentaje.toFixed(2)}%"></i></div><div class="asset-meta"><span>Costo <b>${dineroDepreciacion(fila.activo.costoCentavos)}</b></span><span>Acumulada <b>${dineroDepreciacion(acumulada)}</b></span><span>Libros <b>${dineroDepreciacion(fila.corte.valorLibrosCentavos)}</b></span></div></div>`;
    }).join("") : '<p class="dashboard-vacio">Sin activos fijos registrados.</p>';
}

function renderizarTotalesDepreciacion(filas) {
    const totales = calcularTotalesDepreciacion(filas);
    totalActivosDepreciacion.textContent = String(filas.length);
    totalCostoDepreciacion.textContent = dineroDepreciacion(totales.costo);
    totalAcumuladaDepreciacion.textContent = dineroDepreciacion(totales.acumulada);
    totalLibrosDepreciacion.textContent = dineroDepreciacion(totales.libros);
    sinActivosDepreciacion.style.display = filas.length ? "none" : "block";
}
function renderizarDepreciacion() {
    const fechaSistema = fechaLocalDepreciacion(); /* Snapshot único compartido por todas las filas. */
    const fechaCorte = fechaCorteDepreciacion.value;
    const anio = Number(anioDepreciacion.value);
    encabezadoMesesDepreciacion.innerHTML = MESES_DEPRECIACION.map(function(mes) { return `<th>${mes}</th>`; }).join("");
    const filas = calcularFilasDepreciacionParaRender(fechaCorte, anio, fechaSistema);
    renderizarFilasDepreciacion(filas);
    renderizarTotalesDepreciacion(filas);
    renderizarPortafolioDepreciacion(filas);
}

/* FASE UI 05 — Orquestación: captura errores sin mezclar lógica matemática. */
async function actualizarDepreciacionUI() {
    mensajeDepreciacion.textContent = "";
    try {
        await cargarActivosDepreciacion();
        prepararAniosDepreciacion();
        renderizarDepreciacion();
    } catch (error) {
        mensajeDepreciacion.textContent = error.message;
        mensajeDepreciacion.className = "mensaje-movimiento error";
    }
}

/* FASE UI 06 — Persistencia explícita: delega al dominio; luego recalcula y renderiza. */
async function contabilizarDepreciacionAlCorte() {
    mensajeDepreciacion.textContent = "";
    botonContabilizarDepreciacion.disabled = true;
    try {
        const resultado = await sincronizarDepreciacionAutomatica(fechaCorteDepreciacion.value);
        await cargarActivosDepreciacion();
        prepararAniosDepreciacion();
        renderizarDepreciacion();
        mensajeDepreciacion.textContent = resultado.creadas
            ? "Se generaron " + resultado.creadas + " partida(s) automática(s) de depreciación hasta el último período cerrado al " + resultado.fechaCorteEfectiva + "."
            : "No hay cuotas pendientes: solo se contabilizan meses cerrados hasta " + resultado.fechaCorteEfectiva + ".";
        mensajeDepreciacion.className = "mensaje-movimiento exito";
    } catch (error) {
        mensajeDepreciacion.textContent = error.message;
        mensajeDepreciacion.className = "mensaje-movimiento error";
    } finally {
        botonContabilizarDepreciacion.disabled = false;
    }
}

/* FASE UI 07 — Inicialización: conectar controles y abrir BD. */
async function iniciarDepreciacionUI() {
    const hoy = fechaLocalDepreciacion();
    fechaCorteDepreciacion.max = hoy;
    fechaCorteDepreciacion.value = hoy;
    await abrirBaseDatos();
    await actualizarDepreciacionUI();
}
document.getElementById("actualizar-depreciacion").addEventListener("click", actualizarDepreciacionUI);
botonContabilizarDepreciacion.addEventListener("click", contabilizarDepreciacionAlCorte);
fechaCorteDepreciacion.addEventListener("change", function() { prepararAniosDepreciacion(); renderizarDepreciacion(); });
anioDepreciacion.addEventListener("change", renderizarDepreciacion);
iniciarDepreciacionUI().catch(function(error) {
    mensajeDepreciacion.textContent = error.message;
    mensajeDepreciacion.className = "mensaje-movimiento error";
});
