const CUENTA_VENTAS_MATERIALES = "4101";
const CUENTA_CAJA = "1101";
const CUENTA_CLIENTES = "1103";

function normalizarTipoCliente(tipo) {
    const valor = String(tipo || "").trim().toUpperCase();
    if (valor === "CONTRIBUYENTE" || valor === "CONSUMIDOR_FINAL") return valor;
    throw new Error("El tipo de cliente debe ser CONTRIBUYENTE o CONSUMIDOR_FINAL.");
}

function validarLineaVenta(linea) {
    const sku = String(linea.sku || "").trim();
    const cantidad = Number(linea.cantidad);
    const precio = Number(linea.precioUnitario);
    if (!sku) throw new Error("El SKU de venta es obligatorio.");
    if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error("La cantidad de venta debe ser mayor que cero.");
    if (!Number.isFinite(precio) || precio <= 0) throw new Error("El precio unitario debe ser mayor que cero.");
    return {
        sku: sku,
        cantidad: cantidad,
        precioUnitario: comercialADolares(comercialACentavos(precio))
    };
}

function normalizarLineaVentaParaVista(linea) {
    const cantidad = Number(linea?.cantidad || 0);
    const precio = Number(linea?.precioUnitario || 0);
    return {
        sku: String(linea?.sku || "").trim(),
        cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 0,
        precioUnitario: Number.isFinite(precio) && precio > 0 ? comercialADolares(comercialACentavos(precio)) : 0
    };
}

function calcularResumenVenta(lineasEntrada, opciones) {
    const estricto = opciones?.estricto !== false;
    const lineas = (lineasEntrada || []).map(function(linea) {
        return estricto ? validarLineaVenta(linea) : normalizarLineaVentaParaVista(linea);
    });
    if (estricto && !lineas.length) throw new Error("La venta debe contener al menos un producto.");
    const subtotalesCentavos = lineas.map(function(linea) {
        return Math.round(Number(linea.cantidad || 0) * comercialACentavos(linea.precioUnitario || 0));
    });
    const baseCentavos = subtotalesCentavos.reduce(function(total, valor) { return total + valor; }, 0);
    const calculoIVA = calcularIVA(comercialADolares(baseCentavos));
    const ivaCentavos = comercialACentavos(calculoIVA.iva);
    const totalCentavos = comercialACentavos(calculoIVA.total);
    const nivel1 = baseCentavos === subtotalesCentavos.reduce(function(total, valor) { return total + valor; }, 0);
    const nivel2 = Boolean(calculoIVA.verificacion?.valido) && totalCentavos === baseCentavos + ivaCentavos;
    const nivel3 = baseCentavos === totalCentavos - ivaCentavos && baseCentavos >= 0 && ivaCentavos >= 0;
    const verificacion = {
        valido: nivel1 && nivel2 && nivel3,
        niveles: [
            { nivel: 1, nombre: "Suma de líneas = base", valido: nivel1 },
            { nivel: 2, nombre: "IVA y total verificados", valido: nivel2 },
            { nivel: 3, nombre: "Comprobación inversa", valido: nivel3 }
        ]
    };
    if (!verificacion.valido) throw new Error("El resumen de venta no superó la triple verificación matemática.");
    return {
        lineas: lineas,
        subtotalesCentavos: subtotalesCentavos,
        baseCentavos: baseCentavos,
        base: comercialADolares(baseCentavos),
        iva: calculoIVA.iva,
        total: calculoIVA.total,
        verificacion: verificacion
    };
}

function validarExistenciaVenta(lineas, inventarioActual) {
    const inventarioPorSKU = new Map((inventarioActual || []).map(function(producto) {
        return [String(producto.sku), producto];
    }));
    const requeridoPorSKU = new Map();
    (lineas || []).forEach(function(linea) {
        requeridoPorSKU.set(linea.sku, Number(requeridoPorSKU.get(linea.sku) || 0) + Number(linea.cantidad || 0));
    });
    requeridoPorSKU.forEach(function(cantidad, sku) {
        const producto = inventarioPorSKU.get(sku);
        if (!producto) throw new Error("El SKU " + sku + " no existe en inventario.");
        if (cantidad > Number(producto.cantidad || 0)) {
            throw new Error("La venta acumulada de " + sku + " supera la existencia disponible (" + Number(producto.cantidad || 0) + ").");
        }
    });
    return inventarioPorSKU;
}

function verificarVentaConstruidaTresNiveles(registro, movimiento, resumen) {
    const ventasCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        return String(linea.codigo || "") === CUENTA_VENTAS_MATERIALES ? total + comercialACentavos(linea.haber || 0) : total;
    }, 0);
    const ivaCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        return String(linea.codigo || "") === CUENTA_IVA_DEBITO ? total + comercialACentavos(linea.haber || 0) : total;
    }, 0);
    const cobroCentavos = (movimiento.partida || []).reduce(function(total, linea) {
        const codigo = String(linea.codigo || "");
        return codigo === CUENTA_CAJA || codigo === CUENTA_CLIENTES ? total + comercialACentavos(linea.debe || 0) : total;
    }, 0);
    const baseCentavos = comercialACentavos(registro.ventasGravadas);
    const debitoCentavos = comercialACentavos(registro.ivaDebito);
    const totalCentavos = comercialACentavos(registro.total);
    const nivel1 = Boolean(resumen.verificacion?.valido) && ventasCentavos === baseCentavos;
    const nivel2 = ivaCentavos === debitoCentavos && cobroCentavos === totalCentavos;
    let nivel3 = false;
    try {
        nivel3 = validarPartidaComercial(movimiento) === true && totalCentavos === baseCentavos + debitoCentavos;
    } catch (error) {
        nivel3 = false;
    }
    return {
        valido: nivel1 && nivel2 && nivel3,
        niveles: [
            { nivel: 1, nombre: "Ventas = base gravada", valido: nivel1 },
            { nivel: 2, nombre: "IVA y cobro = resumen", valido: nivel2 },
            { nivel: 3, nombre: "Partida doble y total", valido: nivel3 }
        ]
    };
}

function construirVenta(datos, movimientosPrevios, inventarioActual, marcaTiempo) {
    const fecha = normalizarFechaComercial(datos.fecha);
    const documento = normalizarDocumento(datos.documento);
    const tipoCliente = normalizarTipoCliente(datos.tipoCliente);
    const cliente = tipoCliente === "CONSUMIDOR_FINAL" ? "Consumidor final" : String(datos.cliente || "").trim();
    const nrc = tipoCliente === "CONSUMIDOR_FINAL" ? "" : String(datos.nrc || "").trim();
    if (tipoCliente === "CONTRIBUYENTE" && (!cliente || !nrc)) throw new Error("La venta a contribuyente requiere cliente y NRC.");

    const resumen = calcularResumenVenta(datos.lineas || [], { estricto: true });
    const inventarioPorSKU = validarExistenciaVenta(resumen.lineas, inventarioActual);
    const cuentaCobro = tipoCliente === "CONTRIBUYENTE" ? CUENTA_CLIENTES : CUENTA_CAJA;
    const nombreCuentaCobro = tipoCliente === "CONTRIBUYENTE" ? "Cuentas por cobrar" : "Caja";
    const partida = [
        { codigo: cuentaCobro, cuenta: nombreCuentaCobro, descripcion: cliente, debe: resumen.total, haber: 0 },
        { codigo: CUENTA_VENTAS_MATERIALES, cuenta: "Ventas de materiales", descripcion: "Venta " + documento, debe: 0, haber: resumen.base },
        { codigo: CUENTA_IVA_DEBITO, cuenta: "IVA Débito Fiscal", descripcion: "IVA débito fiscal - " + documento, debe: 0, haber: resumen.iva }
    ];
    resumen.lineas.forEach(function(linea) {
        const producto = inventarioPorSKU.get(linea.sku);
        partida.push({
            codigo: CUENTA_INVENTARIO_MATERIALES,
            cuenta: "Inventario de materiales",
            descripcion: producto.descripcion || linea.sku,
            tipoInventario: "Salida",
            sku: linea.sku,
            cantidadInventario: linea.cantidad,
            descripcionMaterial: producto.descripcion || linea.sku,
            debe: 0,
            haber: 0
        });
    });
    const selloTiempo = String(marcaTiempo || datos.creadoEn || new Date().toISOString());
    const movimientoBase = {
        id: siguienteIdMovimientoComercial(movimientosPrevios),
        numero: "VENTA-" + documento,
        fecha: fecha,
        referencia: documento,
        concepto: "Venta de materiales - " + cliente,
        origen: "Venta",
        creadoEn: selloTiempo,
        partida: partida
    };
    const movimiento = prepararMovimientoConInventario(movimientoBase, movimientosPrevios || []);
    const registro = {
        id: crearIdOperacion("VENTA", fecha, documento, nrc || "CF"),
        movimientoId: movimiento.id,
        fecha: fecha,
        documento: documento,
        tipoCliente: tipoCliente,
        cliente: cliente,
        nrc: nrc,
        giro: String(datos.giro || "").trim(),
        lineas: resumen.lineas,
        ventasGravadas: resumen.base,
        ivaDebito: resumen.iva,
        total: resumen.total,
        tipoOperacion: 1,
        tipoIngreso: 2,
        creadoEn: selloTiempo
    };
    const verificacion = verificarVentaConstruidaTresNiveles(registro, movimiento, resumen);
    if (!verificacion.valido) throw new Error("La venta no superó la triple verificación antes de contabilizarse.");
    return { registro: registro, movimiento: movimiento, verificacion: verificacion };
}

/* ALGORITMIA 5 FASES — alta y edición de ventas. */
function fase1EntradaVenta(datos) {
    if (!datos || typeof datos !== "object") throw new Error("La entrada de venta no es válida.");
    return {
        fecha: normalizarFechaComercial(datos.fecha),
        documento: normalizarDocumento(datos.documento),
        tipoCliente: normalizarTipoCliente(datos.tipoCliente),
        cliente: String(datos.cliente || "").trim(),
        nrc: String(datos.nrc || "").trim(),
        giro: String(datos.giro || "").trim(),
        lineas: Array.isArray(datos.lineas) ? datos.lineas.map(function(linea) { return { ...linea }; }) : [],
        creadoEn: datos.creadoEn ? String(datos.creadoEn) : ""
    };
}
async function fase2ValidarVenta(entrada, idExcluir) {
    const [movimientos, inventario, ventas, terceros] = await Promise.all([
        obtenerMovimientosBD(), obtenerInventariosBD(), obtenerVentasBD(), obtenerTercerosBD()
    ]);
    let canonica = { ...entrada };
    if (entrada.tipoCliente === "CONTRIBUYENTE") {
        const tercero = terceros.find(function(t) { return String(t.nrc) === String(entrada.nrc); });
        if (!tercero) throw new Error("El NRC del cliente no existe en el catálogo de terceros.");
        canonica = { ...entrada, cliente: tercero.razonSocial, nrc: tercero.nrc, giro: tercero.giro || "" };
    }
    validarPeriodosEditablesIVA(canonica.fecha, canonica.fecha, movimientos);
    const id = crearIdOperacion("VENTA", canonica.fecha, canonica.documento, String(canonica.nrc || "CF"));
    const duplicada = ventas.some(function(v) { return String(v.id) !== String(idExcluir || "") && String(v.id) === String(id); });
    if (duplicada) throw new Error("La venta ya fue registrada para ese cliente y documento.");
    const resumen = calcularResumenVenta(canonica.lineas, { estricto: true });
    const anterior = idExcluir ? ventas.find(function(v) { return String(v.id) === String(idExcluir); }) : null;
const inventarioValidacion = anterior ? Array.from(construirMapaInventarioDesdeMovimientos(movimientos.filter(function(m) { return Number(m.id) !== Number(anterior.movimientoId); })).estados.values()) : inventario;
validarExistenciaVenta(resumen.lineas, inventarioValidacion);
    return { canonica: canonica, movimientos: movimientos, inventario: inventario, ventas: ventas, id: id };
}
function fase3ProcesarVenta(validacion, movimientosBase, inventarioBase, marcaTiempo) {
    return construirVenta(
        validacion.canonica,
        movimientosBase || validacion.movimientos,
        inventarioBase || validacion.inventario,
        marcaTiempo || validacion.canonica.creadoEn || new Date().toISOString()
    );
}
async function fase4PersistirVenta(procesada, movimientosPrevios) {
    procesada.planRecuperacion = { movimientosOriginales: movimientosPrevios };
    await persistirOperacionComercial("VENTA", procesada.registro, procesada.movimiento, movimientosPrevios);
    return procesada;
}
async function fase5VerificarVenta(procesada, movimientosEsperados, tipoEvento, accion) {
    // Inicio fase 5 — Relectura completa; recuperar antes de cualquier evento.
try {
const ok = await verificarEstadoComercialPersistido("VENTA", procesada.registro, procesada.movimiento, movimientosEsperados);
if (!ok) throw new Error("La fase 5 no pudo verificar registro, partida e inventario de ventas.");
} catch (error) {
await recuperarVerificacionComercial("VENTA", procesada);
throw error;
}
// Fin fase 5
    if (tipoEvento) await publicarEventoComercialSeguro(tipoEvento, "VENTA", procesada.registro, accion);
    return procesada.registro;
}

async function registrarVenta(datos) {
return ejecutarConBloqueoContable(async function() {
    // FASE 1 — Entrada y normalización.
    const entrada = fase1EntradaVenta(datos);
    // FASE 2 — Validación de cliente, duplicidad, stock e invariantes.
    const validacion = await fase2ValidarVenta(entrada, null);
    // FASE 3 — Procesamiento determinista: venta, costo e inventario proyectado.
    const procesada = fase3ProcesarVenta(validacion, validacion.movimientos, validacion.inventario, entrada.creadoEn || new Date().toISOString());
    // FASE 4 — Persistencia aislada con rollback.
    await fase4PersistirVenta(procesada, validacion.movimientos);
    // FASE 5 — Relectura/verificación completa y evento EDA posterior.
    return fase5VerificarVenta(
        procesada,
        validacion.movimientos.concat([procesada.movimiento]),
        TIPOS_EVENTOS.VENTA_REGISTRADA,
        "registrar"
    );
});
}

async function editarVenta(idOriginal, datos) {
return ejecutarConBloqueoContable(async function() {
    // FASE 1 — Entrada y normalización.
    const entrada = fase1EntradaVenta(datos);
    // FASE 2 — Validación contra estado actual, stock y período IVA.
    const validacion = await fase2ValidarVenta(entrada, idOriginal);
    const plan = prepararPlanEdicionComercial("VENTA", idOriginal, validacion.ventas, validacion.movimientos, entrada.fecha);
    const inventarioBase = construirMapaInventarioDesdeMovimientos(plan.movimientosRestantes);
    // FASE 3 — Reconstrucción sin la venta anterior para recalcular costo ponderado.
    const procesada = fase3ProcesarVenta(
        validacion,
        plan.movimientosRestantes,
        Array.from(inventarioBase.estados.values()),
        plan.registroAnterior.creadoEn || new Date().toISOString()
    );
    const marcaEdicion = new Date().toISOString();
    procesada.registro.editadoEn = marcaEdicion;
    procesada.movimiento.editadoEn = marcaEdicion;
    construirMapaInventarioDesdeMovimientos(plan.movimientosRestantes.concat([procesada.movimiento]));
    // FASE 4 — Sustitución persistente con recuperación automática.
    procesada.planRecuperacion = plan;
    await persistirEdicionComercial(plan, procesada.registro, procesada.movimiento);
    // FASE 5 — Verificación persistida y publicación EDA.
    return fase5VerificarVenta(
        procesada,
        plan.movimientosRestantes.concat([procesada.movimiento]),
        TIPOS_EVENTOS.VENTA_EDITADA,
        "editar"
    );
});
}

async function importarVentas(registros) {
    const grupos = agruparPorDocumento(registros, "nrc");
    const resultados = [];
    for (const grupo of grupos) {
        const cabecera = grupo[0];
        const datos = {
            fecha: cabecera.fecha,
            documento: cabecera.documento,
            tipoCliente: cabecera.tipo_cliente,
            cliente: cabecera.cliente,
            nrc: cabecera.nrc,
            lineas: grupo.map(function(r) {
                return { sku: r.sku, cantidad: Number(r.cantidad), precioUnitario: Number(r.precio_unitario) };
            })
        };
        try {
            const registro = await registrarVenta(datos);
            resultados.push({ ok: true, documento: datos.documento, registro: registro });
        } catch (error) {
            resultados.push({ ok: false, documento: datos.documento, error: error.message });
        }
    }
    return resultados;
}
