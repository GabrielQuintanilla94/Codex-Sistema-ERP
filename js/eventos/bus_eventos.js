const manejadoresEventos = new Map();
const telemetriaEventos = {
    publicados: 0,
    recibidos: 0,
    fallidos: 0,
    ultimoTipo: "Sin eventos"
};
const canalEventosContables = typeof BroadcastChannel === "function"
    ? new BroadcastChannel("libro-diario-eventos")
    : null;
function suscribirEventoContable(tipo, manejador) {
    if (!Object.values(TIPOS_EVENTOS).includes(tipo) || typeof manejador !== "function") {
        throw new Error("La suscripción al evento no es válida.");
    }
    if (!manejadoresEventos.has(tipo)) manejadoresEventos.set(tipo, new Set());
    manejadoresEventos.get(tipo).add(manejador);
    return function() {
        manejadoresEventos.get(tipo).delete(manejador);
    };
}
async function despacharEventoContable(evento) {
    if (!validarEventoContable(evento)) {
        telemetriaEventos.fallidos++;
        throw new Error("Se rechazó un evento que no cumple el contrato EDA.");
    }
    telemetriaEventos.recibidos++;
    telemetriaEventos.ultimoTipo = evento.tipo;
    const manejadores = Array.from(manejadoresEventos.get(evento.tipo) || []);
    const resultados = await Promise.allSettled(manejadores.map(function(manejador) {
        return manejador(evento);
    }));
    resultados.forEach(function(resultado) {
        if (resultado.status === "rejected") {
            telemetriaEventos.fallidos++;
            console.error("Un consumidor EDA no procesó el evento:", resultado.reason);
        }
    });
    return resultados;
}
async function publicarEventoContable(tipo, entidad, entidadId, datos) {
    const evento = crearEventoContable(tipo, entidad, entidadId, datos);
    await guardarEventoBD(evento);
    await despacharEventoContable(evento);
    if (canalEventosContables) canalEventosContables.postMessage(evento);
    telemetriaEventos.publicados++;
    telemetriaEventos.ultimoTipo = evento.tipo;
    return evento;
}
if (canalEventosContables) {
    canalEventosContables.onmessage = function(mensaje) {
        despacharEventoContable(mensaje.data).catch(function(error) {
            console.error("No fue posible recibir el evento contable:", error.message);
        });
    };
}
