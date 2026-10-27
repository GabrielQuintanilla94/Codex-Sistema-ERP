const NOMBRE_BASE_DATOS = "LibroDiarioDAG_v3";
const VERSION_BASE_DATOS = 7;
const ALMACEN_CUENTAS = "cuentas";
const ALMACEN_MOVIMIENTOS = "movimientos";
const ALMACEN_EVENTOS = "eventos";
const ALMACEN_PROYECCIONES = "proyecciones";
const ALMACEN_INVENTARIO = "inventario";
const ALMACEN_TERCEROS = "terceros";
const ALMACEN_COMPRAS = "compras";
const ALMACEN_VENTAS = "ventas";
let baseDatos;
const telemetriaBaseDatos = {
    operaciones: 0,
    errores: 0,
    ultimaOperacion: "Sin operaciones"
};
function registrarTelemetriaBD(operacion, esError) {
    telemetriaBaseDatos.ultimaOperacion = operacion;
    if (esError) {
        telemetriaBaseDatos.errores++;
    } else {
        telemetriaBaseDatos.operaciones++;
    }
}
/*
FASE 1
A. Objetivo: recibir y normalizar una solicitud de almacenamiento.
B. Entrada (Zero-Trust): almacén, modo, nombre y función recibidos sin confiar.
C. Validación: aplazada hasta la fase 2.
D. Procesamiento: construir un objeto uniforme.
E. Decisión: enviar la operación normalizada a validación.
F. Recuperación: sustituir valores ausentes por valores controlados.
G. Verificación: comprobar que el objeto contiene las propiedades esperadas.
H. Telemetría: conservar el nombre de la operación solicitada.
*/
function fase1EntradaBD(almacen, modo, nombre, ejecutar) {
    return {
        almacen: String(almacen || ""),
        modo: String(modo || ""),
        nombre: String(nombre || "Operación desconocida"),
        ejecutar: ejecutar
    };
}
/*
FASE 2
A. Objetivo: impedir transacciones inválidas.
B. Entrada (Zero-Trust): operación normalizada, todavía no autorizada.
C. Validación: conexión, almacén, modo y función ejecutora.
D. Procesamiento: revisar reglas mínimas de IndexedDB.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: detener el proceso antes de modificar datos.
G. Verificación: confirmar que el almacén existe.
H. Telemetría: registrar los rechazos desde el orquestador.
*/
function fase2ValidarBD(operacion) {
    if (!baseDatos) return "La base de datos no está abierta.";
    if (!baseDatos.objectStoreNames.contains(operacion.almacen)) {
        return "El almacén solicitado no existe.";
    }
    if (!["readonly", "readwrite"].includes(operacion.modo)) {
        return "El modo de transacción no es válido.";
    }
    if (typeof operacion.ejecutar !== "function") {
        return "La operación de almacenamiento no es válida.";
    }
    return "";
}
/*
FASE 3
A. Objetivo: ejecutar una transacción atómica.
B. Entrada (Zero-Trust): operación aprobada por la fase 2.
C. Validación: IndexedDB controla claves, índices y estado transaccional.
D. Procesamiento: abrir la transacción y ejecutar la solicitud.
E. Decisión: resolver al completar o rechazar ante error o aborto.
F. Recuperación: IndexedDB revierte automáticamente una transacción abortada.
G. Verificación: esperar transaccion.oncomplete antes de confirmar.
H. Telemetría: la fase 4 registra el resultado final.
*/
function fase3ProcesarBD(operacion) {
    return new Promise(function(resolve, reject) {
        const transaccion = baseDatos.transaction(operacion.almacen, operacion.modo);
        const almacen = transaccion.objectStore(operacion.almacen);
        let resultado;
        try {
            const solicitud = operacion.ejecutar(almacen);
            if (solicitud && typeof solicitud === "object" && "onsuccess" in solicitud) {
                solicitud.onsuccess = function() {
                    resultado = solicitud.result;
                };
                solicitud.onerror = function() {
                    reject(solicitud.error);
                };
            }
        } catch (error) {
            transaccion.abort();
            reject(error);
            return;
        }
        transaccion.oncomplete = function() {
            resolve(resultado);
        };
        transaccion.onerror = function() {
            reject(transaccion.error);
        };
        transaccion.onabort = function() {
            reject(transaccion.error || new Error("La transacción fue cancelada."));
        };
    });
}
/*
FASE 4
A. Objetivo: decidir si la operación se acepta o se rechaza.
B. Entrada (Zero-Trust): promesa de una transacción recién ejecutada.
C. Validación: comprobar su finalización sin errores.
D. Procesamiento: esperar el resultado asíncrono.
E. Decisión: devolver el resultado o propagar el error.
F. Recuperación: registrar el fallo sin ocultar su causa.
G. Verificación: solo contabilizar operaciones completadas.
H. Telemetría: actualizar operaciones, errores y última operación.
*/
async function fase4DecidirBD(promesa, nombre) {
    try {
        const resultado = await promesa;
        registrarTelemetriaBD(nombre, false);
        return resultado;
    } catch (error) {
        registrarTelemetriaBD(nombre, true);
        throw error;
    }
}
/*
FASE 5
A. Objetivo: verificar que el resultado tenga la forma esperada.
B. Entrada (Zero-Trust): resultado devuelto por IndexedDB.
C. Validación: aplicar una función verificadora cuando sea necesaria.
D. Procesamiento: comparar el resultado con la condición esperada.
E. Decisión: devolver el resultado o lanzar una inconsistencia.
F. Recuperación: permitir que el llamador informe o revierta la operación.
G. Verificación: condición explícita y reutilizable.
H. Telemetría: registrar una inconsistencia como error.
*/
function fase5VerificarBD(resultado, verificar, nombre) {
    if (typeof verificar === "function" && !verificar(resultado)) {
        registrarTelemetriaBD(nombre + " sin verificar", true);
        throw new Error("La operación no pudo verificarse.");
    }
    return resultado;
}
async function ejecutarOperacionBD(almacen, modo, nombre, ejecutar, verificar) {
    const operacion = fase1EntradaBD(almacen, modo, nombre, ejecutar);
    const error = fase2ValidarBD(operacion);
    if (error) {
        registrarTelemetriaBD(nombre, true);
        throw new Error(error);
    }
    const resultado = await fase4DecidirBD(fase3ProcesarBD(operacion), nombre);
    return fase5VerificarBD(resultado, verificar, nombre);
}
function abrirBaseDatos() {
    return new Promise(function(resolve, reject) {
        const solicitud = indexedDB.open(NOMBRE_BASE_DATOS, VERSION_BASE_DATOS);
        solicitud.onupgradeneeded = function(evento) {
            const bd = evento.target.result;
            if (!bd.objectStoreNames.contains(ALMACEN_CUENTAS)) {
                const almacen = bd.createObjectStore(ALMACEN_CUENTAS, { keyPath: "codigo" });
                almacen.createIndex("por_padre", "padre", { unique: false });
                almacen.createIndex("por_naturaleza", "naturaleza", { unique: false });
            }
            if (!bd.objectStoreNames.contains(ALMACEN_MOVIMIENTOS)) {
                const movimientos = bd.createObjectStore(ALMACEN_MOVIMIENTOS, { keyPath: "id" });
                movimientos.createIndex("por_fecha", "fecha", { unique: false });
                movimientos.createIndex("por_tipo", "tipo", { unique: false });
                movimientos.createIndex("por_referencia", "referencia", { unique: false });
            }
            if (!bd.objectStoreNames.contains(ALMACEN_EVENTOS)) {
                const eventos = bd.createObjectStore(ALMACEN_EVENTOS, { keyPath: "id" });
                eventos.createIndex("por_tipo", "tipo", { unique: false });
                eventos.createIndex("por_fecha", "fecha", { unique: false });
                eventos.createIndex("por_entidad", "entidad", { unique: false });
            }
            if (!bd.objectStoreNames.contains(ALMACEN_PROYECCIONES)) {
                bd.createObjectStore(ALMACEN_PROYECCIONES, { keyPath: "id" });
            }
            if (!bd.objectStoreNames.contains(ALMACEN_INVENTARIO)) {
                const inventario = bd.createObjectStore(ALMACEN_INVENTARIO, { keyPath: "sku" });
                inventario.createIndex("por_descripcion", "descripcion", { unique: false });
            }
            if (!bd.objectStoreNames.contains(ALMACEN_TERCEROS)) {
                const terceros = bd.createObjectStore(ALMACEN_TERCEROS, { keyPath: "nrc" });
                terceros.createIndex("por_razon_social", "razonSocial", { unique: false });
            }
            if (!bd.objectStoreNames.contains(ALMACEN_COMPRAS)) {
                const compras = bd.createObjectStore(ALMACEN_COMPRAS, { keyPath: "id" });
                compras.createIndex("por_fecha", "fecha", { unique: false });
                compras.createIndex("por_documento", "documento", { unique: false });
                compras.createIndex("por_nrc", "nrc", { unique: false });
            }
            if (!bd.objectStoreNames.contains(ALMACEN_VENTAS)) {
                const ventas = bd.createObjectStore(ALMACEN_VENTAS, { keyPath: "id" });
                ventas.createIndex("por_fecha", "fecha", { unique: false });
                ventas.createIndex("por_documento", "documento", { unique: false });
                ventas.createIndex("por_tipo_cliente", "tipoCliente", { unique: false });
                ventas.createIndex("por_nrc", "nrc", { unique: false });
            }
            if (evento.oldVersion < 6 && bd.objectStoreNames.contains(ALMACEN_CUENTAS)) {
                const almacenCuentas = evento.target.transaction.objectStore(ALMACEN_CUENTAS);
                const solicitudCuentaCosto = almacenCuentas.get("5001");
                solicitudCuentaCosto.onsuccess = function() {
                    const cuentaCosto = solicitudCuentaCosto.result;
                    if (cuentaCosto) {
                        cuentaCosto.permiteMovimientos = true;
                        almacenCuentas.put(cuentaCosto);
                    }
                };
            }
            if (evento.oldVersion < 7 && bd.objectStoreNames.contains(ALMACEN_CUENTAS)) {
                const cuentas = evento.target.transaction.objectStore(ALMACEN_CUENTAS);
                [
                    { codigo: "1105", nombre: "IVA Crédito Fiscal", padre: "1100", naturaleza: "Deudora", permiteMovimientos: true },
                    { codigo: "1106", nombre: "Remanente de crédito fiscal", padre: "1100", naturaleza: "Deudora", permiteMovimientos: true },
                    { codigo: "2102", nombre: "IVA Débito Fiscal", padre: "2100", naturaleza: "Acreedora", permiteMovimientos: true },
                    { codigo: "2103", nombre: "IVA por pagar", padre: "2100", naturaleza: "Acreedora", permiteMovimientos: true }
                ].forEach(function(cuenta) { cuentas.put(cuenta); });
            }
        };
        solicitud.onsuccess = function(evento) {
            baseDatos = evento.target.result;
            baseDatos.onversionchange = function() {
                baseDatos.close();
            };
            registrarTelemetriaBD("Abrir base de datos", false);
            resolve(baseDatos);
        };
        solicitud.onerror = function() {
            registrarTelemetriaBD("Abrir base de datos", true);
            reject(solicitud.error);
        };
        solicitud.onblocked = function() {
            registrarTelemetriaBD("Actualización bloqueada", true);
        };
    });
}
function guardarCuentaBD(cuenta) {
    return ejecutarOperacionBD(
        ALMACEN_CUENTAS,
        "readwrite",
        "Guardar cuenta",
        function(almacen) {
            almacen.put(cuenta);
        }
    );
}
function guardarCuentasBD(cuentas) {
    return ejecutarOperacionBD(
        ALMACEN_CUENTAS,
        "readwrite",
        "Guardar cuentas",
        function(almacen) {
            cuentas.forEach(function(cuenta) {
                almacen.put(cuenta);
            });
        }
    );
}
function obtenerCuentasBD() {
    return ejecutarOperacionBD(
        ALMACEN_CUENTAS,
        "readonly",
        "Obtener cuentas",
        function(almacen) {
            return almacen.getAll();
        },
        Array.isArray
    );
}
function obtenerCuentaBD(codigo) {
    return ejecutarOperacionBD(
        ALMACEN_CUENTAS,
        "readonly",
        "Obtener cuenta",
        function(almacen) {
            return almacen.get(codigo);
        }
    );
}
function eliminarCuentaBD(codigo) {
    return ejecutarOperacionBD(
        ALMACEN_CUENTAS,
        "readwrite",
        "Eliminar cuenta",
        function(almacen) {
            almacen.delete(codigo);
        }
    );
}
function guardarMovimientoBD(movimiento) {
    return ejecutarOperacionBD(
        ALMACEN_MOVIMIENTOS,
        "readwrite",
        "Guardar movimiento",
        function(almacen) {
            almacen.add(movimiento);
        }
    );
}
function actualizarMovimientoBD(movimiento) {
    return ejecutarOperacionBD(
        ALMACEN_MOVIMIENTOS,
        "readwrite",
        "Actualizar movimiento",
        function(almacen) {
            return almacen.put(movimiento);
        }
    );
}
function guardarMovimientosBD(listaMovimientos) {
    return ejecutarOperacionBD(
        ALMACEN_MOVIMIENTOS,
        "readwrite",
        "Guardar movimientos",
        function(almacen) {
            listaMovimientos.forEach(function(movimiento) {
                almacen.add(movimiento);
            });
        }
    );
}
function obtenerMovimientosBD() {
    return ejecutarOperacionBD(
        ALMACEN_MOVIMIENTOS,
        "readonly",
        "Obtener movimientos",
        function(almacen) {
            return almacen.getAll();
        },
        Array.isArray
    );
}
function obtenerMovimientoBD(id) {
    return ejecutarOperacionBD(
        ALMACEN_MOVIMIENTOS,
        "readonly",
        "Obtener movimiento",
        function(almacen) {
            return almacen.get(id);
        }
    );
}
function eliminarMovimientoBD(id) {
    return ejecutarOperacionBD(
        ALMACEN_MOVIMIENTOS,
        "readwrite",
        "Eliminar movimiento",
        function(almacen) {
            almacen.delete(id);
        }
    );
}

function guardarEventoBD(evento) {
return ejecutarOperacionBD(
ALMACEN_EVENTOS,
"readwrite",
"Guardar evento",
function(almacen) {
almacen.add(evento);
}
);
}
function obtenerEventosBD() {
return ejecutarOperacionBD(
ALMACEN_EVENTOS,
"readonly",
"Obtener eventos",
function(almacen) {
return almacen.getAll();
},
Array.isArray
);
}
function guardarProyeccionBD(proyeccion) {
return ejecutarOperacionBD(
ALMACEN_PROYECCIONES,
"readwrite",
"Guardar proyección",
function(almacen) {
almacen.put(proyeccion);
}
);
}
function obtenerProyeccionBD(id) {
return ejecutarOperacionBD(
ALMACEN_PROYECCIONES,
"readonly",
"Obtener proyección",
function(almacen) {
return almacen.get(id);
}
);
}

function guardarInventarioBD(producto) {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readwrite", "Guardar inventario", function(almacen) {
        return almacen.put(producto);
    });
}
function obtenerInventarioBD(sku) {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readonly", "Obtener inventario", function(almacen) {
        return almacen.get(sku);
    });
}
function obtenerInventariosBD() {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readonly", "Obtener inventarios", function(almacen) {
        return almacen.getAll();
    }, Array.isArray);
}
function eliminarInventarioBD(sku) {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readwrite", "Eliminar inventario", function(almacen) {
        return almacen.delete(sku);
    });
}

function guardarTerceroBD(tercero) {
    return ejecutarOperacionBD(ALMACEN_TERCEROS, "readwrite", "Guardar tercero", function(almacen) { return almacen.put(tercero); });
}
function guardarTercerosBD(lista) {
    return ejecutarOperacionBD(ALMACEN_TERCEROS, "readwrite", "Guardar terceros", function(almacen) {
        (lista || []).forEach(function(item) { almacen.put(item); });
    });
}
function obtenerTercerosBD() {
    return ejecutarOperacionBD(ALMACEN_TERCEROS, "readonly", "Obtener terceros", function(almacen) { return almacen.getAll(); }, Array.isArray);
}
function guardarCompraBD(compra) {
    return ejecutarOperacionBD(ALMACEN_COMPRAS, "readwrite", "Guardar compra", function(almacen) { return almacen.add(compra); });
}
function obtenerComprasBD() {
    return ejecutarOperacionBD(ALMACEN_COMPRAS, "readonly", "Obtener compras", function(almacen) { return almacen.getAll(); }, Array.isArray);
}
function eliminarCompraBD(id) {
    return ejecutarOperacionBD(ALMACEN_COMPRAS, "readwrite", "Eliminar compra", function(almacen) { return almacen.delete(id); });
}
function guardarVentaBD(venta) {
    return ejecutarOperacionBD(ALMACEN_VENTAS, "readwrite", "Guardar venta", function(almacen) { return almacen.add(venta); });
}
function obtenerVentasBD() {
    return ejecutarOperacionBD(ALMACEN_VENTAS, "readonly", "Obtener ventas", function(almacen) { return almacen.getAll(); }, Array.isArray);
}
function eliminarVentaBD(id) {
    return ejecutarOperacionBD(ALMACEN_VENTAS, "readwrite", "Eliminar venta", function(almacen) { return almacen.delete(id); });
}

// Inicio fase 5 — Igualdad de datos persistidos, independiente del orden de propiedades.
function estadoPersistidoCoincide(esperado, actual) {
if (Object.is(esperado, actual)) return true;
if (!esperado || !actual || typeof esperado !== "object" || typeof actual !== "object") return false;
if (Array.isArray(esperado) !== Array.isArray(actual)) return false;
const claves = Object.keys(esperado);
return claves.length === Object.keys(actual).length && claves.every(function(clave) {
return Object.prototype.hasOwnProperty.call(actual, clave) && estadoPersistidoCoincide(esperado[clave], actual[clave]);
});
}
// Fin fase 5
// Inicio fase 4 — Un único commit IndexedDB para todos los almacenes afectados.
function aplicarCambioContableBD(cambios, movimientosEsperados) {
return new Promise(function(resolve, reject) {
if (!baseDatos) return reject(new Error("La base de datos no está abierta."));
const almacenes = Array.from(new Set([ALMACEN_MOVIMIENTOS].concat(cambios.map(function(cambio) { return cambio.almacen; }))));
const transaccion = baseDatos.transaction(almacenes, "readwrite");
let fallo;
transaccion.oncomplete = function() { registrarTelemetriaBD("Transacción contable", false); resolve(true); };
transaccion.onabort = function() { registrarTelemetriaBD("Transacción contable", true); reject(fallo || transaccion.error || new Error("Transacción contable abortada.")); };
transaccion.onerror = function() { fallo = fallo || transaccion.error; };
const solicitud = transaccion.objectStore(ALMACEN_MOVIMIENTOS).getAll();
solicitud.onsuccess = function() {
try {
if (movimientosEsperados) {
const porId = new Map(movimientosEsperados.map(function(m) { return [m.id, m]; }));
if (solicitud.result.length !== porId.size || !solicitud.result.every(function(m) { return estadoPersistidoCoincide(porId.get(m.id), m); })) {
throw new Error("El estado contable cambió en otra operación. Vuelva a intentar con datos actualizados.");
}
}
cambios.forEach(function(cambio) {
const almacen = transaccion.objectStore(cambio.almacen);
if (cambio.accion === "limpiar") almacen.clear();
else if (cambio.accion === "eliminar") almacen.delete(cambio.clave);
else if (cambio.accion === "agregar") almacen.add(cambio.valor);
else if (cambio.accion === "guardar") almacen.put(cambio.valor);
else throw new Error("Cambio contable no permitido.");
});
} catch (error) { fallo = error; transaccion.abort(); }
};
});
}
// Fin fase 4
function ejecutarConBloqueoContable(ejecutar) {
if (!navigator.locks) return Promise.reject(new Error("El navegador requiere Web Locks para registrar operaciones contables de forma segura."));
return navigator.locks.request("libro-diario-mutacion", ejecutar);
}
