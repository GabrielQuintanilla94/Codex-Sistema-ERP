// Inicio fase 0: orquestador del proceso Ventas (docs/procesos/ARQUITECTURA_PROCESOS.md)
// Coordina contrato → validador → persistencia → verificación → evento EDA. Interfaz: ventas_ui.js.
// Fin fase 0
// Inicio fase 1: las 5 fases del proceso
function fase1EntradaVenta(datos) {
    const entrada = normalizarEntradaVenta(datos);
    registrarTelemetria("ventas", "1. Entrada", "Venta " + entrada.documento + " recibida");
    return entrada;
}
async function fase2ValidarVenta(entrada, idExcluir) {
    const [movimientos, inventario, ventas, terceros] = await Promise.all([
        obtenerMovimientosBD(), obtenerInventariosBD(), obtenerVentasBD(), obtenerTercerosBD()
    ]);
    const validada = validarVentaContraEstado(entrada, { terceros: terceros, ventas: ventas, movimientos: movimientos, inventario: inventario, idExcluir: idExcluir });
    registrarTelemetria("ventas", "2. Validación", "Venta aprobada", undefined, "ventas:" + validada.id);
    return { canonica: validada.canonica, movimientos: movimientos, inventario: inventario, ventas: ventas, id: validada.id };
}
function fase3ProcesarVenta(validacion, movimientosBase, inventarioBase, marcaTiempo) {
    const procesada = construirVenta(
        validacion.canonica,
        movimientosBase || validacion.movimientos,
        inventarioBase || validacion.inventario,
        marcaTiempo || validacion.canonica.creadoEn || new Date().toISOString()
    );
    registrarTelemetria("ventas", "3. Procesamiento", "Registro, partida y costo construidos", undefined, "ventas:" + procesada.registro.id);
    return procesada;
}
async function fase4PersistirVenta(procesada, movimientosPrevios) {
    procesada.planRecuperacion = { movimientosOriginales: movimientosPrevios };
    await persistirOperacionComercial("VENTA", procesada.registro, procesada.movimiento, movimientosPrevios);
    registrarTelemetria("ventas", "4. Persistencia", "Venta almacenada", undefined, "ventas:" + procesada.registro.id);
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
    registrarTelemetria("ventas", "5. Verificación", "Venta verificada", undefined, "ventas:" + procesada.registro.id);
    if (tipoEvento) await publicarEventoComercialSeguro(tipoEvento, "VENTA", procesada.registro, accion);
    return procesada.registro;
}
// Fin fase 1
// Inicio fase 2: casos de uso (bloqueo contable + trazado de telemetría)
async function registrarVenta(datos) {
return ejecutarConBloqueoContable(() => trazarProcesoTelemetria("ventas", "Registrar venta", async function() {
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
}));
}

async function editarVenta(idOriginal, datos) {
return ejecutarConBloqueoContable(() => trazarProcesoTelemetria("ventas", "Editar venta", async function() {
const anterior = (await obtenerVentasBD()).find(function(registro) { return String(registro.id) === String(idOriginal); });
datos = { ...anterior, ...datos };
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
}));
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
            Object.assign(datos, identificadoresFiscalesDesdeCSV(grupo, tipoDTEVenta(datos.tipoCliente)));
            const registro = await registrarVenta(datos);
            resultados.push({ ok: true, documento: datos.documento, registro: registro });
        } catch (error) {
            resultados.push({ ok: false, documento: datos.documento, error: error.message });
        }
    }
    return resultados;
}
// Fin fase 2
