// Inicio fase 0: capa de presentación del Libro Diario (DOM, formularios y mensajes). Sin reglas contables ni IndexedDB.
const listaMovimientos = document.getElementById("lista-movimientos");
const buscador = document.getElementById("buscador");
const filtroTipo = document.getElementById("filtro-tipo");
const botonAgregar = document.getElementById("boton-agregar");
const botonImportar = document.getElementById("boton-importar");
const sinResultados = document.getElementById("sin-resultados");
const dialogoMovimiento = document.getElementById("dialogo-movimiento");
const formularioMovimiento = document.getElementById("formulario-movimiento");
const mensajeMovimiento = document.getElementById("mensaje-movimiento");
const cuerpoLineas = document.getElementById("lineas-partida");
const totalDebeFormulario = document.getElementById("total-debe-formulario");
const totalHaberFormulario = document.getElementById("total-haber-formulario");
const diferenciaFormulario = document.getElementById("diferencia-formulario");
const estadoBalance = document.getElementById("estado-balance");
let contadorFilas = 0;
// Fin fase 0
// Inicio fase 1: formato y escape para la vista
function escaparTexto(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = String(texto || "");
    return elemento.innerHTML;
}

function escaparAtributo(texto) {
    return escaparTexto(texto).replace(/"/g, "&quot;");
}

function convertirDinero(valor) {
    return "$" + Number(valor || 0).toFixed(2);
}

function centavosADinero(centavos) {
    return convertirDinero(Number(centavos || 0) / 100);
}
function mostrarFecha(fecha) {
    const partes = String(fecha || "").split("-");
    return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : fecha;
}
// Fin fase 1
// Inicio fase 2: listado de partidas
function crearLineasPartida(partida) {
    return partida.map(function(linea) {
        const descripcion = linea.descripcion
            ? `<small>${escaparTexto(linea.descripcion)}</small>`
            : "";
        const inventario = linea.tipoInventario
            ? `<small>${escaparTexto(linea.tipoInventario + " · " + linea.sku + " · " + linea.cantidadInventario + " u.")}</small>`
            : "";
        const activoFijo = linea.activoFijo
            ? `<small>${escaparTexto("AF " + linea.activoFijo.codigoActivo + " · " + linea.activoFijo.categoria + " · uso " + linea.activoFijo.fechaDisponibleUso)}</small>`
            : "";

        return `
            <div class="fila-partida">
                <span class="cuenta-detalle">
                    ${escaparTexto(linea.codigo + " - " + linea.cuenta)}
                    ${descripcion}
                    ${inventario}
                    ${activoFijo}
                </span>
                <span>${convertirDinero(linea.debe)}</span>
                <span>${convertirDinero(linea.haber)}</span>
            </div>
        `;
    }).join("");
}

function crearMovimiento(movimiento) {
    const totalDebe = calcularTotal(movimiento.partida, "debe");
    const totalHaber = calcularTotal(movimiento.partida, "haber");
    const balanceada = Math.abs(totalDebe - totalHaber) < 0.001;
    const puedeEliminar = esOrigenEditable(movimiento.origen);
    const acciones = puedeEliminar
        ? `
            <div class="acciones-partida-guardada">
                <button class="boton-editar-partida" type="button" data-id="${movimiento.id}">
                    Editar partida
                </button>
                <button class="eliminar-partida" type="button" data-id="${movimiento.id}">
                    Eliminar partida
                </button>
            </div>
        `
        : "";

    return `
        <article class="movimiento">
            <button class="resumen-movimiento" type="button" data-id="${movimiento.id}">
                <span class="concepto">
                    <small>
                        ${escaparTexto(movimiento.numero)} ·
                        ${mostrarFecha(movimiento.fecha)} ·
                        ${escaparTexto(movimiento.referencia || "Sin referencia")} ·
                        ${escaparTexto(movimiento.origen)}
                    </small>
                    <strong>${escaparTexto(movimiento.concepto)}</strong>
                </span>
                <span class="entrada">${convertirDinero(totalDebe)}</span>
                <span class="salida">${convertirDinero(totalHaber)}</span>
                <span class="flecha">▼</span>
            </button>

            <div class="detalle-partida" id="partida-${movimiento.id}">
                <div class="titulo-partida">
                    <h3>${escaparTexto(movimiento.numero)} · Partida doble</h3>
                    <span>${balanceada ? "✓ Balanceada" : "✕ No balanceada"}</span>
                </div>
                <div class="fila-partida titulos-partida">
                    <span>Cuenta</span><span>Debe</span><span>Haber</span>
                </div>
                ${crearLineasPartida(movimiento.partida)}
                <div class="fila-partida total-partida">
                    <span>Total</span>
                    <span>${convertirDinero(totalDebe)}</span>
                    <span>${convertirDinero(totalHaber)}</span>
                </div>
                ${acciones}
            </div>
        </article>
    `;
}
function actualizarResumen() {
    let totalDebeCentavos = 0;
    let totalHaberCentavos = 0;
    movimientos.forEach(function(movimiento) {
        totalDebeCentavos += valorACentavos(calcularTotal(movimiento.partida, "debe"));
        totalHaberCentavos += valorACentavos(calcularTotal(movimiento.partida, "haber"));
    });
    document.getElementById("resumen-entradas").textContent = centavosADinero(totalDebeCentavos);
    document.getElementById("resumen-salidas").textContent = centavosADinero(totalHaberCentavos);
    document.getElementById("resumen-neto").textContent = movimientos.length;
}

function filtrarMovimientos() {
    const texto = buscador.value.toLowerCase().trim();
    const origen = filtroTipo.value;

    return movimientos.filter(function(movimiento) {
        const contenido = [
            movimiento.numero,
            movimiento.concepto,
            movimiento.referencia,
            movimiento.origen
        ].join(" ").toLowerCase();
        const coincideTexto = contenido.includes(texto);
        const coincideOrigen = origen === "Todos" || movimiento.origen === origen;
        return coincideTexto && coincideOrigen;
    });
}
function mostrarMovimientos() {
    ordenarMovimientos();
    const filtrados = filtrarMovimientos();
    listaMovimientos.innerHTML = filtrados.map(crearMovimiento).join("");
    sinResultados.style.display = filtrados.length === 0 ? "block" : "none";
    actualizarResumen();
    activarAcordeones();
}

function activarAcordeones() {
    document.querySelectorAll(".resumen-movimiento").forEach(function(boton) {
        boton.addEventListener("click", function() {
            const detalle = document.getElementById("partida-" + boton.dataset.id);
            const flecha = boton.querySelector(".flecha");
            detalle.classList.toggle("abierto");
            flecha.textContent = detalle.classList.contains("abierto") ? "▲" : "▼";
        });
    });

    document.querySelectorAll(".boton-editar-partida").forEach(function(boton) {
        boton.addEventListener("click", editarPartida);
    });
    document.querySelectorAll(".eliminar-partida").forEach(function(boton) {
        boton.addEventListener("click", eliminarPartida);
    });
}
async function eliminarPartida(evento) {
    const id = Number(evento.currentTarget.dataset.id);
    const movimiento = await obtenerPartidaActualizada(id);
    if (!movimiento) return;
    if (!window.confirm("¿Eliminar la partida " + movimiento.numero + "?\n\nEsta acción retirará la partida del Libro Diario.")) return;
    const resultado = await ejecutarEliminacionPartida(id);
    if (resultado.error) window.alert("No fue posible eliminar la partida: " + resultado.error);
    mostrarMovimientos();
}
// Fin fase 2
// Inicio fase 3: formulario de captura y edición
function opcionesCuentas(codigoSeleccionado) {
    const opciones = cuentasDisponibles.map(function(cuenta) {
        const seleccionada = cuenta.codigo === codigoSeleccionado ? "selected" : "";
        return `<option value="${cuenta.codigo}" ${seleccionada}>${cuenta.codigo} - ${escaparTexto(cuenta.nombre)}</option>`;
    }).join("");

    return '<option value="">Seleccionar cuenta</option>' + opciones;
}

function agregarLineaFormulario(linea) {
    contadorFilas++;
    const datos = linea || {};
    const fila = document.createElement("tr");
    fila.dataset.fila = contadorFilas;
    fila.dataset.codigoActivo = datos.activoFijo && datos.activoFijo.codigoActivo
        ? String(datos.activoFijo.codigoActivo)
        : String(datos.codigoActivo || "");
    fila.innerHTML = `
        <td class="numero-linea"></td>
        <td>
            <select class="linea-cuenta">${opcionesCuentas(datos.codigo || "")}</select>
        </td>
        <td>
            <input class="linea-descripcion" maxlength="100" value="${escaparAtributo(datos.descripcion || "")}" placeholder="Descripción">
        </td>
        <td>
            <select class="linea-tipo-inventario">
                <option value="">—</option>
                <option value="Entrada" ${datos.tipoInventario === "Entrada" ? "selected" : ""}>Entrada</option>
                <option value="Salida" ${datos.tipoInventario === "Salida" ? "selected" : ""}>Salida</option>
            </select>
        </td>
        <td><input class="linea-sku" maxlength="30" value="${escaparAtributo(datos.sku || "")}" placeholder="MAT-001"></td>
        <td><input class="linea-cantidad-inventario" type="number" min="0" step="any" value="${datos.cantidadInventario || ""}" placeholder="0"></td>
        <td><input class="linea-fecha-uso" type="date" value="${escaparAtributo((datos.activoFijo && datos.activoFijo.fechaDisponibleUso) || datos.fechaDisponibleUso || "")}"></td>
        <td><input class="linea-valor-residual" type="number" min="0" step="0.01" value="${datos.activoFijo ? depreciacionADolares(datos.activoFijo.valorResidualCentavos || 0) : (datos.valorResidual || "")}" placeholder="0.00"></td>
        <td>
            <input class="linea-debe monto-linea" type="number" min="0" step="0.01" value="${datos.debe || ""}" placeholder="0.00">
        </td>
        <td>
            <input class="linea-haber monto-linea" type="number" min="0" step="0.01" value="${datos.haber || ""}" placeholder="0.00">
        </td>
        <td>
            <button class="eliminar-linea" type="button" title="Eliminar línea">×</button>
        </td>
    `;

    function actualizarModoActivoFijoFila() {
        const codigo = fila.querySelector(".linea-cuenta").value;
        const esActivo = esCuentaActivoFijo(codigo);
        const fechaUso = fila.querySelector(".linea-fecha-uso");
        const residual = fila.querySelector(".linea-valor-residual");
        fechaUso.disabled = !esActivo;
        residual.disabled = !esActivo;
        if (!esActivo) {
            fechaUso.value = "";
            residual.value = "";
        } else if (!fechaUso.value) {
            fechaUso.value = document.getElementById("movimiento-fecha").value || fechaLocalActual();
        }
    }

    function actualizarModoInventarioFila() {
        const esInventario = fila.querySelector(".linea-cuenta").value === CUENTA_INVENTARIO_MATERIALES;
        const tipo = fila.querySelector(".linea-tipo-inventario");
        const sku = fila.querySelector(".linea-sku");
        const cantidad = fila.querySelector(".linea-cantidad-inventario");
        tipo.disabled = !esInventario;
        sku.disabled = !esInventario;
        cantidad.disabled = !esInventario;
        if (!esInventario) {
            tipo.value = "";
            sku.value = "";
            cantidad.value = "";
            fila.querySelector(".linea-haber").readOnly = false;
            return;
        }
        if (tipo.value === "Salida") {
            fila.querySelector(".linea-debe").value = "";
            fila.querySelector(".linea-haber").value = "";
            fila.querySelector(".linea-haber").readOnly = true;
        } else {
            fila.querySelector(".linea-haber").readOnly = false;
        }
        actualizarTotalesFormulario();
    }

    fila.querySelector(".linea-cuenta").addEventListener("change", function() { actualizarModoInventarioFila(); actualizarModoActivoFijoFila(); });
    fila.querySelector(".linea-tipo-inventario").addEventListener("change", actualizarModoInventarioFila);
    fila.querySelector(".linea-debe").addEventListener("input", function(evento) {
        if (valorACentavos(evento.target.value) > 0) fila.querySelector(".linea-haber").value = "";
        actualizarTotalesFormulario();
    });
    fila.querySelector(".linea-haber").addEventListener("input", function(evento) {
        if (valorACentavos(evento.target.value) > 0) fila.querySelector(".linea-debe").value = "";
        actualizarTotalesFormulario();
    });
    fila.querySelector(".eliminar-linea").addEventListener("click", function() {
        if (cuerpoLineas.querySelectorAll("tr").length <= 2) {
            mostrarErrorFormulario("Una partida debe conservar al menos dos líneas.");
            return;
        }
        fila.remove();
        numerarFilas();
        actualizarTotalesFormulario();
    });

    cuerpoLineas.appendChild(fila);
    actualizarModoInventarioFila();
    actualizarModoActivoFijoFila();
    numerarFilas();
    actualizarTotalesFormulario();
}
function numerarFilas() {
    cuerpoLineas.querySelectorAll("tr").forEach(function(fila, indice) {
        fila.querySelector(".numero-linea").textContent = indice + 1;
    });
}

function obtenerTotalesFormulario() {
    let debe = 0;
    let haber = 0;

    cuerpoLineas.querySelectorAll("tr").forEach(function(fila) {
        debe += valorACentavos(fila.querySelector(".linea-debe").value);
        haber += valorACentavos(fila.querySelector(".linea-haber").value);
    });

    return { debe: debe, haber: haber, diferencia: debe - haber };
}

function actualizarTotalesFormulario() {
    const totales = obtenerTotalesFormulario();
    totalDebeFormulario.textContent = centavosADinero(totales.debe);
    totalHaberFormulario.textContent = centavosADinero(totales.haber);
    diferenciaFormulario.textContent = centavosADinero(Math.abs(totales.diferencia));

    const balanceada = totales.debe > 0 && totales.diferencia === 0;
    estadoBalance.className = balanceada
        ? "estado-balance balanceada"
        : "estado-balance pendiente";
}

function fechaLocalActual() {
    const ahora = new Date();
    return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
}
function configurarModoEdicionFormulario(esEdicion) {
    const titulo = dialogoMovimiento.querySelector(".encabezado-dialogo h2");
    const botonGuardarNueva = formularioMovimiento.querySelector('button[type="submit"][value="nueva"]');
    if (titulo) titulo.textContent = esEdicion ? "Editar partida de diario" : "Nueva partida de diario";
    if (botonGuardarNueva) botonGuardarNueva.style.display = esEdicion ? "none" : "";
}

function reiniciarFormularioPartida() {
    establecerPartidaEnEdicion(null);
    formularioMovimiento.reset();
    cuerpoLineas.innerHTML = "";
    contadorFilas = 0;
    document.getElementById("movimiento-fecha").value = fechaLocalActual();
    document.getElementById("movimiento-numero").value = sugerirNumeroPartida();
    mensajeMovimiento.textContent = "";
    mensajeMovimiento.className = "mensaje-movimiento";
    configurarModoEdicionFormulario(false);
    agregarLineaFormulario();
    agregarLineaFormulario();
}

function abrirFormularioMovimiento() {
    reiniciarFormularioPartida();
    dialogoMovimiento.showModal();
}

function cargarMovimientoEnFormulario(movimiento) {
    establecerPartidaEnEdicion(movimiento.id);
    formularioMovimiento.reset();
    cuerpoLineas.innerHTML = "";
    contadorFilas = 0;
    document.getElementById("movimiento-fecha").value = movimiento.fecha || "";
    document.getElementById("movimiento-numero").value = movimiento.numero || "";
    document.getElementById("movimiento-referencia").value = movimiento.referencia || "";
    document.getElementById("movimiento-concepto").value = movimiento.concepto || "";
    (movimiento.partida || []).forEach(function(linea) {
        agregarLineaFormulario(linea);
    });
    while (cuerpoLineas.querySelectorAll("tr").length < 2) agregarLineaFormulario();
    mensajeMovimiento.textContent = "";
    mensajeMovimiento.className = "mensaje-movimiento";
    configurarModoEdicionFormulario(true);
    actualizarTotalesFormulario();
}

function editarPartida(evento) {
    const id = Number(evento.currentTarget.dataset.id);
    const movimiento = movimientos.find(function(item) {
        return Number(item.id) === id;
    });
    if (!movimiento || !esOrigenEditable(movimiento.origen)) return;
    cargarMovimientoEnFormulario(movimiento);
    dialogoMovimiento.showModal();
}

function cerrarFormularioMovimiento() {
    establecerPartidaEnEdicion(null);
    configurarModoEdicionFormulario(false);
    dialogoMovimiento.close();
}

function mostrarErrorFormulario(mensaje) {
    mensajeMovimiento.textContent = mensaje;
    mensajeMovimiento.className = "mensaje-movimiento error";
}
// Fin fase 3
// Inicio fase 4: entrada del usuario y respuesta visual
function recibirDatosMovimiento() {
    const valor = (selector, raiz) => (raiz || document).querySelector(selector).value;
    return normalizarEntradaPartida({
        fecha: valor("#movimiento-fecha"), numero: valor("#movimiento-numero"), referencia: valor("#movimiento-referencia"), concepto: valor("#movimiento-concepto"),
        lineas: Array.from(cuerpoLineas.querySelectorAll("tr")).map(function(fila) {
            return { codigo: valor(".linea-cuenta", fila), descripcion: valor(".linea-descripcion", fila), tipoInventario: valor(".linea-tipo-inventario", fila), sku: valor(".linea-sku", fila),
                cantidadInventario: valor(".linea-cantidad-inventario", fila), fechaDisponibleUso: valor(".linea-fecha-uso", fila), valorResidual: valor(".linea-valor-residual", fila),
                codigoActivo: fila.dataset.codigoActivo, debe: valor(".linea-debe", fila), haber: valor(".linea-haber", fila) };
        })
    });
}
async function registrarMovimiento(evento) {
    evento.preventDefault();
    mensajeMovimiento.textContent = "";
    const resultado = await ejecutarRegistroPartida(recibirDatosMovimiento());
    if (resultado.error) {
        mostrarErrorFormulario(resultado.error);
        return;
    }
    buscador.value = "";
    filtroTipo.value = "Todos";
    mostrarMovimientos();
    const accion = resultado.edicion ? "cerrar" : (evento.submitter ? evento.submitter.value : "cerrar");
    if (accion === "nueva") {
        reiniciarFormularioPartida();
        mensajeMovimiento.textContent = "Partida guardada correctamente.";
        mensajeMovimiento.className = "mensaje-movimiento correcto";
    } else {
        cerrarFormularioMovimiento();
    }
}
function bloquearAccionesLibroDiario(bloquear) {
    botonAgregar.disabled = bloquear;
    botonImportar.disabled = bloquear;
}
function mostrarErrorCargaLibroDiario() {
    listaMovimientos.innerHTML = '<p class="error-carga">No se pudieron cargar los datos. Ejecute el proyecto con Live Server.</p>';
}
buscador.addEventListener("input", mostrarMovimientos);
filtroTipo.addEventListener("change", mostrarMovimientos);
botonAgregar.addEventListener("click", abrirFormularioMovimiento);
document.getElementById("cerrar-dialogo").addEventListener("click", cerrarFormularioMovimiento);
document.getElementById("cancelar-movimiento").addEventListener("click", cerrarFormularioMovimiento);
document.getElementById("agregar-linea").addEventListener("click", function() { agregarLineaFormulario(); });
formularioMovimiento.addEventListener("submit", registrarMovimiento);
// Fin fase 4
