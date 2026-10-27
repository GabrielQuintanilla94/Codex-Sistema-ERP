const telemetriaCuentas = {
    procesadas: 0,
    rechazadas: 0,
    fase: "Esperando entrada",
    resultado: "Sin operaciones"
};

function actualizarTelemetria(fase, resultado, rechazada) {
    telemetriaCuentas.fase = fase;
    telemetriaCuentas.resultado = resultado;
    if (rechazada === true) telemetriaCuentas.rechazadas++;
    if (rechazada === false) telemetriaCuentas.procesadas++;
    const faseElemento = document.getElementById("telemetria-fase");
    if (!faseElemento) return;
    faseElemento.textContent = telemetriaCuentas.fase;
    document.getElementById("telemetria-procesadas").textContent = telemetriaCuentas.procesadas;
    document.getElementById("telemetria-rechazadas").textContent = telemetriaCuentas.rechazadas;
    document.getElementById("telemetria-resultado").textContent = telemetriaCuentas.resultado;
}

/*
FASE 1
A. Objetivo: recibir una posible cuenta contable.
B. Entrada (Zero-Trust): valores sin confiar provenientes del formulario.
C. Validación: todavía no se aprueba ningún dato.
D. Procesamiento: normalizar espacios y tipos.
E. Decisión: enviar un objeto uniforme a la fase 2.
F. Recuperación: devolver un objeto controlado aunque falte un valor.
G. Verificación: comprobar que las propiedades esperadas existen.
H. Telemetría: registrar que inició la captura.
*/
function fase1EntradaCuenta(datosFormulario) {
    actualizarTelemetria("1. Entrada Zero-Trust", "Datos recibidos");
    return {
        codigo: String(datosFormulario.codigo || "").trim(),
        nombre: String(datosFormulario.nombre || "").trim(),
        padre: datosFormulario.padre ? String(datosFormulario.padre).trim() : null,
        naturaleza: String(datosFormulario.naturaleza || "").trim(),
        permiteMovimientos: datosFormulario.permiteMovimientos === true
    };
}

/*
FASE 2
A. Objetivo: impedir que datos inválidos entren al catálogo.
B. Entrada (Zero-Trust): cuenta normalizada, aún no confiable.
C. Validación: formato, nombre, naturaleza, duplicados y cuenta padre.
D. Procesamiento: ejecutar validarCuentaNueva().
E. Decisión: aprobar o rechazar.
F. Recuperación: no modificar el grafo si existe un error.
G. Verificación: respuesta con valido y error.
H. Telemetría: guardar la causa del rechazo.
*/
function fase2ValidarCuenta(cuenta) {
    actualizarTelemetria("2. Validación", "Revisando cuenta");
    let error = "";
    if (!/^\d{4}$/.test(cuenta.codigo)) {
        error = "El código debe contener exactamente 4 números.";
    } else if (cuenta.nombre.length < 3) {
        error = "El nombre debe contener al menos 3 caracteres.";
    } else if (!["Deudora", "Acreedora"].includes(cuenta.naturaleza)) {
        error = "La naturaleza contable no es válida.";
    } else {
        error = validarCuentaNueva(cuenta);
    }

    const resultado = { valido: error === "", error: error };
    if (!resultado.valido) {
        actualizarTelemetria("2. Validación", resultado.error, true);
    }
    return resultado;
}

/*
FASE 3
A. Objetivo: incorporar el nodo y reconstruir el DAG.
B. Entrada (Zero-Trust): cuenta aprobada por la fase 2.
C. Validación: agregarCuenta() vuelve a aplicar las reglas del dominio.
D. Procesamiento: insertar el nodo y ejecutar construirGrafo().
E. Decisión: aceptar únicamente un DAG sin ciclos.
F. Recuperación: agregarCuenta() revierte si detecta un ciclo.
G. Verificación: buscar la cuenta dentro de la memoria.
H. Telemetría: informar si se construyó el nodo.
*/
function fase3ProcesarCuenta(cuenta) {
    actualizarTelemetria("3. Procesamiento", "Construyendo nodo");
    const error = agregarCuenta(cuenta);
    return {
        procesada: error === "" && Boolean(buscarCuenta(cuenta.codigo)),
        error: error
    };
}

/*
FASE 4
A. Objetivo: decidir si el cambio se vuelve permanente.
B. Entrada (Zero-Trust): nodo procesado en memoria.
C. Validación: IndexedDB debe aceptar la escritura.
D. Procesamiento: ejecutar guardarCuentaBD().
E. Decisión: confirmar la operación o marcarla como fallida.
F. Recuperación: retirar el nodo de memoria si falla la base.
G. Verificación: devolver persistida=true solamente al completar la escritura.
H. Telemetría: registrar la decisión tomada.
*/
async function fase4DecidirYPersistir(cuenta) {
    actualizarTelemetria("4. Decisión", "Guardando en IndexedDB");
    try {
        await guardarCuentaBD(cuenta);
        return { persistida: true, error: "" };
    } catch (errorBD) {
        const posicion = catalogoCuentas.findIndex(function(item) {
            return item.codigo === cuenta.codigo;
        });
        if (posicion !== -1) catalogoCuentas.splice(posicion, 1);
        grafoCuentas = construirGrafo(catalogoCuentas);
        return {
            persistida: false,
            error: "No fue posible guardar la cuenta. El cambio fue revertido."
        };
    }
}

/*
FASE 5
A. Objetivo: comprobar el resultado final y dejar evidencia.
B. Entrada (Zero-Trust): código de la cuenta supuestamente almacenada.
C. Validación: volver a leer la cuenta desde IndexedDB.
D. Procesamiento: comparar el código solicitado con el recuperado.
E. Decisión: éxito solo si la cuenta existe en memoria y almacenamiento.
F. Recuperación: reportar una inconsistencia sin ocultarla.
G. Verificación: lectura independiente mediante obtenerCuentaBD().
H. Telemetría: actualizar procesadas, rechazadas y último resultado.
*/
async function fase5VerificarCuenta(cuenta) {
    actualizarTelemetria("5. Verificación", "Comprobando resultado");
    let cuentaGuardada;
    try {
        cuentaGuardada = await obtenerCuentaBD(cuenta.codigo);
    } catch (error) {
        cuentaGuardada = null;
    }
    const cuentaMemoria = buscarCuenta(cuenta.codigo);
    const verificada = Boolean(cuentaGuardada) &&
        Boolean(cuentaMemoria) &&
        cuentaGuardada.codigo === cuenta.codigo &&
        cuentaMemoria.codigo === cuenta.codigo;
    if (!verificada) {
        try {
            await eliminarCuentaBD(cuenta.codigo);
        } catch (error) {
            actualizarTelemetria("5. Recuperación", "No fue posible revertir IndexedDB");
        }
        const posicion = catalogoCuentas.findIndex(function(item) {
            return item.codigo === cuenta.codigo;
        });
        if (posicion !== -1) catalogoCuentas.splice(posicion, 1);
        grafoCuentas = construirGrafo(catalogoCuentas);
    }
    actualizarTelemetria(
        "5. Verificación",
        verificada ? "Cuenta verificada" : "Verificación fallida",
        !verificada
    );

    return verificada;
}
async function ejecutarAlgoritmiaCuenta(datosFormulario) {
    const cuenta = fase1EntradaCuenta(datosFormulario);
    const validacion = fase2ValidarCuenta(cuenta);

    if (!validacion.valido) {
        return { exito: false, error: validacion.error };
    }

    const procesamiento = fase3ProcesarCuenta(cuenta);
    if (!procesamiento.procesada) {
        actualizarTelemetria("3. Procesamiento", procesamiento.error, true);
        return { exito: false, error: procesamiento.error };
    }

    const decision = await fase4DecidirYPersistir(cuenta);
    if (!decision.persistida) {
        actualizarTelemetria("4. Recuperación", decision.error, true);
        return { exito: false, error: decision.error };
    }

    const verificada = await fase5VerificarCuenta(cuenta);
    if (verificada) return { exito: true, cuenta: cuenta };
    return {
        exito: false,
        error: "La cuenta no pudo verificarse y el cambio fue revertido."
    };
}
