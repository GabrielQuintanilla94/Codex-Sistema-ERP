const dialogoImportar = document.getElementById("dialogo-importar");
const zonaCSV = document.getElementById("zona-csv");
const archivoCSV = document.getElementById("archivo-csv");
const mensajeImportacion = document.getElementById("mensaje-importacion");
const resumenImportacion = document.getElementById("resumen-importacion");
const vistaPreviaCSV = document.getElementById("vista-previa-csv");
const confirmarImportacion = document.getElementById("confirmar-importacion");
let resultadoImportacion = null;
const workerPartidas = new Worker("js/importacion/partidas_worker.js?v=7");
const telemetriaImportacion = {
    procesadas: 0,
    rechazadas: 0,
    fase: "Esperando archivo",
    resultado: "Sin operaciones"
};
function actualizarTelemetriaImportacion(fase, resultado, rechazada) {
    telemetriaImportacion.fase = fase;
    telemetriaImportacion.resultado = resultado;
    if (rechazada === true) telemetriaImportacion.rechazadas++;
    if (rechazada === false) telemetriaImportacion.procesadas++;
}
function abrirImportador() {
    resultadoImportacion = null;
    archivoCSV.value = "";
    mensajeImportacion.textContent = "";
    mensajeImportacion.className = "mensaje-movimiento";
    resumenImportacion.classList.add("oculto");
    vistaPreviaCSV.classList.add("oculto");
    vistaPreviaCSV.innerHTML = "";
    confirmarImportacion.disabled = true;
    dialogoImportar.showModal();
}
function cerrarImportador() {
    dialogoImportar.close();
}
function mostrarMensajeImportacion(mensaje, esError) {
    mensajeImportacion.textContent = mensaje;
    mensajeImportacion.className = esError
        ? "mensaje-movimiento error"
        : "mensaje-movimiento correcto";
}
/*
FASE 1
A. Objetivo: recibir un archivo CSV desde selección o Drag & Drop.
B. Entrada (Zero-Trust): objeto File proporcionado por el navegador.
C. Validación: todavía no se confía en nombre, tamaño ni contenido.
D. Procesamiento: extraer metadatos controlados.
E. Decisión: enviar una estructura uniforme a la fase 2.
F. Recuperación: devolver archivo nulo cuando no exista entrada.
G. Verificación: conservar archivo, nombre y tamaño.
H. Telemetría: registrar el inicio de la importación.
*/
function fase1EntradaImportacion(archivo) {
    actualizarTelemetriaImportacion("1. Entrada Zero-Trust", "Archivo recibido");
    return {
        archivo: archivo || null,
        nombre: archivo ? String(archivo.name || "").trim() : "",
        tamano: archivo ? Number(archivo.size || 0) : 0
    };
}
/*
FASE 2
A. Objetivo: rechazar archivos incompatibles antes de leerlos.
B. Entrada (Zero-Trust): metadatos normalizados del archivo.
C. Validación: existencia, extensión CSV y límite de 5 MB.
D. Procesamiento: aplicar reglas simples y deterministas.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: mantener vacío el resultado de importación.
G. Verificación: no iniciar el Worker si existe un error.
H. Telemetría: registrar aprobación o causa del rechazo.
*/
function fase2ValidarImportacion(datos) {
    let error = "";
    if (!datos.archivo) {
        error = "Seleccione un archivo CSV.";
    } else if (!datos.nombre.toLowerCase().endsWith(".csv")) {
        error = "Seleccione un archivo con extensión .csv.";
    } else if (datos.tamano > 5 * 1024 * 1024) {
        error = "El archivo supera el límite de 5 MB.";
    }
    actualizarTelemetriaImportacion(
        "2. Validación",
        error || "Archivo aprobado",
        error ? true : undefined
    );
    return error;
}
/*
FASE 3
A. Objetivo: procesar el contenido sin bloquear la interfaz.
B. Entrada (Zero-Trust): archivo aprobado por la fase 2.
C. Validación: File.text() debe completar correctamente.
D. Procesamiento: enviar texto, cuentas y duplicados al Web Worker.
E. Decisión: delegar análisis y esperar su respuesta.
F. Recuperación: informar cualquier fallo de lectura.
G. Verificación: el Worker devolverá exito=true o un error.
H. Telemetría: registrar el envío al segundo plano.
*/
async function fase3ProcesarImportacion(datos) {
    const textoCSV = await datos.archivo.text();
    const movimientosPersistidos = await obtenerMovimientosBD();
    sincronizarMovimientos(movimientosPersistidos);
    workerPartidas.postMessage({
        textoCSV: textoCSV,
        cuentas: cuentasDisponibles,
        numerosExistentes: movimientosPersistidos.map(function(movimiento) {
            return movimiento.numero;
        }),
        referenciasExistentes: movimientosPersistidos
            .map(function(movimiento) {
                return movimiento.referencia;
            })
            .filter(Boolean)
    });
    actualizarTelemetriaImportacion("3. Procesamiento", "Archivo enviado al Worker");
}
/*
FASE 4
A. Objetivo: decidir qué partidas validadas se vuelven permanentes.
B. Entrada (Zero-Trust): resultado devuelto por el Web Worker.
C. Validación: no aceptar resultados ausentes, rechazados o vacíos.
D. Procesamiento: asignar identificadores y guardar el lote atómicamente.
E. Decisión: importar todo el lote o no importar ninguna partida.
F. Recuperación: IndexedDB aborta el lote si una inserción falla.
G. Verificación: esperar la transacción antes de continuar.
H. Telemetría: registrar la decisión de persistencia.
*/
async function fase4DecidirImportacion(resultado) {
    if (!resultado ||
        resultado.resumen.rechazadas > 0 ||
        resultado.validas.length === 0) {
        return [];
    }
    let siguienteId = siguienteIdMovimiento();
    const nuevasPartidas = [];
    const contexto = movimientos.slice();
    const partidasOrdenadas = resultado.validas.slice().sort(function(a, b) {
        return String(a.movimiento.fecha || "").localeCompare(String(b.movimiento.fecha || "")) || String(a.movimiento.numero || "").localeCompare(String(b.movimiento.numero || ""));
    });
    const marcaTiempoLote = new Date().toISOString();
    partidasOrdenadas.forEach(function(partida) {
        const base = {
            ...partida.movimiento,
            id: siguienteId++,
            creadoEn: marcaTiempoLote
        };
        const preparadoInventario = prepararMovimientoConInventario(base, contexto);
        const preparado = prepararMovimientoConDepreciacion(preparadoInventario);
        nuevasPartidas.push(preparado);
        contexto.push(preparado);
    });
    const cuentasPorCodigo = new Map(cuentasDisponibles.map(function(cuenta) {
        return [cuenta.codigo, cuenta];
    }));
    nuevasPartidas.forEach(function(movimiento) {
        validarPartidaDoble(movimiento, cuentasPorCodigo);
    });
    await guardarMovimientosBD(nuevasPartidas);
    actualizarTelemetriaImportacion("4. Decisión", "Lote almacenado");
    return nuevasPartidas;
}
/*
FASE 5
A. Objetivo: comprobar el lote almacenado antes de mostrarlo.
B. Entrada (Zero-Trust): partidas supuestamente persistidas.
C. Validación: volver a leer identificadores y números desde IndexedDB.
D. Procesamiento: comparar cada partida nueva con su registro.
E. Decisión: confirmar el lote solo si todas coinciden.
F. Recuperación: eliminar el lote si la verificación falla.
G. Verificación: lectura independiente de todos los movimientos.
H. Telemetría: actualizar partidas procesadas o rechazadas.
*/
async function fase5VerificarImportacion(nuevasPartidas) {
    const guardados = await obtenerMovimientosBD();
    const porId = new Map(guardados.map(function(movimiento) {
        return [movimiento.id, movimiento];
    }));
    const verificadas = nuevasPartidas.every(function(movimiento) {
        const guardado = porId.get(movimiento.id);
        return guardado &&
            guardado.numero === movimiento.numero &&
            Array.isArray(guardado.partida) &&
            guardado.partida.length === movimiento.partida.length;
    });
    if (!verificadas) {
        for (const movimiento of nuevasPartidas) {
            await eliminarMovimientoBD(movimiento.id);
        }
        actualizarTelemetriaImportacion("5. Verificación", "Lote revertido", true);
        throw new Error("No fue posible verificar todas las partidas. El lote fue revertido.");
    }
    telemetriaImportacion.procesadas += nuevasPartidas.length;
    actualizarTelemetriaImportacion("5. Verificación", "Lote verificado");
    return true;
}
async function recibirArchivoCSV(archivo) {
    const datos = fase1EntradaImportacion(archivo);
    const error = fase2ValidarImportacion(datos);
    if (error) {
        mostrarMensajeImportacion(error, true);
        return;
    }
    try {
        mostrarMensajeImportacion("Procesando archivo en segundo plano...", false);
        confirmarImportacion.disabled = true;
        resultadoImportacion = null;
        await fase3ProcesarImportacion(datos);
    } catch (errorLectura) {
        actualizarTelemetriaImportacion("F. Recuperación", errorLectura.message, true);
        mostrarMensajeImportacion("No fue posible leer el archivo CSV.", true);
    }
}
function renderizarVistaPrevia(resultado) {
    document.getElementById("csv-total").textContent = resultado.resumen.totalPartidas;
    document.getElementById("csv-validas").textContent = resultado.resumen.validas;
    document.getElementById("csv-rechazadas").textContent = resultado.resumen.rechazadas;
    document.getElementById("csv-lineas").textContent = resultado.resumen.totalLineas;
    resumenImportacion.classList.remove("oculto");
    vistaPreviaCSV.classList.remove("oculto");
    vistaPreviaCSV.innerHTML = `
        <table class="tabla-previa">
            <thead>
                <tr>
                    <th>Estado</th>
                    <th>Partida</th>
                    <th>Fecha</th>
                    <th>Líneas</th>
                    <th>Debe</th>
                    <th>Haber</th>
                    <th>Resultado</th>
                </tr>
            </thead>
            <tbody>
                ${resultado.resultados.map(function(partida) {
                    const clase = partida.valida ? "fila-valida" : "fila-error";
                    const estado = partida.valida ? "✓ Válida" : "✕ Rechazada";
                    const detalle = partida.valida
                        ? "Lista para importar"
                        : partida.errores.map(escaparTexto).join("<br>");
                    return `
                        <tr class="${clase}">
                            <td>${estado}</td>
                            <td>${escaparTexto(partida.numero)}</td>
                            <td>${escaparTexto(partida.fecha)}</td>
                            <td>${partida.lineas}</td>
                            <td>${convertirDinero(partida.totalDebe)}</td>
                            <td>${convertirDinero(partida.totalHaber)}</td>
                            <td>${detalle}</td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
    const puedeImportar = resultado.resumen.validas > 0 &&
        resultado.resumen.rechazadas === 0;
    confirmarImportacion.disabled = !puedeImportar;
    if (puedeImportar) {
        vistaPrevia.insertAdjacentHTML(
            "afterbegin",
            '<div class="accion-importacion-directa" style="display:flex;justify-content:flex-end;margin:0 0 14px 0">' +
            '<button id="confirmar-importacion-directo" type="button" class="boton-principal" style="min-width:180px;padding:11px 18px">Importar partidas</button>' +
            '</div>'
        );
        const botonDirecto = document.getElementById("confirmar-importacion-directo");
        if (botonDirecto) botonDirecto.addEventListener("click", importarPartidasConfirmadas);
    }
    if (puedeImportar) {
        const acciones = confirmarImportacion.closest(".acciones-dialogo");
        if (acciones) acciones.setAttribute("data-listo", "true");
    }
    if (resultado.resumen.rechazadas > 0) {
        mostrarMensajeImportacion(
            "Corrija las partidas rechazadas. No se guardará ninguna mientras existan errores.",
            true
        );
    } else {
        mostrarMensajeImportacion(
            resultado.resumen.validas + " partidas listas para importar.",
            false
        );
    }
}
workerPartidas.onmessage = function(evento) {
    const resultado = evento.data;
    if (!resultado.exito) {
        resultadoImportacion = null;
        confirmarImportacion.disabled = true;
        actualizarTelemetriaImportacion("F. Recuperación", resultado.error, true);
        mostrarMensajeImportacion(resultado.error, true);
        return;
    }
    resultadoImportacion = resultado;
    actualizarTelemetriaImportacion("3. Procesamiento", "Vista previa generada");
    renderizarVistaPrevia(resultado);
};
workerPartidas.onerror = function() {
    resultadoImportacion = null;
    confirmarImportacion.disabled = true;
    actualizarTelemetriaImportacion("F. Recuperación", "Error del Web Worker", true);
    mostrarMensajeImportacion("El Web Worker no pudo procesar el archivo.", true);
};
async function importarPartidasConfirmadas() {
    confirmarImportacion.disabled = true;
    mostrarMensajeImportacion("Guardando partidas...", false);
    try {
        const nuevasPartidas = await fase4DecidirImportacion(resultadoImportacion);
        if (nuevasPartidas.length === 0) {
            confirmarImportacion.disabled = false;
            return;
        }
        await fase5VerificarImportacion(nuevasPartidas);
        try {
            await reconstruirInventarioDesdeMovimientos(movimientos.concat(nuevasPartidas));
        } catch (errorInventario) {
            for (const movimiento of nuevasPartidas) {
                await eliminarMovimientoBD(movimiento.id).catch(function() {});
            }
            await reconstruirInventarioDesdeMovimientos(movimientos).catch(function() {});
            throw errorInventario;
        }
        await publicarEventoContable(
            TIPOS_EVENTOS.PARTIDAS_IMPORTADAS,
            "lote",
            "csv-" + Date.now(),
            {
                cantidad: nuevasPartidas.length,
                ids: nuevasPartidas.map(function(movimiento) {
                    return movimiento.id;
                })
            }
        );
        movimientos.push(...nuevasPartidas);
        buscador.value = "";
        filtroTipo.value = "Todos";
        mostrarMovimientos();
        cerrarImportador();
    } catch (error) {
        confirmarImportacion.disabled = false;
        actualizarTelemetriaImportacion("F. Recuperación", error.message, true);
        mostrarMensajeImportacion(error.message || "No fue posible guardar las partidas.", true);
    }
}
zonaCSV.addEventListener("dragover", function(evento) {
    evento.preventDefault();
    zonaCSV.classList.add("arrastrando");
});
zonaCSV.addEventListener("dragleave", function() {
    zonaCSV.classList.remove("arrastrando");
});
zonaCSV.addEventListener("drop", function(evento) {
    evento.preventDefault();
    zonaCSV.classList.remove("arrastrando");
    recibirArchivoCSV(evento.dataTransfer.files[0]);
});
archivoCSV.addEventListener("change", function() {
    recibirArchivoCSV(archivoCSV.files[0]);
});
botonImportar.addEventListener("click", abrirImportador);
document.getElementById("cerrar-importador").addEventListener("click", cerrarImportador);
document.getElementById("cancelar-importacion").addEventListener("click", cerrarImportador);
confirmarImportacion.addEventListener("click", importarPartidasConfirmadas);

