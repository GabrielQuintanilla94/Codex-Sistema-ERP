// Inicio fase 0: orquestador del proceso Depreciación (docs/procesos/ARQUITECTURA_PROCESOS.md)
// Coordina contrato → validador → cálculo → persistencia → verificación → evento EDA. Interfaz: depreciacion_ui.js.
const telemetriaDepreciacion = obtenerRegistroTelemetria("depreciacion");
function registrarTelemetriaDepreciacion(operacion, error, correlacion) {
    registrarTelemetria("depreciacion", String(operacion || ""), error ? "Error" : "Correcto", error ? true : false, correlacion);
}
function registrarVerificacionDepreciacion(cantidad, correlacion) {
    registrarTelemetria("depreciacion", "2. Verificación triple", Number(cantidad || 0) + " cálculos verificados en 3 niveles", undefined, correlacion);
}
// Fin fase 0
// Inicio fase 1: servicio para otros procesos (Libro Diario e importación): metadatos PPE de una partida
function prepararMovimientoConDepreciacion(movimiento) {
    const copia = { ...movimiento, partida: (movimiento.partida || []).map(function(linea) { return { ...linea }; }) };
    copia.partida.forEach(function(linea, indice) {
        const validado = validarDatosAdquisicionActivo(copia, linea, indice);
        if (validado) linea.activoFijo = construirMetadataActivoFijo(copia, linea, indice, validado);
    });
    registrarTelemetriaDepreciacion("Preparar movimiento", false);
    return copia;
}
// Fin fase 1
// Inicio fase 2: contexto, persistencia y reversión
function crearContextoDepreciacion(movimientos, cuentas) {
    return {
        movimientos: Array.isArray(movimientos) ? movimientos : [],
        activos: extraerActivosFijosDesdeMovimientos(movimientos),
        cuentasPorCodigo: new Map((cuentas || []).map(function(cuenta) { return [String(cuenta.codigo), cuenta]; })),
        numerosExistentes: new Set((movimientos || []).map(function(m) { return String(m.numero || "").toLowerCase(); })),
        siguienteId: (movimientos || []).reduce(function(maximo, m) { return Math.max(maximo, Number(m.id) || 0); }, 0) + 1
    };
}
async function eliminarDepreciacionesParaReemplazo(movimientos) {
    for (const movimiento of movimientos) await eliminarMovimientoBD(movimiento.id);
}
async function revertirSincronizacionDepreciacion(nuevos, reemplazados) {
const cambios = nuevos.map(function(m) { return { almacen: ALMACEN_MOVIMIENTOS, accion: "eliminar", clave: m.id }; });
reemplazados.forEach(function(m) { cambios.push({ almacen: ALMACEN_MOVIMIENTOS, accion: "guardar", valor: m }); });
await aplicarCambioContableBD(cambios);
}
// Fin fase 2
// Inicio fase 3: las 5 fases de la sincronización
function fase1EntradaSincronizacionDepreciacion(fechaCorte) {
    const fechaSistema = fechaSistemaLocalISO();
    const fechaCorteEfectiva = resolverFechaCorteEfectiva(fechaCorte, fechaSistema);
    registrarTelemetria("depreciacion", "1. Entrada", "Corte efectivo " + fechaCorteEfectiva, undefined, "depreciacion:" + fechaCorteEfectiva);
    return { fechaSistema: fechaSistema, fechaCorteEfectiva: fechaCorteEfectiva };
}
async function fase2ValidarSincronizacionDepreciacion(entrada) {
    const [movimientos, cuentas] = await Promise.all([obtenerMovimientosBD(), obtenerCuentasBD()]);
    const contexto = crearContextoDepreciacion(movimientos, cuentas);
    // Fuerza validación pura de todos los activos antes de planificar persistencia.
    contexto.activos.forEach(function(activo) { calcularDepreciacionAFecha(activo, entrada.fechaCorteEfectiva, entrada.fechaSistema); });
    registrarVerificacionDepreciacion(contexto.activos.length, "depreciacion:" + entrada.fechaCorteEfectiva);
    return { entrada: entrada, contexto: contexto };
}
function fase3ProcesarSincronizacionDepreciacion(validacion) {
    const plan = planificarDepreciacionesPendientes(validacion.contexto, validacion.entrada.fechaCorteEfectiva);
    registrarTelemetria("depreciacion", "3. Procesamiento", plan.nuevos.length + " partidas por crear, " + plan.omitidas + " cuotas ya contabilizadas", undefined, "depreciacion:" + validacion.entrada.fechaCorteEfectiva);
    return { ...validacion, plan: plan };
}
async function fase4PersistirSincronizacionDepreciacion(proceso) {
const cambios = proceso.plan.reemplazar.map(function(m) { return { almacen: ALMACEN_MOVIMIENTOS, accion: "eliminar", clave: m.id }; });
proceso.plan.nuevos.forEach(function(m) { cambios.push({ almacen: ALMACEN_MOVIMIENTOS, accion: "agregar", valor: m }); });
await aplicarCambioContableBD(cambios, proceso.contexto.movimientos);
registrarTelemetria("depreciacion", "4. Persistencia", "Partidas consolidadas almacenadas", undefined, "depreciacion:" + proceso.entrada.fechaCorteEfectiva);
return proceso;
}
async function fase5VerificarSincronizacionDepreciacion(proceso) {
    const plan = proceso.plan;
    // Inicio fase 5 — Incluir también períodos omitidos por idempotencia.
try {
const idsReemplazados = new Set(plan.reemplazar.map(function(m) { return m.id; }));
const esperados = proceso.contexto.movimientos.filter(function(m) { return esMovimientoDepreciacionAutomatica(m) && !idsReemplazados.has(m.id); }).concat(plan.nuevos);
const verificados = await obtenerMovimientosBD();
if (verificarPersistenciaConsolidada(esperados, verificados).length) throw new Error("La fase 5 no pudo verificar todas las partidas consolidadas de depreciación.");
} catch (error) {
await revertirSincronizacionDepreciacion(plan.nuevos, plan.reemplazar);
throw error;
}
// Fin fase 5
    const resultado = {
        creadas: plan.nuevos.length,
        reemplazadas: plan.reemplazar.length,
        omitidas: plan.omitidas,
        activos: proceso.contexto.activos.length,
        fechaCorteEfectiva: proceso.entrada.fechaCorteEfectiva
    };
    if (typeof publicarEventoContable === "function" && typeof TIPOS_EVENTOS !== "undefined" && TIPOS_EVENTOS.DEPRECIACION_SINCRONIZADA) {
        await publicarEventoContable(TIPOS_EVENTOS.DEPRECIACION_SINCRONIZADA, "depreciacion", resultado.fechaCorteEfectiva, resultado);
    }
    registrarTelemetriaDepreciacion(plan.nuevos.length ? "Sincronizar depreciación consolidada" : "Sincronizar depreciación: sin pendientes", false, "depreciacion:" + resultado.fechaCorteEfectiva);
    return resultado;
}
// Fin fase 3
// Inicio fase 4: caso de uso (bloqueo contable + telemetría)
async function sincronizarDepreciacionAutomatica(fechaCorte) {
return ejecutarConBloqueoContable(async function() {
    try {
        // FASE 1 — Entrada/corte efectivo.
        const entrada = fase1EntradaSincronizacionDepreciacion(fechaCorte);
        // FASE 2 — Validación de activos, cuentas e invariantes matemáticos.
        const validacion = await fase2ValidarSincronizacionDepreciacion(entrada);
        // FASE 3 — Planificación determinista e idempotente.
        const proceso = fase3ProcesarSincronizacionDepreciacion(validacion);
        // FASE 4 — Persistencia aislada con rollback.
        await fase4PersistirSincronizacionDepreciacion(proceso);
        // FASE 5 — Relectura/verificación y publicación EDA.
        return await fase5VerificarSincronizacionDepreciacion(proceso);
    } catch (error) {
        registrarTelemetriaDepreciacion("Sincronizar depreciación consolidada", true);
        throw error;
    }
});
}
// Fin fase 4
