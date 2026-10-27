function comercialACentavos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) throw new Error("Importe comercial inválido.");
    return Math.round(numero * 100);
}
function comercialADolares(centavos) { return Number(centavos || 0) / 100; }
function siguienteIdMovimientoComercial(movimientos) {
    return (movimientos || []).reduce(function(max, item) { return Math.max(max, Number(item.id || 0)); }, 0) + 1;
}
function crearIdOperacion(prefijo, fecha, documento, nrc) {
    return [prefijo, String(fecha || ""), String(nrc || "CF"), String(documento || "")].join("|");
}
function validarPartidaComercial(movimiento) {
    const debe = (movimiento.partida || []).reduce(function(total, l) { return total + comercialACentavos(l.debe || 0); }, 0);
    const haber = (movimiento.partida || []).reduce(function(total, l) { return total + comercialACentavos(l.haber || 0); }, 0);
    if (debe !== haber) throw new Error("La operación comercial no está balanceada. Diferencia: $" + Math.abs(comercialADolares(debe - haber)).toFixed(2));
    return true;
}
function normalizarDocumento(valor) {
    const doc = String(valor || "").trim();
    if (!doc) throw new Error("El documento es obligatorio.");
    return doc;
}
function normalizarFechaComercial(valor) {
    const fecha = String(valor || "").trim();
    if (!fecha) throw new Error("La fecha no es válida.");

    // Formato canónico del sistema: YYYY-MM-DD.
    const iso = fecha.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
        const anio = Number(iso[1]);
        const mes = Number(iso[2]);
        const dia = Number(iso[3]);
        if (!fechaComercialReal(anio, mes, dia)) throw new Error("La fecha no es válida.");
        return [String(anio).padStart(4, "0"), String(mes).padStart(2, "0"), String(dia).padStart(2, "0")].join("-");
    }

    // Archivos comerciales exportados desde Excel en configuración local: DD/MM/YYYY.
    const local = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (local) {
        const dia = Number(local[1]);
        const mes = Number(local[2]);
        const anio = Number(local[3]);
        if (!fechaComercialReal(anio, mes, dia)) throw new Error("La fecha no es válida.");
        return [String(anio).padStart(4, "0"), String(mes).padStart(2, "0"), String(dia).padStart(2, "0")].join("-");
    }

    throw new Error("La fecha no es válida.");
}
function fechaComercialReal(anio, mes, dia) {
    if (!Number.isInteger(anio) || !Number.isInteger(mes) || !Number.isInteger(dia)) return false;
    if (anio < 1900 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
    const prueba = new Date(Date.UTC(anio, mes - 1, dia));
    return prueba.getUTCFullYear() === anio && prueba.getUTCMonth() === mes - 1 && prueba.getUTCDate() === dia;
}


/* ALGORITMIA 5 FASES — utilidades compartidas de persistencia/verificación comercial. */
function compararInventarioPersistidoConEsperado(esperado, persistido) {
    const mapaPersistido = new Map((persistido || []).map(function(item) { return [String(item.sku), item]; }));
    if (mapaPersistido.size !== esperado.estados.size) return false;
    for (const [sku, estadoEsperado] of esperado.estados.entries()) {
        const actual = mapaPersistido.get(String(sku));
        if (!actual) return false;
        if (!estadoPersistidoCoincide(estadoEsperado, actual)) return false;
    }
    return true;
}
async function verificarEstadoComercialPersistido(tipo, registroEsperado, movimientoEsperado, movimientosEsperados) {
    const [movimientosBD, registrosBD, inventarioBD] = await Promise.all([
        obtenerMovimientosBD(),
        tipo === "COMPRA" ? obtenerComprasBD() : obtenerVentasBD(),
        obtenerInventariosBD()
    ]);
    const movimiento = movimientosBD.find(function(item) { return Number(item.id) === Number(movimientoEsperado.id); });
    const registro = registrosBD.find(function(item) { return String(item.id) === String(registroEsperado.id); });
    if (!movimiento || !registro || Number(registro.movimientoId) !== Number(movimientoEsperado.id)) return false;
    if (!estadoPersistidoCoincide(registroEsperado, registro) || !estadoPersistidoCoincide(movimientoEsperado, movimiento)) return false;
    const esperadoInventario = construirMapaInventarioDesdeMovimientos(movimientosEsperados || []);
    return compararInventarioPersistidoConEsperado(esperadoInventario, inventarioBD);
}
async function publicarEventoComercialSeguro(tipoEvento, tipoEntidad, registro, accion) {
    if (typeof publicarEventoContable !== "function" || typeof TIPOS_EVENTOS === "undefined") return null;
    return publicarEventoContable(
        tipoEvento,
        String(tipoEntidad || "operacion_comercial").toLowerCase(),
        String(registro?.id || registro?.movimientoId || "sin-id"),
        {
            accion: String(accion || "actualizar"),
            tipo: String(tipoEntidad || "").toUpperCase(),
            fecha: String(registro?.fecha || ""),
            periodo: obtenerPeriodoComercial(registro?.fecha),
            documento: String(registro?.documento || ""),
            movimientoId: registro?.movimientoId ?? null
        }
    );
}
async function persistirOperacionComercial(tipo, registro, movimiento, movimientosPrevios) {
validarPartidaComercial(movimiento);
const cambios = [{ almacen: ALMACEN_MOVIMIENTOS, accion: "agregar", valor: movimiento }, { almacen: tipo === "COMPRA" ? ALMACEN_COMPRAS : ALMACEN_VENTAS, accion: "agregar", valor: registro }];
await aplicarCambioContableBD(cambios.concat(cambiosInventarioComercial((movimientosPrevios || []).concat([movimiento]))), movimientosPrevios || []);
return true;
}

function obtenerPeriodoComercial(fecha) {
    return String(fecha || "").slice(0, 7);
}
function obtenerCierreIVAPeriodo(movimientos, periodo) {
    const referencia = "IVA-CIERRE-" + String(periodo || "");
    return (movimientos || []).find(function(m) { return String(m.referencia || "") === referencia; }) || null;
}
function validarPeriodosEditablesIVA(fechaAnterior, fechaNueva, movimientos) {
    const periodos = new Set([obtenerPeriodoComercial(fechaAnterior), obtenerPeriodoComercial(fechaNueva)]);
    periodos.forEach(function(periodo) {
        if (!/^\d{4}-\d{2}$/.test(periodo)) throw new Error("El período de la operación no es válido.");
        if (obtenerCierreIVAPeriodo(movimientos, periodo)) {
            throw new Error("El período " + periodo + " ya tiene cierre de IVA. Reabra o elimine el cierre antes de editar la operación.");
        }
    });
    return true;
}
function prepararPlanEdicionComercial(tipo, idOriginal, registros, movimientos, fechaNueva) {
    const registroAnterior = (registros || []).find(function(item) { return String(item.id) === String(idOriginal); });
    if (!registroAnterior) throw new Error("No se encontró la operación que se desea editar.");
    const movimientoAnterior = (movimientos || []).find(function(item) { return Number(item.id) === Number(registroAnterior.movimientoId); });
    if (!movimientoAnterior) throw new Error("La operación no tiene una partida contable asociada válida.");
    validarPeriodosEditablesIVA(registroAnterior.fecha, fechaNueva, movimientos);
    const movimientosRestantes = (movimientos || []).filter(function(item) { return Number(item.id) !== Number(movimientoAnterior.id); });
    return {
        tipo: tipo,
        registroAnterior: registroAnterior,
        movimientoAnterior: movimientoAnterior,
        movimientosOriginales: movimientos || [],
        movimientosRestantes: movimientosRestantes
    };
}
async function persistirEdicionComercial(plan, registroNuevo, movimientoNuevo) {
if (!plan) throw new Error("No existe un plan de edición válido.");
validarPartidaComercial(movimientoNuevo);
const almacen = plan.tipo === "COMPRA" ? ALMACEN_COMPRAS : ALMACEN_VENTAS;
await aplicarCambioContableBD([
{ almacen: ALMACEN_MOVIMIENTOS, accion: "eliminar", clave: plan.movimientoAnterior.id },
{ almacen: almacen, accion: "eliminar", clave: plan.registroAnterior.id },
{ almacen: ALMACEN_MOVIMIENTOS, accion: "agregar", valor: movimientoNuevo },
{ almacen: almacen, accion: "agregar", valor: registroNuevo }
].concat(cambiosInventarioComercial(plan.movimientosRestantes.concat([movimientoNuevo]))), plan.movimientosOriginales);
return registroNuevo;
}

function validarEliminacionComercial(tipo, id, registros, movimientos) {
    const registro = (registros || []).find(function(item) { return String(item.id) === String(id); });
    if (!registro) throw new Error("No se encontró la operación que se desea eliminar.");
    const movimiento = (movimientos || []).find(function(item) { return Number(item.id) === Number(registro.movimientoId); });
    if (!movimiento) throw new Error("La operación no tiene una partida contable asociada válida.");
    const periodo = String(registro.fecha || "").slice(0, 7);
    const referenciaCierre = "IVA-CIERRE-" + periodo;
    const cierreIVA = (movimientos || []).find(function(item) { return item.referencia === referenciaCierre; }) || null;
    const idsExcluir = new Set([Number(movimiento.id)]);
    if (cierreIVA) idsExcluir.add(Number(cierreIVA.id));
    const movimientosRestantes = (movimientos || []).filter(function(item) { return !idsExcluir.has(Number(item.id)); });

    // Verificación previa sin mutar IndexedDB: protege inventario y costos históricos.
    construirMapaInventarioDesdeMovimientos(movimientosRestantes);
    return {
        tipo: tipo,
        registro: registro,
        movimiento: movimiento,
        cierreIVA: cierreIVA,
        movimientosOriginales: movimientos,
        movimientosRestantes: movimientosRestantes,
        periodo: periodo
    };
}

async function restaurarOperacionComercialEliminada(plan) {
const cambios = [
{ almacen: ALMACEN_MOVIMIENTOS, accion: "guardar", valor: plan.movimiento },
{ almacen: plan.tipo === "COMPRA" ? ALMACEN_COMPRAS : ALMACEN_VENTAS, accion: "guardar", valor: plan.registro }
];
if (plan.cierreIVA) cambios.push({ almacen: ALMACEN_MOVIMIENTOS, accion: "guardar", valor: plan.cierreIVA });
await aplicarCambioContableBD(cambios.concat(cambiosInventarioComercial(plan.movimientosOriginales)));
}

/* ALGORITMIA 5 FASES — eliminación comercial. */
function fase1EntradaEliminacionComercial(tipo, id) {
    const tipoNormalizado = String(tipo || "").trim().toUpperCase();
    const idNormalizado = String(id || "").trim();
    if (tipoNormalizado !== "COMPRA" && tipoNormalizado !== "VENTA") throw new Error("Tipo de operación comercial no válido para eliminación.");
    if (!idNormalizado) throw new Error("La operación a eliminar no tiene un identificador válido.");
    return { tipo: tipoNormalizado, id: idNormalizado };
}
async function fase2ValidarEliminacionComercial(entrada) {
    const [movimientos, registros] = await Promise.all([
        obtenerMovimientosBD(),
        entrada.tipo === "COMPRA" ? obtenerComprasBD() : obtenerVentasBD()
    ]);
    return validarEliminacionComercial(entrada.tipo, entrada.id, registros, movimientos);
}
function fase3ProcesarEliminacionComercial(plan) {
    // Simula el estado final sin mutar IndexedDB; falla si la historia de inventario quedaría inconsistente.
    const inventarioEsperado = construirMapaInventarioDesdeMovimientos(plan.movimientosRestantes);
    return { plan: plan, inventarioEsperado: inventarioEsperado };
}
async function fase4PersistirEliminacionComercial(proceso) {
const plan = proceso.plan;
const cambios = [
{ almacen: ALMACEN_MOVIMIENTOS, accion: "eliminar", clave: plan.movimiento.id },
{ almacen: plan.tipo === "COMPRA" ? ALMACEN_COMPRAS : ALMACEN_VENTAS, accion: "eliminar", clave: plan.registro.id }
];
if (plan.cierreIVA) cambios.push({ almacen: ALMACEN_MOVIMIENTOS, accion: "eliminar", clave: plan.cierreIVA.id });
await aplicarCambioContableBD(cambios.concat(cambiosInventarioComercial(plan.movimientosRestantes)), plan.movimientosOriginales);
return proceso;
}
async function fase5VerificarEliminacionComercial(proceso) {
    const plan = proceso.plan;
    try {
const [movimientosVerificacion, registrosVerificacion, inventarioVerificacion] = await Promise.all([obtenerMovimientosBD(), plan.tipo === "COMPRA" ? obtenerComprasBD() : obtenerVentasBD(), obtenerInventariosBD()]);
const persisteMovimiento = movimientosVerificacion.some(function(m) { return Number(m.id) === Number(plan.movimiento.id) || (plan.cierreIVA && Number(m.id) === Number(plan.cierreIVA.id)); });
const persisteRegistro = registrosVerificacion.some(function(item) { return String(item.id) === String(plan.registro.id); });
if (persisteMovimiento || persisteRegistro || !compararInventarioPersistidoConEsperado(proceso.inventarioEsperado, inventarioVerificacion)) throw new Error("La fase 5 no pudo verificar completamente la eliminación comercial.");
} catch (error) {
await restaurarOperacionComercialEliminada(plan);
throw error;
}
    const resultado = {
        eliminado: true,
        tipo: plan.tipo,
        registro: plan.registro,
        cierreIVAEliminado: Boolean(plan.cierreIVA),
        periodo: plan.periodo
    };
    const tipoEvento = plan.tipo === "COMPRA" ? TIPOS_EVENTOS.COMPRA_ELIMINADA : TIPOS_EVENTOS.VENTA_ELIMINADA;
    await publicarEventoComercialSeguro(tipoEvento, plan.tipo, plan.registro, "eliminar");
    return resultado;
}
async function eliminarOperacionComercial(tipo, id) {
return ejecutarConBloqueoContable(async function() {
    // FASE 1 — Entrada.
    const entrada = fase1EntradaEliminacionComercial(tipo, id);
    // FASE 2 — Validación y obtención del plan actual.
    const plan = await fase2ValidarEliminacionComercial(entrada);
    // FASE 3 — Simulación determinista del estado posterior.
    const proceso = fase3ProcesarEliminacionComercial(plan);
    // FASE 4 — Persistencia/rollback.
    await fase4PersistirEliminacionComercial(proceso);
    // FASE 5 — Relectura, verificación e EDA.
    return fase5VerificarEliminacionComercial(proceso);
});
}

function eliminarCompra(id) { return eliminarOperacionComercial("COMPRA", id); }
function eliminarVenta(id) { return eliminarOperacionComercial("VENTA", id); }

async function eliminarOperacionComercialPorMovimiento(tipo, movimientoId) {
    const tipoNormalizado = String(tipo || "").trim().toUpperCase();
    const registros = tipoNormalizado === "COMPRA" ? await obtenerComprasBD() : await obtenerVentasBD();
    const registro = (registros || []).find(function(item) { return Number(item.movimientoId) === Number(movimientoId); });
    if (!registro) throw new Error("No se encontró la operación comercial asociada a la partida seleccionada.");
    return eliminarOperacionComercial(tipoNormalizado, registro.id);
}

function cambiosInventarioComercial(movimientos) {
return cambiosInventarioDesdeMovimientos(movimientos);
}
async function recuperarVerificacionComercial(tipo, procesada) {
const plan = procesada.planRecuperacion;
const cambios = [
{ almacen: ALMACEN_MOVIMIENTOS, accion: "eliminar", clave: procesada.movimiento.id },
{ almacen: tipo === "COMPRA" ? ALMACEN_COMPRAS : ALMACEN_VENTAS, accion: "eliminar", clave: procesada.registro.id }
];
if (plan.registroAnterior) {
cambios.push({ almacen: ALMACEN_MOVIMIENTOS, accion: "guardar", valor: plan.movimientoAnterior });
cambios.push({ almacen: tipo === "COMPRA" ? ALMACEN_COMPRAS : ALMACEN_VENTAS, accion: "guardar", valor: plan.registroAnterior });
}
await aplicarCambioContableBD(cambios.concat(cambiosInventarioComercial(plan.movimientosOriginales)));
}

// Inicio fase 1 — Identidad fiscal explícita, independiente de documento interno.
function normalizarIdentificadoresFiscales(datos, tipoEsperado) {
const campos = ["claseDocumento", "tipoDocumento", "codigoGeneracion", "numeroControl", "selloRecepcion", "horaEmision"];
const salida = {};
for (const campo of campos) {
const valor = datos[campo];
if (valor !== undefined && valor !== null && typeof valor !== "string") throw new Error("El campo fiscal " + campo + " debe ser texto.");
salida[campo] = String(valor || "").trim();
}
if (!campos.some(function(campo) { return salida[campo]; })) return {};
if (salida.claseDocumento !== "4") throw new Error("Seleccione DTE para registrar identificadores electrónicos. Los documentos físicos requieren su estructura fiscal específica.");
salida.tipoDocumento = salida.tipoDocumento || tipoEsperado;
if (salida.horaEmision.length === 5) salida.horaEmision += ":00";
if (salida.horaEmision && !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(salida.horaEmision)) throw new Error("La hora de emisión debe usar HH:mm:ss.");
salida.codigoGeneracion = salida.codigoGeneracion.toUpperCase();
salida.numeroControl = salida.numeroControl.toUpperCase();
if (salida.tipoDocumento !== tipoEsperado) throw new Error("El tipo de DTE no corresponde al flujo contable seleccionado (" + tipoEsperado + ").");
if (!/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(salida.codigoGeneracion)) throw new Error("Ingrese el Código de Generación real del DTE en formato UUID.");
const control = salida.numeroControl.match(/^DTE-(01|03)-[A-Z0-9]{8}-[0-9]{15}$/);
if (!control || control[1] !== salida.tipoDocumento) throw new Error("Ingrese el Número de Control real y del mismo tipo de DTE.");
if (salida.selloRecepcion && !/^[A-Za-z0-9]+$/.test(salida.selloRecepcion)) throw new Error("El Sello de Recepción debe conservar su valor alfanumérico original.");
return salida;
}
// Fin fase 1
// Inicio fase 2 — Todas las líneas de un CSV deben declarar la misma identidad.
function identificadoresFiscalesDesdeCSV(grupo, tipoEsperado) {
let esperado;
for (const fila of grupo) {
const actual = normalizarIdentificadoresFiscales({claseDocumento:fila.clase_documento,tipoDocumento:fila.tipo_documento,codigoGeneracion:fila.codigo_generacion,numeroControl:fila.numero_control,selloRecepcion:fila.sello_recepcion,horaEmision:fila.hora_emision}, tipoEsperado);
if (esperado && !estadoPersistidoCoincide(esperado, actual)) throw new Error("Los identificadores fiscales cambian entre líneas del mismo documento.");
esperado = actual;
}
return esperado || {};
}
function validarIdentidadFiscalDuplicada(entrada, registros, idExcluir) {
if (!entrada.codigoGeneracion) return;
if (registros.some(function(registro) { return String(registro.id) !== String(idExcluir || "") && registro.codigoGeneracion === entrada.codigoGeneracion; })) throw new Error("El Código de Generación ya existe en esta clase de operación.");
}
// Fin fase 2
