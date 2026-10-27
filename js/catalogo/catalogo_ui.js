const formularioCuenta = document.getElementById("formulario-cuenta");
const arbolCuentas = document.getElementById("arbol-cuentas");
const cuentaPadre = document.getElementById("cuenta-padre");
const mensajeCatalogo = document.getElementById("mensaje-catalogo");
const mensajeFormularioCuenta = document.getElementById("mensaje-formulario-cuenta");
const dialogoCuenta = document.getElementById("dialogo-cuenta");
const botonAbrirCuenta = document.getElementById("abrir-formulario-cuenta");
const codigosCuentasIniciales = new Set();
function escapar(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = String(texto || "");
    return elemento.innerHTML;
}
function cargarSelectores() {
    const seleccionPadre = cuentaPadre.value;
    const opciones = catalogoCuentas.map(function(cuenta) {
        return `<option value="${cuenta.codigo}">${cuenta.codigo} - ${escapar(cuenta.nombre)}</option>`;
    }).join("");
    cuentaPadre.innerHTML = '<option value="">Sin cuenta padre</option>' + opciones;
    cuentaPadre.value = seleccionPadre;
}
function crearFilaCuenta(cuenta, nivel) {
    const puedeEliminar = !codigosCuentasIniciales.has(cuenta.codigo);
    const botonEliminar = puedeEliminar
        ? `<button class="eliminar-cuenta" type="button" data-codigo="${cuenta.codigo}">Eliminar</button>`
        : '<span class="accion-no-disponible">—</span>';
    const tipo = cuenta.permiteMovimientos
        ? "Cuenta auxiliar"
        : "Cuenta agrupadora";
    return `
        <tr class="${cuenta.permiteMovimientos ? "fila-cuenta auxiliar" : "fila-cuenta agrupadora"}">
            <td class="codigo-cuenta">${escapar(cuenta.codigo)}</td>
            <td>
                <div class="nombre-cuenta-matriz" style="--nivel-cuenta:${nivel}">
                    <span class="indicador-nivel"></span>
                    <strong>${escapar(cuenta.nombre)}</strong>
                </div>
            </td>
            <td>${escapar(obtenerClasificacionCuenta(cuenta.codigo))}</td>
            <td>${escapar(cuenta.naturaleza)}</td>
            <td>${tipo}</td>
            <td class="acciones-matriz">${botonEliminar}</td>
        </tr>
    `;
}
function crearFilasJerarquia(codigo, nivel) {
    const cuenta = buscarCuenta(codigo);
    if (!cuenta) return "";
    const hijos = grafoCuentas[codigo] || [];
    const filaActual = crearFilaCuenta(cuenta, nivel);
    const filasHijas = hijos.map(function(codigoHijo) {
        return crearFilasJerarquia(codigoHijo, nivel + 1);
    }).join("");
    return filaActual + filasHijas;
}
function mostrarArbol() {
    const raices = catalogoCuentas.filter(function(cuenta) {
        return cuenta.padre === null;
    });
    arbolCuentas.innerHTML = raices.map(function(cuenta) {
        return crearFilasJerarquia(cuenta.codigo, 0);
    }).join("");
    activarEliminacionCuentas();
}function activarEliminacionCuentas() {
    document.querySelectorAll(".eliminar-cuenta").forEach(function(boton) {
        boton.addEventListener("click", eliminarCuentaCreada);
    });
}
function actualizarInterfazCatalogo() {
    cargarSelectores();
    mostrarArbol();
}function mostrarMensaje(texto, esError) {
    const destino = dialogoCuenta.open
        ? mensajeFormularioCuenta
        : mensajeCatalogo;
    destino.textContent = texto;
    destino.className = esError
        ? "mensaje-catalogo error"
        : "mensaje-catalogo correcto";
}
function abrirFormularioCuenta() {
    formularioCuenta.reset();
    mensajeFormularioCuenta.textContent = "";
    mensajeCatalogo.textContent = "";
    cargarSelectores();
    dialogoCuenta.showModal();
    document.getElementById("codigo").focus();
}
function cerrarFormularioCuenta() {
    if (dialogoCuenta.open) dialogoCuenta.close();
    mensajeFormularioCuenta.textContent = "";
}
/*
FASE 1
A. Objetivo: recibir la cuenta solicitada para eliminación.
B. Entrada (Zero-Trust): código obtenido desde el botón de la interfaz.
C. Validación: todavía no se autoriza la eliminación.
D. Procesamiento: normalizar el código y localizar la cuenta.
E. Decisión: enviar un objeto uniforme a la fase 2.
F. Recuperación: usar una cuenta nula si el código no existe.
G. Verificación: conservar código y cuenta en una sola estructura.
H. Telemetría: registrar el inicio del microproceso.
*/
function fase1EntradaEliminacionCuenta(evento) {
    const codigo = String(evento.currentTarget.dataset.codigo || "").trim();
    actualizarTelemetria("1. Entrada Zero-Trust", "Solicitud de eliminación");
    return { codigo: codigo, cuenta: buscarCuenta(codigo) };
}
/*
FASE 2
A. Objetivo: impedir eliminaciones que rompan la integridad contable.
B. Entrada (Zero-Trust): cuenta localizada, todavía no confiable.
C. Validación: existencia, origen, hijos y uso en partidas.
D. Procesamiento: consultar el DAG y los movimientos almacenados.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: mantener intactos memoria e IndexedDB.
G. Verificación: revisar todas las líneas de las partidas.
H. Telemetría: registrar la causa del rechazo.
*/
async function fase2ValidarEliminacionCuenta(datos) {
    let error = "";
    if (!datos.cuenta) {
        error = "La cuenta no existe.";
    } else if (codigosCuentasIniciales.has(datos.codigo)) {
        error = "Las cuentas iniciales no se pueden eliminar.";
    } else if ((grafoCuentas[datos.codigo] || []).length > 0) {
        error = "No se puede eliminar: la cuenta tiene cuentas hijas.";
    } else {
        const partidas = await obtenerMovimientosBD();
        const estaUtilizada = partidas.some(function(partida) {
            return (partida.partida || []).some(function(linea) {
                return linea.codigo === datos.codigo;
            });
        });
        if (estaUtilizada) {
            error = "No se puede eliminar: la cuenta está utilizada en una partida.";
        }
    }
    if (error) actualizarTelemetria("2. Validación", error, true);
    return error;
}
/*
FASE 3
A. Objetivo: procesar una eliminación aprobada.
B. Entrada (Zero-Trust): cuenta validada en la fase 2.
C. Validación: solicitar confirmación explícita al usuario.
D. Procesamiento: eliminar la clave desde IndexedDB.
E. Decisión: continuar solamente si el usuario confirma.
F. Recuperación: devolver cancelada=true sin modificar datos.
G. Verificación: esperar a que finalice la transacción.
H. Telemetría: registrar cancelación o procesamiento.
*/
async function fase3ProcesarEliminacionCuenta(datos) {
    const confirmada = window.confirm(
        "¿Eliminar la cuenta " + datos.cuenta.codigo + " - " + datos.cuenta.nombre + "?"
    );
    if (!confirmada) {
        actualizarTelemetria("3. Procesamiento", "Eliminación cancelada");
        return { cancelada: true };
    }
    await eliminarCuentaBD(datos.codigo);
    actualizarTelemetria("3. Procesamiento", "Eliminación procesada");
    return { cancelada: false };
}
/*
FASE 4
A. Objetivo: decidir si corresponde actualizar la memoria.
B. Entrada (Zero-Trust): resultado del procesamiento.
C. Validación: comprobar que la operación no fue cancelada.
D. Procesamiento: traducir el resultado a una decisión booleana.
E. Decisión: verificar o finalizar sin cambios.
F. Recuperación: conservar la interfaz cuando existe cancelación.
G. Verificación: devolver continuar=true solo tras una eliminación.
H. Telemetría: registrar la decisión tomada.
*/
function fase4DecidirEliminacionCuenta(resultado) {
    const continuar = resultado && resultado.cancelada === false;
    actualizarTelemetria(
        "4. Decisión",
        continuar ? "Verificar eliminación" : "Sin cambios"
    );
    return continuar;
}
/*
FASE 5
A. Objetivo: verificar la eliminación y sincronizar el DAG.
B. Entrada (Zero-Trust): código supuestamente eliminado.
C. Validación: volver a consultar IndexedDB.
D. Procesamiento: retirar la cuenta de memoria y reconstruir el grafo.
E. Decisión: confirmar solo si no existe en almacenamiento ni memoria.
F. Recuperación: lanzar una inconsistencia si la cuenta reaparece.
G. Verificación: lectura independiente y búsqueda en catálogo.
H. Telemetría: registrar el resultado definitivo.
*/
async function fase5VerificarEliminacionCuenta(datos) {
    const verificacion = await obtenerCuentaBD(datos.codigo);
    if (verificacion) throw new Error("La cuenta continúa almacenada.");
    const posicion = catalogoCuentas.findIndex(function(item) {
        return item.codigo === datos.codigo;
    });
    if (posicion !== -1) catalogoCuentas.splice(posicion, 1);
    grafoCuentas = construirGrafo(catalogoCuentas);
    if (buscarCuenta(datos.codigo)) {
        throw new Error("La cuenta continúa en el catálogo.");
    }
    actualizarTelemetria("5. Verificación", "Cuenta eliminada", false);
    return true;
}
async function eliminarCuentaCreada(evento) {
    const datos = fase1EntradaEliminacionCuenta(evento);
    try {
        const error = await fase2ValidarEliminacionCuenta(datos);
        if (error) {
            mostrarMensaje(error, true);
            return;
        }
        const procesamiento = await fase3ProcesarEliminacionCuenta(datos);
        if (!fase4DecidirEliminacionCuenta(procesamiento)) return;
        await fase5VerificarEliminacionCuenta(datos);
        await publicarEventoContable(
            TIPOS_EVENTOS.CUENTA_ELIMINADA,
            "cuenta",
            datos.codigo,
            {
                nombre: datos.cuenta.nombre
            }
        );
        mostrarMensaje("Cuenta eliminada correctamente.", false);
        actualizarInterfazCatalogo();
    } catch (error) {
        actualizarTelemetria("F. Recuperación", error.message, true);
        mostrarMensaje("No fue posible eliminar la cuenta: " + error.message, true);
    }
}
async function registrarCuenta(evento) {
    evento.preventDefault();
    const datosFormulario = {
        codigo: document.getElementById("codigo").value.trim(),
        nombre: document.getElementById("nombre").value.trim(),
        padre: cuentaPadre.value || null,
        naturaleza: document.getElementById("naturaleza").value,
        permiteMovimientos: document.getElementById("permite-movimientos").checked
    };
    try {
        const resultado = await ejecutarAlgoritmiaCuenta(datosFormulario);
        if (!resultado.exito) {
            mostrarMensaje(resultado.error, true);
            actualizarInterfazCatalogo();
            return;
        }
                await publicarEventoContable(
            TIPOS_EVENTOS.CUENTA_CREADA,
            "cuenta",
            resultado.cuenta.codigo,
            {
                nombre: resultado.cuenta.nombre,
                naturaleza: resultado.cuenta.naturaleza,
                permiteMovimientos: resultado.cuenta.permiteMovimientos
            }
        );
        formularioCuenta.reset();
        cerrarFormularioCuenta();
        mostrarMensaje("Cuenta agregada, guardada y verificada correctamente.", false);
        actualizarInterfazCatalogo();
    } catch (errorInesperado) {
        actualizarTelemetria("F. Recuperación", "Error inesperado", true);
        mostrarMensaje("Ocurrió un error inesperado durante el registro.", true);
    }
}
async function cargarCuentasIniciales() {
    const respuesta = await fetch("datos/catalogo_cuentas.json");
    if (!respuesta.ok) throw new Error("No se pudo cargar el catálogo JSON.");
    const cuentasIniciales = await respuesta.json();
    const error = fase2ValidarGrafo(cuentasIniciales);
    if (error) throw new Error(error);
    cuentasIniciales.forEach(function(cuenta) {
        codigosCuentasIniciales.add(cuenta.codigo);
    });
    return cuentasIniciales;
}
async function iniciarAplicacionCatalogo() {
    try {
        await abrirBaseDatos();
        const guardadas = await obtenerCuentasBD();
        const cuentasIniciales = await cargarCuentasIniciales();
        if (guardadas.length === 0) {
            catalogoCuentas.splice(0, catalogoCuentas.length, ...cuentasIniciales);
            grafoCuentas = construirGrafo(catalogoCuentas);
            await guardarCuentasBD(catalogoCuentas);
        } else {
            const codigosGuardados = new Set(guardadas.map(function(cuenta) {
                return cuenta.codigo;
            }));
            const cuentasFaltantes = cuentasIniciales.filter(function(cuenta) {
                return !codigosGuardados.has(cuenta.codigo);
            });
            if (cuentasFaltantes.length > 0) {
                await guardarCuentasBD(cuentasFaltantes);
            }
            catalogoCuentas.splice(0, catalogoCuentas.length, ...guardadas, ...cuentasFaltantes);
            grafoCuentas = construirGrafo(catalogoCuentas);
        }
        if (!fase5VerificarGrafo(catalogoCuentas, grafoCuentas)) {
            throw new Error("El catálogo almacenado no forma un DAG válido.");
        }
        actualizarInterfazCatalogo();
    } catch (error) {
        mostrarMensaje("No se pudo iniciar el catálogo: " + error.message, true);
        actualizarInterfazCatalogo();
    }
}
botonAbrirCuenta.addEventListener("click", abrirFormularioCuenta);
document.getElementById("cerrar-dialogo-cuenta").addEventListener("click", cerrarFormularioCuenta);
document.getElementById("cancelar-dialogo-cuenta").addEventListener("click", cerrarFormularioCuenta);
formularioCuenta.addEventListener("submit", registrarCuenta);
iniciarAplicacionCatalogo();


