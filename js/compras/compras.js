// Inicio fase 0: orquestador del proceso Compras (docs/procesos/ARQUITECTURA_PROCESOS.md)
// Coordina contrato → validador → persistencia → verificación → evento EDA. Interfaz: compras_ui.js.
// Fin fase 0
// Inicio fase 1: las 5 fases del proceso
function fase1EntradaCompra(datos) {
    const entrada = normalizarEntradaCompra(datos);
    registrarTelemetria("compras", "1. Entrada", "Compra " + entrada.documento + " recibida");
    return entrada;
}
async function fase2ValidarCompra(entrada, idExcluir) {
    const [movimientos, terceros, compras] = await Promise.all([obtenerMovimientosBD(), obtenerTercerosBD(), obtenerComprasBD()]);
    const validada = validarCompraContraEstado(entrada, { terceros: terceros, compras: compras, movimientos: movimientos, idExcluir: idExcluir });
    registrarTelemetria("compras", "2. Validación", "Compra aprobada", undefined, "compras:" + validada.id);
    return { canonica: validada.canonica, movimientos: movimientos, compras: compras, id: validada.id };
}
function fase3ProcesarCompra(validacion, movimientosBase, marcaTiempo) {
    const procesada = construirCompra(validacion.canonica, movimientosBase || validacion.movimientos, marcaTiempo || validacion.canonica.creadoEn || new Date().toISOString());
    registrarTelemetria("compras", "3. Procesamiento", "Registro y partida construidos", undefined, "compras:" + procesada.registro.id);
    return procesada;
}
async function fase4PersistirCompra(procesada, movimientosPrevios) {
    procesada.planRecuperacion = { movimientosOriginales: movimientosPrevios };
    await persistirOperacionComercial("COMPRA", procesada.registro, procesada.movimiento, movimientosPrevios);
    registrarTelemetria("compras", "4. Persistencia", "Compra almacenada", undefined, "compras:" + procesada.registro.id);
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
    registrarTelemetria("compras", "5. Verificación", "Compra verificada", undefined, "compras:" + procesada.registro.id);
    if (tipoEvento) await publicarEventoComercialSeguro(tipoEvento, "COMPRA", procesada.registro, accion);
    return procesada.registro;
}
// Fin fase 1
// Inicio fase 2: casos de uso (bloqueo contable + trazado de telemetría)
async function registrarCompra(datos) {
return ejecutarConBloqueoContable(() => trazarProcesoTelemetria("compras", "Registrar compra", async function() {
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
}));
}

async function editarCompra(idOriginal, datos) {
return ejecutarConBloqueoContable(() => trazarProcesoTelemetria("compras", "Editar compra", async function() {
const anterior = (await obtenerComprasBD()).find(function(registro) { return String(registro.id) === String(idOriginal); });
datos = { ...anterior, ...datos };
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
}));
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
            Object.assign(datos, identificadoresFiscalesDesdeCSV(grupo, "03"));
            const registro = await registrarCompra(datos);
            resultados.push({ ok: true, documento: datos.documento, registro: registro });
        } catch (error) {
            resultados.push({ ok: false, documento: datos.documento, error: error.message });
        }
    }
    return resultados;
}
// Fin fase 2
