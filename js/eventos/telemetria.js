// Inicio fase 0: telemetría, observabilidad y trazabilidad compartidas por los procesos (docs/procesos/ARQUITECTURA_PROCESOS.md)
const TELEMETRIA_MAX_HISTORIAL = 50;
const telemetriaProcesos = new Map();
// Fin fase 0
// Inicio fase 1: registro por proceso (una sola fuente de verdad en memoria)
function obtenerRegistroTelemetria(proceso) {
    const clave = String(proceso || "sin-proceso");
    if (!telemetriaProcesos.has(clave)) telemetriaProcesos.set(clave, { procesadas: 0, rechazadas: 0, fase: "Esperando entrada", resultado: "Sin operaciones", historial: [] });
    return telemetriaProcesos.get(clave);
}
// Fin fase 1
// Inicio fase 2: registrar una fase; rechazada=true cuenta rechazo, false cuenta éxito, undefined solo avance
function registrarTelemetria(proceso, fase, resultado, rechazada, correlacion) {
    const registro = obtenerRegistroTelemetria(proceso);
    registro.fase = String(fase ?? "");
    registro.resultado = String(resultado ?? "");
    if (rechazada === true) registro.rechazadas++;
    if (rechazada === false) registro.procesadas++;
    registro.historial.push({ fecha: new Date().toISOString(), fase: registro.fase, resultado: registro.resultado, estado: rechazada === true ? "rechazada" : rechazada === false ? "completada" : "en curso", correlacion: correlacion ?? null });
    if (registro.historial.length > TELEMETRIA_MAX_HISTORIAL) registro.historial.splice(0, registro.historial.length - TELEMETRIA_MAX_HISTORIAL);
    return registro;
}
// Fin fase 2
// Inicio fase 3: observabilidad de solo lectura (copias; consultar en consola con obtenerEstadoTelemetria())
function obtenerEstadoTelemetria(proceso) {
    const copiar = r => ({ ...r, historial: r.historial.map(h => ({ ...h })) });
    if (proceso !== undefined) return telemetriaProcesos.has(String(proceso)) ? copiar(telemetriaProcesos.get(String(proceso))) : null;
    return Object.fromEntries(Array.from(telemetriaProcesos, ([clave, registro]) => [clave, copiar(registro)]));
}
// Fin fase 3
