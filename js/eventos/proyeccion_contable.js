const ID_PROYECCION_BALANZA = "balanza-comprobacion";
const EVENTOS_QUE_AFECTAN_BALANZA = Object.values(TIPOS_EVENTOS);
async function reconstruirProyeccionContable(evento) {
const cuentas = await obtenerCuentasBD();
const movimientos = await obtenerMovimientosBD();
const balanza = generarBalanzaComprobacion(cuentas, movimientos);
const estadoResultados = generarEstadoResultados(cuentas, movimientos);
const balanceGeneral = generarBalanceGeneral(cuentas, movimientos);
const proyeccion = {
id: ID_PROYECCION_BALANZA,
actualizadaEn: new Date().toISOString(),
ultimoEventoId: evento && evento.id ? evento.id : null,
ultimoEventoTipo: evento && evento.tipo
? evento.tipo
: "ReconstruccionInicial",
balanza: balanza,
estadoResultados: estadoResultados,
balanceGeneral: balanceGeneral
};
await guardarProyeccionBD(proyeccion);
document.dispatchEvent(new CustomEvent("proyeccion:actualizada", {
detail: proyeccion
}));
return proyeccion;
}
async function obtenerBalanzaProyectada() {
const proyeccion = await obtenerProyeccionBD(ID_PROYECCION_BALANZA);
return proyeccion || reconstruirProyeccionContable();
}
function iniciarProyeccionContable() {
EVENTOS_QUE_AFECTAN_BALANZA.forEach(function(tipo) {
suscribirEventoContable(tipo, reconstruirProyeccionContable);
});
}
iniciarProyeccionContable();
