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

let cuentasDisponibles = [];
let contadorFilas = 0;
let movimientoEditandoId = null;
const telemetriaMovimientos = {
    procesadas: 0,
    rechazadas: 0,
    fase: "Esperando entrada",
    resultado: "Sin operaciones"
};
function actualizarTelemetriaMovimiento(fase, resultado, rechazada) {
    telemetriaMovimientos.fase = fase;
    telemetriaMovimientos.resultado = resultado;
    if (rechazada === true) telemetriaMovimientos.rechazadas++;
    if (rechazada === false) telemetriaMovimientos.procesadas++;
}
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

function valorACentavos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 0;
    return Math.round(numero * 100);
}
function fechaEsValida(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const partes = fecha.split("-").map(Number);
    const fechaUTC = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));
    return fechaUTC.getUTCFullYear() === partes[0] &&
        fechaUTC.getUTCMonth() === partes[1] - 1 &&
        fechaUTC.getUTCDate() === partes[2];
}
function mostrarFecha(fecha) {
    const partes = String(fecha || "").split("-");
    return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : fecha;
}

function calcularTotal(partida, columna) {
    const centavos = partida.reduce(function(total, linea) {
        return total + valorACentavos(linea[columna]);
    }, 0);
    return centavos / 100;
}

function siguienteIdMovimiento() {
    return movimientos.reduce(function(idMayor, movimiento) {
        return Math.max(idMayor, Number(movimiento.id) || 0);
    }, 0) + 1;
}

function normalizarMovimientoExistente(movimiento) {
    return {
        ...movimiento,
        numero: movimiento.numero || movimiento.referencia || "JE-" + String(movimiento.id).padStart(4, "0"),
        referencia: movimiento.referencia || "",
        concepto: movimiento.concepto || "Partida contable",
        origen: movimiento.origen || "Demostración",
        partida: (movimiento.partida || []).map(function(linea) {
            return {
                ...linea,
                descripcion: linea.descripcion || ""
            };
        })
    };
}

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
    const puedeEliminar = movimiento.origen === "Manual" || movimiento.origen === "CSV";
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

function ordenarMovimientos() {
    movimientos.sort(function(a, b) {
        return b.fecha.localeCompare(a.fecha) || Number(b.id) - Number(a.id);
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
    const movimiento = movimientos.find(function(item) {
        return Number(item.id) === id;
    });
    if (!movimiento) return;
    const confirmada = window.confirm(
        "¿Eliminar la partida " + movimiento.numero + "?\n\n" +
        "Esta acción retirará la partida del Libro Diario."
    );
    if (!confirmada) return;
    try {
        await eliminarMovimientoBD(id);
        const verificacion = await obtenerMovimientoBD(id);
        if (verificacion) throw new Error("La partida continúa almacenada.");
        const restantes = movimientos.filter(function(item) { return Number(item.id) !== id; });
        try {
            await reconstruirInventarioDesdeMovimientos(restantes);
        } catch (errorInventario) {
            await guardarMovimientoBD(movimiento).catch(function() {});
            await reconstruirInventarioDesdeMovimientos(movimientos).catch(function() {});
            throw errorInventario;
        }
        await publicarEventoContable(
            TIPOS_EVENTOS.PARTIDA_ELIMINADA,
            "movimiento",
            movimiento.id,
            {
                numero: movimiento.numero,
                fecha: movimiento.fecha
            }
        );
        const posicion = movimientos.findIndex(function(item) {
            return Number(item.id) === id;
        });
        if (posicion !== -1) movimientos.splice(posicion, 1);
        mostrarMovimientos();
    } catch (error) {
        window.alert("No fue posible eliminar la partida: " + error.message);
    }
}

async function cargarJSON(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error("No se pudo cargar " + ruta);
    return respuesta.json();
}

async function prepararCuentas() {
    let cuentas = await obtenerCuentasBD();
    const cuentasIniciales = await cargarJSON("datos/catalogo_cuentas.json");

    if (!Array.isArray(cuentasIniciales)) {
        throw new Error("El catálogo inicial no contiene una lista válida.");
    }
    if (cuentas.length === 0) {
        cuentas = cuentasIniciales;
        await guardarCuentasBD(cuentas);
    } else {
        const codigosGuardados = new Set(cuentas.map(function(cuenta) {
            return cuenta.codigo;
        }));
        const cuentasFaltantes = cuentasIniciales.filter(function(cuenta) {
            return !codigosGuardados.has(cuenta.codigo);
        });

        if (cuentasFaltantes.length > 0) {
            await guardarCuentasBD(cuentasFaltantes);
            cuentas = cuentas.concat(cuentasFaltantes);
        }
    }

    cuentasDisponibles = cuentas
        .filter(function(cuenta) { return cuenta.permiteMovimientos; })
        .sort(function(a, b) { return a.codigo.localeCompare(b.codigo); });
}

async function prepararMovimientos() {
    let guardados = await obtenerMovimientosBD();

    if (guardados.length === 0) {
        guardados = await cargarJSON("datos/movimientos_iniciales.json");
        guardados = guardados.map(normalizarMovimientoExistente);
        await guardarMovimientosBD(guardados);
    } else {
        guardados = guardados.map(normalizarMovimientoExistente);
    }

    sincronizarMovimientos(guardados);
}

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

function sugerirNumeroPartida() {
    const siguiente = siguienteIdMovimiento();
    return "JE-" + String(siguiente).padStart(4, "0");
}

function configurarModoEdicionFormulario(esEdicion) {
    const titulo = dialogoMovimiento.querySelector(".encabezado-dialogo h2");
    const botonGuardarNueva = formularioMovimiento.querySelector('button[type="submit"][value="nueva"]');
    if (titulo) titulo.textContent = esEdicion ? "Editar partida de diario" : "Nueva partida de diario";
    if (botonGuardarNueva) botonGuardarNueva.style.display = esEdicion ? "none" : "";
}

function reiniciarFormularioPartida() {
    movimientoEditandoId = null;
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
    movimientoEditandoId = Number(movimiento.id);
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
    if (!movimiento || !["Manual", "CSV"].includes(movimiento.origen)) return;
    cargarMovimientoEnFormulario(movimiento);
    dialogoMovimiento.showModal();
}

function cerrarFormularioMovimiento() {
    movimientoEditandoId = null;
    configurarModoEdicionFormulario(false);
    dialogoMovimiento.close();
}

function mostrarErrorFormulario(mensaje) {
    mensajeMovimiento.textContent = mensaje;
    mensajeMovimiento.className = "mensaje-movimiento error";
}

/*
FASE 1
A. Objetivo: recibir una partida manual desde el formulario.
B. Entrada (Zero-Trust): encabezado y líneas ingresados por el usuario.
C. Validación: todavía no se aprueba ningún valor.
D. Procesamiento: normalizar texto y convertir importes a centavos.
E. Decisión: enviar una estructura uniforme a la fase 2.
F. Recuperación: sustituir campos ausentes por valores controlados.
G. Verificación: devolver siempre encabezado y colección de líneas.
H. Telemetría: registrar el inicio de la captura.
*/
function recibirDatosMovimiento() {
    actualizarTelemetriaMovimiento("1. Entrada Zero-Trust", "Datos recibidos");
    const lineas = Array.from(cuerpoLineas.querySelectorAll("tr")).map(function(fila) {
        return {
            codigo: String(fila.querySelector(".linea-cuenta").value || "").trim(),
            descripcion: String(fila.querySelector(".linea-descripcion").value || "").trim(),
            tipoInventario: String(fila.querySelector(".linea-tipo-inventario").value || "").trim(),
            sku: String(fila.querySelector(".linea-sku").value || "").trim(),
            cantidadInventario: Number(fila.querySelector(".linea-cantidad-inventario").value || 0),
            fechaDisponibleUso: String(fila.querySelector(".linea-fecha-uso").value || "").trim(),
            valorResidualCentavos: valorACentavos(fila.querySelector(".linea-valor-residual").value),
            codigoActivo: String(fila.dataset.codigoActivo || "").trim(),
            debeCentavos: valorACentavos(fila.querySelector(".linea-debe").value),
            haberCentavos: valorACentavos(fila.querySelector(".linea-haber").value)
        };
    });

    return {
        fecha: String(document.getElementById("movimiento-fecha").value || "").trim(),
        numero: String(document.getElementById("movimiento-numero").value || "").trim(),
        referencia: String(document.getElementById("movimiento-referencia").value || "").trim(),
        concepto: String(document.getElementById("movimiento-concepto").value || "").trim(),
        lineas: lineas
    };
}

/*
FASE 2
A. Objetivo: impedir el registro de partidas contables inválidas.
B. Entrada (Zero-Trust): partida normalizada, todavía no confiable.
C. Validación: fecha real, campos, duplicados, cuentas, importes y balance.
D. Procesamiento: filtrar líneas vacías y sumar en centavos.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: mantener formulario, memoria e IndexedDB sin cambios.
G. Verificación: Debe y Haber deben ser positivos e iguales.
H. Telemetría: registrar aprobación o causa de rechazo.
*/
function validarDatosMovimiento(datos) {
    let error = "";
    if (!fechaEsValida(datos.fecha)) {
        error = "Seleccione una fecha válida.";
    } else if (datos.numero.length < 3) {
        error = "Ingrese un número de partida.";
    } else if (datos.concepto.length < 3) {
        error = "El concepto debe contener al menos 3 caracteres.";
    }
    const numeroExiste = movimientos.some(function(movimiento) {
        return Number(movimiento.id) !== Number(movimientoEditandoId) &&
            movimiento.numero.toLowerCase() === datos.numero.toLowerCase();
    });
    if (!error && numeroExiste) error = "El número de partida ya existe.";
    if (!error && datos.referencia) {
        const referenciaExiste = movimientos.some(function(movimiento) {
            return Number(movimiento.id) !== Number(movimientoEditandoId) &&
                movimiento.referencia &&
                movimiento.referencia.toLowerCase() === datos.referencia.toLowerCase();
        });
        if (referenciaExiste) error = "La referencia ya fue utilizada.";
    }
    const lineasConContenido = datos.lineas.filter(function(linea) {
        return linea.codigo || linea.descripcion || linea.tipoInventario || linea.sku || linea.cantidadInventario || linea.fechaDisponibleUso || linea.valorResidualCentavos || linea.debeCentavos || linea.haberCentavos;
    });
    if (!error && lineasConContenido.length < 2) {
        error = "La partida debe contener al menos dos líneas.";
    }
    for (let indice = 0; !error && indice < lineasConContenido.length; indice++) {
        const linea = lineasConContenido[indice];
        const cuenta = cuentasDisponibles.find(function(item) {
            return item.codigo === linea.codigo;
        });
        if (!cuenta) {
            error = "Seleccione una cuenta auxiliar válida en la línea " + (indice + 1) + ".";
        }
        if (!error && (linea.tipoInventario || linea.sku || linea.cantidadInventario)) {
            if (linea.codigo !== CUENTA_INVENTARIO_MATERIALES) {
                error = "Los datos de inventario solo corresponden a la cuenta 1104, línea " + (indice + 1) + ".";
            } else if (!["Entrada", "Salida"].includes(linea.tipoInventario)) {
                error = "Seleccione Entrada o Salida en la línea " + (indice + 1) + ".";
            } else if (!linea.sku) {
                error = "Ingrese el SKU en la línea " + (indice + 1) + ".";
            } else if (!(linea.cantidadInventario > 0)) {
                error = "Ingrese una cantidad de inventario mayor que cero en la línea " + (indice + 1) + ".";
            }
        }
        const esActivoFijo = esCuentaActivoFijo(linea.codigo);
        if (!error && esActivoFijo) {
            if (!linea.descripcion) {
                error = "Ingrese el nombre/descripción del activo fijo en la línea " + (indice + 1) + ".";
            } else if (linea.debeCentavos <= 0 || linea.haberCentavos > 0) {
                error = "La adquisición de activo fijo debe registrarse al Debe en la línea " + (indice + 1) + ".";
            } else if (!fechaEsValida(linea.fechaDisponibleUso)) {
                error = "Ingrese la fecha disponible para uso en la línea " + (indice + 1) + ".";
            } else if (linea.fechaDisponibleUso < datos.fecha) {
                error = "La fecha disponible para uso no puede ser anterior a la fecha de adquisición en la línea " + (indice + 1) + ".";
            } else if (linea.valorResidualCentavos < 0 || linea.valorResidualCentavos >= linea.debeCentavos) {
                error = "El valor residual debe ser menor que el costo del activo en la línea " + (indice + 1) + ".";
            }
        }
        if (!error && !esActivoFijo && (linea.fechaDisponibleUso || linea.valorResidualCentavos > 0)) {
            error = "Los datos de depreciación solo corresponden a cuentas de Activo Fijo en la línea " + (indice + 1) + ".";
        }
        if (!error && linea.debeCentavos > 0 && linea.haberCentavos > 0) {
            error = "La línea " + (indice + 1) + " no puede contener Debe y Haber simultáneamente.";
        }
        const salidaInventarioPendiente = linea.codigo === CUENTA_INVENTARIO_MATERIALES &&
            linea.tipoInventario === "Salida" && linea.sku && linea.cantidadInventario > 0;
        if (!error && linea.debeCentavos <= 0 && linea.haberCentavos <= 0 && !salidaInventarioPendiente) {
            error = "Ingrese un valor al Debe o Haber en la línea " + (indice + 1) + ".";
        }
        if (!error && linea.codigo === CUENTA_INVENTARIO_MATERIALES && linea.tipoInventario === "Entrada" && linea.debeCentavos <= 0) {
            error = "La entrada de inventario de la línea " + (indice + 1) + " debe llevar su costo total al Debe.";
        }
    }
    const totalDebe = lineasConContenido.reduce(function(total, linea) {
        return total + linea.debeCentavos;
    }, 0);
    const totalHaber = lineasConContenido.reduce(function(total, linea) {
        return total + linea.haberCentavos;
    }, 0);

    if (!error && totalDebe !== totalHaber) {
        error = "La partida no está balanceada. La diferencia es " +
            centavosADinero(Math.abs(totalDebe - totalHaber)) + ".";
    }
    actualizarTelemetriaMovimiento(
        "2. Validación",
        error || "Partida aprobada",
        error ? true : undefined
    );
    return error;
}
/*
FASE 3
A. Objetivo: construir el objeto contable definitivo.
B. Entrada (Zero-Trust): datos aprobados por la fase 2.
C. Validación: localizar nuevamente cada cuenta auxiliar.
D. Procesamiento: convertir centavos a moneda y formar la partida doble.
E. Decisión: asignar identificador, origen y fecha de creación.
F. Recuperación: la fase 2 evita que una cuenta ausente llegue aquí.
G. Verificación: conservar código, nombre, descripción, Debe y Haber.
H. Telemetría: registrar que el objeto fue construido.
*/
function construirNuevoMovimiento(datos) {
    const lineas = datos.lineas
        .filter(function(linea) {
            return linea.codigo || linea.descripcion || linea.tipoInventario || linea.sku || linea.cantidadInventario || linea.fechaDisponibleUso || linea.valorResidualCentavos || linea.debeCentavos || linea.haberCentavos;
        })
        .map(function(linea) {
            const cuenta = cuentasDisponibles.find(function(item) {
                return item.codigo === linea.codigo;
            });
            return {
                codigo: cuenta.codigo,
                cuenta: cuenta.nombre,
                descripcion: linea.descripcion,
                tipoInventario: linea.tipoInventario || "",
                sku: linea.sku || "",
                cantidadInventario: Number(linea.cantidadInventario || 0),
                descripcionMaterial: linea.descripcion || linea.sku || "",
                activoFijo: esCuentaActivoFijo(cuenta.codigo) ? {
                    codigoActivo: linea.codigoActivo || "",
                    nombre: linea.descripcion,
                    fechaDisponibleUso: linea.fechaDisponibleUso,
                    valorResidualCentavos: linea.valorResidualCentavos
                } : null,
                debe: linea.debeCentavos / 100,
                haber: linea.haberCentavos / 100
            };
        });

    const original = movimientoEditandoId === null
        ? null
        : movimientos.find(function(item) { return Number(item.id) === Number(movimientoEditandoId); });
    const movimiento = {
        id: original ? original.id : siguienteIdMovimiento(),
        numero: datos.numero,
        fecha: datos.fecha,
        referencia: datos.referencia,
        concepto: datos.concepto,
        origen: original ? original.origen : "Manual",
        creadoEn: original ? original.creadoEn : new Date().toISOString(),
        actualizadoEn: original ? new Date().toISOString() : undefined,
        partida: lineas
    };
    const baseInventario = original
        ? movimientos.filter(function(item) { return Number(item.id) !== Number(original.id); })
        : movimientos;
    const preparadoInventario = prepararMovimientoConInventario(movimiento, baseInventario);
    const preparado = prepararMovimientoConDepreciacion(preparadoInventario);
    actualizarTelemetriaMovimiento("3. Procesamiento", "Partida construida; inventario y activos fijos preparados");
    return preparado;
}
/*
FASE 4
A. Objetivo: decidir si la partida se vuelve permanente.
B. Entrada (Zero-Trust): objeto construido en memoria.
C. Validación: recalcular la igualdad contable en centavos.
D. Procesamiento: insertar la partida mediante IndexedDB.
E. Decisión: persistir solo si Debe y Haber coinciden.
F. Recuperación: propagar el error sin modificar la colección visible.
G. Verificación: esperar la finalización de la transacción.
H. Telemetría: registrar la decisión de persistencia.
*/
async function fase4DecidirMovimiento(movimiento) {
    const cuentasPorCodigo = new Map(cuentasDisponibles.map(function(cuenta) {
        return [cuenta.codigo, cuenta];
    }));
    validarPartidaDoble(movimiento, cuentasPorCodigo);
    await guardarMovimientoBD(movimiento);
    actualizarTelemetriaMovimiento("4. Decisión", "Partida almacenada");
    return true;
}
/*
FASE 5
A. Objetivo: comprobar que la partida persistida coincide con la original.
B. Entrada (Zero-Trust): identificador de una partida recién guardada.
C. Validación: volver a leer número, fecha y líneas desde IndexedDB.
D. Procesamiento: comparar identidad y estructura mínima.
E. Decisión: confirmar o rechazar el registro.
F. Recuperación: eliminar el registro si la verificación falla.
G. Verificación: lectura independiente mediante obtenerMovimientoBD().
H. Telemetría: actualizar procesadas, rechazadas y resultado.
*/
async function fase5VerificarMovimiento(movimiento) {
    const verificado = await obtenerMovimientoBD(movimiento.id);
    const coincide = Boolean(verificado) &&
        verificado.numero === movimiento.numero &&
        verificado.fecha === movimiento.fecha &&
        Array.isArray(verificado.partida) &&
        verificado.partida.length === movimiento.partida.length;
    if (!coincide) {
        await eliminarMovimientoBD(movimiento.id);
        actualizarTelemetriaMovimiento("5. Verificación", "Registro revertido", true);
        throw new Error("La partida no pudo verificarse y fue revertida.");
    }
    actualizarTelemetriaMovimiento("5. Verificación", "Partida verificada", false);
    return true;
}
async function guardarYVerificarMovimiento(movimiento) {
    await fase4DecidirMovimiento(movimiento);
    await fase5VerificarMovimiento(movimiento);
    try {
        await reconstruirInventarioDesdeMovimientos(movimientos.concat([movimiento]));
    } catch (errorInventario) {
        await eliminarMovimientoBD(movimiento.id).catch(function() {});
        await reconstruirInventarioDesdeMovimientos(movimientos).catch(function() {});
        throw errorInventario;
    }
    await publicarEventoContable(
        TIPOS_EVENTOS.PARTIDA_REGISTRADA,
        "movimiento",
        movimiento.id,
        {
            numero: movimiento.numero,
            fecha: movimiento.fecha
        }
    );
    return true;
}

async function actualizarYVerificarMovimiento(movimiento, original) {
    const cuentasPorCodigo = new Map(cuentasDisponibles.map(function(cuenta) {
        return [cuenta.codigo, cuenta];
    }));
    validarPartidaDoble(movimiento, cuentasPorCodigo);
    await actualizarMovimientoBD(movimiento);
    const verificado = await obtenerMovimientoBD(movimiento.id);
    const coincide = Boolean(verificado) &&
        verificado.numero === movimiento.numero &&
        verificado.fecha === movimiento.fecha &&
        Array.isArray(verificado.partida) &&
        verificado.partida.length === movimiento.partida.length;
    if (!coincide) {
        await actualizarMovimientoBD(original).catch(function() {});
        throw new Error("La edición no pudo verificarse y fue revertida.");
    }
    const reconstruccion = movimientos
        .filter(function(item) { return Number(item.id) !== Number(movimiento.id); })
        .concat([movimiento]);
    try {
        await reconstruirInventarioDesdeMovimientos(reconstruccion);
    } catch (errorInventario) {
        await actualizarMovimientoBD(original).catch(function() {});
        await reconstruirInventarioDesdeMovimientos(movimientos).catch(function() {});
        throw errorInventario;
    }
    await publicarEventoContable(
        TIPOS_EVENTOS.PARTIDA_EDITADA,
        "movimiento",
        movimiento.id,
        { numero: movimiento.numero, fecha: movimiento.fecha }
    );
    actualizarTelemetriaMovimiento("5. Verificación", "Partida editada y verificada", false);
    return true;
}

async function registrarMovimiento(evento) {
    evento.preventDefault();
    mensajeMovimiento.textContent = "";
    const datos = recibirDatosMovimiento();
    const error = validarDatosMovimiento(datos);
    if (error) {
        mostrarErrorFormulario(error);
        return;
    }

    try {
        const original = movimientoEditandoId === null
            ? null
            : movimientos.find(function(item) { return Number(item.id) === Number(movimientoEditandoId); });
        const movimiento = construirNuevoMovimiento(datos);
        if (original) {
            await actualizarYVerificarMovimiento(movimiento, original);
            const posicion = movimientos.findIndex(function(item) {
                return Number(item.id) === Number(movimiento.id);
            });
            if (posicion !== -1) movimientos.splice(posicion, 1, movimiento);
        } else {
            await guardarYVerificarMovimiento(movimiento);
            movimientos.unshift(movimiento);
        }
        buscador.value = "";
        filtroTipo.value = "Todos";
        mostrarMovimientos();

        const accion = original ? "cerrar" : (evento.submitter ? evento.submitter.value : "cerrar");
        if (accion === "nueva") {
            reiniciarFormularioPartida();
            mensajeMovimiento.textContent = "Partida guardada correctamente.";
            mensajeMovimiento.className = "mensaje-movimiento correcto";
        } else {
            cerrarFormularioMovimiento();
        }
    } catch (errorGuardado) {
        actualizarTelemetriaMovimiento("F. Recuperación", errorGuardado.message, true);
        mostrarErrorFormulario(errorGuardado.message);
    }
}

async function iniciarLibroDiario() {
    botonAgregar.disabled = true;
    botonImportar.disabled = true;
    try {
        await abrirBaseDatos();
        await prepararCuentas();
        await prepararMovimientos();
        mostrarMovimientos();
        botonAgregar.disabled = false;
        botonImportar.disabled = false;
        if (new URLSearchParams(window.location.search).get("accion") === "nueva-partida") {
            abrirFormularioMovimiento();
        }
    } catch (error) {
        listaMovimientos.innerHTML =
            '<p class="error-carga">No se pudieron cargar los datos. Ejecute el proyecto con Live Server.</p>';
    }
}

buscador.addEventListener("input", mostrarMovimientos);
filtroTipo.addEventListener("change", mostrarMovimientos);
botonAgregar.addEventListener("click", abrirFormularioMovimiento);
document.getElementById("cerrar-dialogo").addEventListener("click", cerrarFormularioMovimiento);
document.getElementById("cancelar-movimiento").addEventListener("click", cerrarFormularioMovimiento);
document.getElementById("agregar-linea").addEventListener("click", function() {
    agregarLineaFormulario();
});
formularioMovimiento.addEventListener("submit", registrarMovimiento);

iniciarLibroDiario();

