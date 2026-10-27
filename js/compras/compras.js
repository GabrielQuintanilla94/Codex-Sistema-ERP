const CUENTA_INVENTARIO_COMPRA = "1104";
const CUENTA_PROVEEDORES = "2101";

function validarLineaCompra(linea) {
    const sku = String(linea.sku || "").trim();
    const descripcion = String(linea.descripcion || "").trim();
    const cantidad = Number(linea.cantidad);
    const monto = Number(linea.montoGravado);
    if (!sku) throw new Error("El SKU de compra es obligatorio.");
    if (!descripcion) throw new Error("La descripción de compra es obligatoria.");
    if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error("La cantidad de compra debe ser mayor que cero.");
    if (!Number.isFinite(monto) || monto <= 0) throw new Error("El monto gravado de compra debe ser mayor que cero.");
    return { sku: sku, descripcion: descripcion, cantidad: cantidad, montoGravado: comercialADolares(comercialACentavos(monto)) };
}

function normalizarLineaCompraParaVista(linea) {
    const monto = Number(linea?.montoGravado || 0);
    return {
        sku: String(linea?.sku || "").trim(),
        descripcion: String(linea?.descripcion || "").trim(),
        cantidad: Number(linea?.cantidad || 0),
        montoGravado: Number.isFinite(monto) && monto > 0 ? comercialADolares(comercialACentavos(monto)) : 0
    };
}

function verificarResumenCompraTresNiveles(lineas, baseCentavos, calculoIVA) {
    const sumaLineasCentavos = (lineas || []).reduce(function(total, linea) {
        return total + comercialACentavos(linea.montoGravado || 0);
    }, 0);
    const ivaCentavos = comercialACentavos(calculoIVA.iva || 0);
    const totalCentavos = comercialACentavos(calculoIVA.total || 0);
    const nivel1 = sumaLineasCentavos === baseCentavos;
    const nivel2 = Boolean(calculoIVA.verificacion?.valido) && totalCentavos === baseCentavos + ivaCentavos;
    const nivel3 = baseCentavos === totalCentavos - ivaCentavos && baseCentavos >= 0 && ivaCentavos >= 0;
    return {
        valido: nivel1 && nivel2 && nivel3,
        niveles: [
            { nivel: 1, nombre: "Suma de líneas = base", valido: nivel1 },
            { nivel: 2, nombre: "IVA y total verificados", valido: nivel2 },
            { nivel: 3, nombre: "Comprobación inversa", valido: nivel3 }
        ]
    };
}

function calcularResumenCompra(lineasEntrada, opciones) {
    const estricto = opciones?.estricto !== false;
    const lineas = (lineasEntrada || []).map(function(linea) {
        return estricto ? validarLineaCompra(linea) : normalizarLineaCompraParaVista(linea);
    });
    if (estricto && !lineas.length) throw new Error("La compra debe contener al menos un material.");
    const baseCentavos = lineas.reduce(function(total, linea) {
        return total + comercialACentavos(linea.montoGravado || 0);
    }, 0);
    const calculoIVA = calcularIVA(comercialADolares(baseCentavos));
    const verificacion = verificarResumenCompraTresNiveles(lineas, baseCentavos, calculoIVA);
    if (!verificacion.valido) throw new Error("El resumen de compra no superó la triple verificación matemática.");
    return {
        lineas: lineas,
        baseCentavos: baseCentavos,
        base: comercialADolares(baseCentavos),
        iva: calculoIVA.iva,
        total: calculoIVA.total,
        verificacion: verificacion
    };
}

function verificarCompraConstruidaTresNiveles(registro, movimiento, resumen) {
    const inventarioCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        return String(linea.codigo || "") === CUENTA_INVENTARIO_COMPRA
            ? total + comercialACentavos(linea.debe || 0)
            : total;
    }, 0);
    const ivaCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        return String(linea.codigo || "") === CUENTA_IVA_CREDITO
            ? total + comercialACentavos(linea.debe || 0)
            : total;
    }, 0);
    const proveedoresCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        return String(linea.codigo || "") === CUENTA_PROVEEDORES
            ? total + comercialACentavos(linea.haber || 0)
            : total;
    }, 0);
    const baseCentavos = comercialACentavos(registro.comprasGravadas);
    const creditoCentavos = comercialACentavos(registro.ivaCredito);
    const totalCentavos = comercialACentavos(registro.total);
    const nivel1 = Boolean(resumen.verificacion?.valido) && inventarioCentavos === baseCentavos;
    const nivel2 = ivaCentavos === creditoCentavos && proveedoresCentavos === totalCentavos;
    let nivel3 = false;
    try {
        nivel3 = validarPartidaComercial(movimiento) === true && totalCentavos === baseCentavos + creditoCentavos;
    } catch (error) {
        nivel3 = false;
    }
    return {
        valido: nivel1 && nivel2 && nivel3,
        niveles: [
            { nivel: 1, nombre: "Inventario = base gravada", valido: nivel1 },
            { nivel: 2, nombre: "IVA y proveedor = resumen", valido: nivel2 },
            { nivel: 3, nombre: "Partida doble y total", valido: nivel3 }
        ]
    };
}

function construirCompra(datos, movimientosPrevios, marcaTiempo) {
    const fecha = normalizarFechaComercial(datos.fecha);
    const documento = normalizarDocumento(datos.documento);
    const proveedor = String(datos.proveedor || "").trim();
    const nrc = String(datos.nrc || "").trim();
    if (!proveedor || !nrc) throw new Error("Seleccione un proveedor con NRC.");

    const resumen = calcularResumenCompra(datos.lineas || [], { estricto: true });
    const partida = resumen.lineas.map(function(linea) {
        return {
            codigo: CUENTA_INVENTARIO_COMPRA,
            cuenta: "Inventario de materiales",
            descripcion: linea.descripcion,
            tipoInventario: "Entrada",
            sku: linea.sku,
            cantidadInventario: linea.cantidad,
            descripcionMaterial: linea.descripcion,
            debe: linea.montoGravado,
            haber: 0
        };
    });
    partida.push({ codigo: CUENTA_IVA_CREDITO, cuenta: "IVA Crédito Fiscal", descripcion: "IVA crédito fiscal - " + documento, debe: resumen.iva, haber: 0 });
    partida.push({ codigo: CUENTA_PROVEEDORES, cuenta: "Cuentas por pagar", descripcion: proveedor, debe: 0, haber: resumen.total });

    const selloTiempo = String(marcaTiempo || datos.creadoEn || new Date().toISOString());
    const movimientoBase = {
        id: siguienteIdMovimientoComercial(movimientosPrevios),
        numero: "COMP-" + documento,
        fecha: fecha,
        referencia: documento,
        concepto: "Compra de materiales - " + proveedor,
        origen: "Compra",
        creadoEn: selloTiempo,
        partida: partida
    };
    const movimiento = prepararMovimientoConInventario(movimientoBase, movimientosPrevios || []);
    const registro = {
        id: crearIdOperacion("COMPRA", fecha, documento, nrc),
        movimientoId: movimiento.id,
        fecha: fecha,
        documento: documento,
        proveedor: proveedor,
        nrc: nrc,
        giro: String(datos.giro || "").trim(),
        lineas: resumen.lineas,
        comprasGravadas: resumen.base,
        ivaCredito: resumen.iva,
        total: resumen.total,
        tipoOperacion: 1,
        clasificacion: 1,
        sector: 2,
        tipoCostoGasto: 5,
        creadoEn: selloTiempo
    };
    const verificacion = verificarCompraConstruidaTresNiveles(registro, movimiento, resumen);
    if (!verificacion.valido) throw new Error("La compra no superó la triple verificación antes de contabilizarse.");
    return { registro: registro, movimiento: movimiento, verificacion: verificacion };
}

/* ALGORITMIA 5 FASES — alta y edición de compras. */
function fase1EntradaCompra(datos) {
    if (!datos || typeof datos !== "object") throw new Error("La entrada de compra no es válida.");
    return {
        fecha: normalizarFechaComercial(datos.fecha),
        documento: normalizarDocumento(datos.documento),
        nrc: String(datos.nrc || "").trim(),
        proveedor: String(datos.proveedor || "").trim(),
        giro: String(datos.giro || "").trim(),
        lineas: Array.isArray(datos.lineas) ? datos.lineas.map(function(linea) { return { ...linea }; }) : [],
        creadoEn: datos.creadoEn ? String(datos.creadoEn) : ""
    };
}
async function fase2ValidarCompra(entrada, idExcluir) {
    const [movimientos, terceros, compras] = await Promise.all([obtenerMovimientosBD(), obtenerTercerosBD(), obtenerComprasBD()]);
    const tercero = terceros.find(function(t) { return String(t.nrc) === String(entrada.nrc); });
    if (!tercero) throw new Error("El NRC del proveedor no existe en el catálogo de terceros.");
    const canonica = { ...entrada, proveedor: tercero.razonSocial, nrc: tercero.nrc, giro: tercero.giro || "" };
    validarPeriodosEditablesIVA(canonica.fecha, canonica.fecha, movimientos);
    const id = crearIdOperacion("COMPRA", canonica.fecha, canonica.documento, canonica.nrc);
    const duplicada = compras.some(function(c) { return String(c.id) !== String(idExcluir || "") && String(c.id) === String(id); });
    if (duplicada) throw new Error("La compra ya fue registrada para ese proveedor y documento.");
    calcularResumenCompra(canonica.lineas, { estricto: true });
    return { canonica: canonica, movimientos: movimientos, compras: compras, id: id };
}
function fase3ProcesarCompra(validacion, movimientosBase, marcaTiempo) {
    return construirCompra(validacion.canonica, movimientosBase || validacion.movimientos, marcaTiempo || validacion.canonica.creadoEn || new Date().toISOString());
}
async function fase4PersistirCompra(procesada, movimientosPrevios) {
    procesada.planRecuperacion = { movimientosOriginales: movimientosPrevios };
    await persistirOperacionComercial("COMPRA", procesada.registro, procesada.movimiento, movimientosPrevios);
    return procesada;
}
async function fase5VerificarCompra(procesada, movimientosEsperados, tipoEvento, accion) {
    // Inicio fase 5 — Relectura completa; recuperar antes de cualquier evento.
try {
const ok = await verificarEstadoComercialPersistido("COMPRA", procesada.registro, procesada.movimiento, movimientosEsperados);
if (!ok) throw new Error("La fase 5 no pudo verificar registro, partida e inventario de compras.");
} catch (error) {
await recuperarVerificacionComercial("COMPRA", procesada);
throw error;
}
// Fin fase 5
    if (tipoEvento) await publicarEventoComercialSeguro(tipoEvento, "COMPRA", procesada.registro, accion);
    return procesada.registro;
}

async function registrarCompra(datos) {
return ejecutarConBloqueoContable(async function() {
    // FASE 1 — Entrada y normalización.
    const entrada = fase1EntradaCompra(datos);
    // FASE 2 — Validación de tercero, duplicidad e invariantes matemáticos.
    const validacion = await fase2ValidarCompra(entrada, null);
    // FASE 3 — Procesamiento determinista: registro + partida + inventario proyectado.
    const procesada = fase3ProcesarCompra(validacion, validacion.movimientos, entrada.creadoEn || new Date().toISOString());
    // FASE 4 — Persistencia aislada con rollback en persistirOperacionComercial().
    await fase4PersistirCompra(procesada, validacion.movimientos);
    // FASE 5 — Relectura/verificación y solo entonces evento EDA.
    return fase5VerificarCompra(
        procesada,
        validacion.movimientos.concat([procesada.movimiento]),
        TIPOS_EVENTOS.COMPRA_REGISTRADA,
        "registrar"
    );
});
}

async function editarCompra(idOriginal, datos) {
return ejecutarConBloqueoContable(async function() {
    // FASE 1 — Entrada y normalización.
    const entrada = fase1EntradaCompra(datos);
    // FASE 2 — Validación contra estado actual y período IVA.
    const validacion = await fase2ValidarCompra(entrada, idOriginal);
    const plan = prepararPlanEdicionComercial("COMPRA", idOriginal, validacion.compras, validacion.movimientos, entrada.fecha);
    // FASE 3 — Reconstrucción de la operación sin la versión anterior.
    const procesada = fase3ProcesarCompra(validacion, plan.movimientosRestantes, plan.registroAnterior.creadoEn || new Date().toISOString());
    const marcaEdicion = new Date().toISOString();
    procesada.registro.editadoEn = marcaEdicion;
    procesada.movimiento.editadoEn = marcaEdicion;
    construirMapaInventarioDesdeMovimientos(plan.movimientosRestantes.concat([procesada.movimiento]));
    // FASE 4 — Sustitución persistente con recuperación automática.
    procesada.planRecuperacion = plan;
    await persistirEdicionComercial(plan, procesada.registro, procesada.movimiento);
    // FASE 5 — Relectura/verificación completa y evento EDA posterior.
    return fase5VerificarCompra(
        procesada,
        plan.movimientosRestantes.concat([procesada.movimiento]),
        TIPOS_EVENTOS.COMPRA_EDITADA,
        "editar"
    );
});
}

async function importarCompras(registros) {
    const grupos = agruparPorDocumento(registros, "nrc");
    const resultados = [];
    for (const grupo of grupos) {
        const cabecera = grupo[0];
        const datos = {
            fecha: cabecera.fecha,
            documento: cabecera.documento,
            proveedor: cabecera.proveedor,
            nrc: cabecera.nrc,
            lineas: grupo.map(function(r) {
                return { sku: r.sku, descripcion: r.descripcion, cantidad: Number(r.cantidad), montoGravado: Number(r.monto_gravado) };
            })
        };
        try {
            const registro = await registrarCompra(datos);
            resultados.push({ ok: true, documento: datos.documento, registro: registro });
        } catch (error) {
            resultados.push({ ok: false, documento: datos.documento, error: error.message });
        }
    }
    return resultados;
}
