// Inicio fase 0 — Contratos y paths del enrutamiento local.
const DEPENDENCIAS_ROUTING = Object.freeze({proyeccionContable:Object.freeze([]),reportes:Object.freeze(["proyeccionContable"]),dashboard:Object.freeze([]),inventario:Object.freeze([]),depreciacion:Object.freeze([])});
const PERFILES_ROUTING = Object.freeze({"index.html":Object.freeze(["dashboard"]),"reportes.html":Object.freeze(["proyeccionContable","reportes"]),"inventario.html":Object.freeze(["inventario"]),"partida_manual.html":Object.freeze(["proyeccionContable"]),"catalogo_cuentas.html":Object.freeze(["proyeccionContable"]),"operaciones.html":Object.freeze([]),"depreciacion.html":Object.freeze(["depreciacion"]),"matriz_depreciacion.html":Object.freeze(["depreciacion"])});
const RUTAS_EVENTOS_CONTABLES = Object.freeze(Object.fromEntries([
["CUENTA_CREADA","js/catalogo/catalogo_ui.js",false],["CUENTA_ELIMINADA","js/catalogo/catalogo_ui.js",false],
["PARTIDA_REGISTRADA","js/diario/libro_diario.js",true],["PARTIDA_EDITADA","js/diario/libro_diario.js",true],["PARTIDA_ELIMINADA","js/diario/libro_diario.js",true],["PARTIDAS_IMPORTADAS","js/importacion/importador_partidas.js",true],
["COMPRA_REGISTRADA","js/compras/compras.js",true],["COMPRA_EDITADA","js/compras/compras.js",true],["COMPRA_ELIMINADA","js/comercial/operaciones.js",true],
["VENTA_REGISTRADA","js/ventas/ventas.js",true],["VENTA_EDITADA","js/ventas/ventas.js",true],["VENTA_ELIMINADA","js/comercial/operaciones.js",true],
["IVA_CERRADO","js/impuestos/f07.js",false],["DEPRECIACION_SINCRONIZADA","js/depreciacion/depreciacion.js",false]
].map(function([tipo,publicador,inventario]) {return [TIPOS_EVENTOS[tipo],Object.freeze({publicador,consumidores:Object.freeze(["proyeccionContable","reportes","dashboard"].concat(inventario ? ["inventario"] : []).concat(["PARTIDA_REGISTRADA","PARTIDA_EDITADA","PARTIDA_ELIMINADA","PARTIDAS_IMPORTADAS","DEPRECIACION_SINCRONIZADA"].includes(tipo) ? ["depreciacion"] : []))})];})));
const POLITICA_ROUTING = Object.freeze({reintentos:2,baseMs:20,jitterMs:20,umbralFallos:2,aperturaMs:1000});
const consumidoresRouting = new Map();
const circuitosRouting = new Map();
const telemetriaRouting = {recibidos:0,completados:0,fallidos:0,reintentos:0,ultimoEventoId:null};
let colaRoutingEventos = Promise.resolve();
let routingEventosIniciado = false;
// Fin fase 0
// Inicio fase 1 — Entrada defensiva sin ejecutar consumidores.
function fase1EntradaRouting(evento) {
if (!validarEventoContable(evento)) throw new Error("El evento no cumple el contrato del router.");
return Object.freeze({...evento,datos:copiarDatosEvento(evento.datos)});
}
function paginaRoutingActual() {return location.pathname.split("/").pop() || "index.html";}
// Fin fase 1
// Inicio fase 2 — Contratos, cobertura y DAG: rechazo inmediato de configuración inválida.
function validarDAGRouting(dependencias) {
const orden = [],visitados = new Set(),pendientes = new Set();
function visitar(nombre) {
if (!Object.prototype.hasOwnProperty.call(dependencias,nombre) || !Array.isArray(dependencias[nombre])) throw new Error("Dependencia de routing desconocida: " + nombre);
if (pendientes.has(nombre)) throw new Error("El routing contiene un ciclo.");
if (visitados.has(nombre)) return;
pendientes.add(nombre);
dependencias[nombre].forEach(visitar);
pendientes.delete(nombre);visitados.add(nombre);orden.push(nombre);
}
Object.keys(dependencias).forEach(visitar);
return Object.freeze(orden);
}
const ORDEN_ROUTING = validarDAGRouting(DEPENDENCIAS_ROUTING);
function verificarEnlacesRoutingEventos() {
const pagina = paginaRoutingActual(),requeridos = PERFILES_ROUTING[pagina];
if (!requeridos) throw new Error("Página sin perfil de routing: " + pagina);
if (Object.keys(RUTAS_EVENTOS_CONTABLES).length !== Object.values(TIPOS_EVENTOS).length || !Object.values(TIPOS_EVENTOS).every(function(tipo) {return Object.prototype.hasOwnProperty.call(RUTAS_EVENTOS_CONTABLES,tipo);})) throw new Error("Hay eventos sin ruta declarada.");
for (const ruta of Object.values(RUTAS_EVENTOS_CONTABLES)) {
if (typeof ruta.publicador !== "string" || !ruta.publicador || new Set(ruta.consumidores).size !== ruta.consumidores.length) throw new Error("Ruta duplicada o sin publicador.");
for (const nombre of ruta.consumidores) {
if (!Object.prototype.hasOwnProperty.call(DEPENDENCIAS_ROUTING,nombre) || !DEPENDENCIAS_ROUTING[nombre].every(function(dependencia) {return ruta.consumidores.includes(dependencia);})) throw new Error("Ruta con consumidor o dependencia inválida: " + nombre);
}
}
for (const nombre of requeridos) {
if (!consumidoresRouting.has(nombre)) throw new Error("Consumidor requerido no conectado: " + nombre);
if (!DEPENDENCIAS_ROUTING[nombre].every(function(dependencia) {return requeridos.includes(dependencia);})) throw new Error("Dependencias incompletas de " + nombre);
}
return true;
}
function fase2ValidarRouting(evento) {
verificarEnlacesRoutingEventos();
if (!Object.prototype.hasOwnProperty.call(RUTAS_EVENTOS_CONTABLES,evento.tipo)) throw new Error("Evento sin ruta declarada.");
return true;
}
// Fin fase 2
// Inicio fase 3 — Plan puro e inmutable: dependencias antes de consumidores.
function fase3ProcesarRouting(evento,pagina) {
const ruta = RUTAS_EVENTOS_CONTABLES[evento.tipo],perfil = PERFILES_ROUTING[pagina];
if (!ruta || !perfil) throw new Error("Ruta o perfil desconocido.");
return Object.freeze({evento,pagina,publicador:ruta.publicador,consumidores:Object.freeze(ORDEN_ROUTING.filter(function(nombre) {return perfil.includes(nombre) && ruta.consumidores.includes(nombre);}))});
}
function obtenerEstadoRoutingEventos() {
const pagina = paginaRoutingActual();
return {pagina,faltantes:(PERFILES_ROUTING[pagina] || []).filter(function(nombre) {return !consumidoresRouting.has(nombre);}),rutas:Object.keys(RUTAS_EVENTOS_CONTABLES).map(function(tipo) {return {tipo,publicador:RUTAS_EVENTOS_CONTABLES[tipo].publicador,consumidores:RUTAS_EVENTOS_CONTABLES[tipo].consumidores.slice(),activos:fase3ProcesarRouting({tipo},pagina).consumidores.slice()};}),telemetria:{...telemetriaRouting},circuitos:Array.from(circuitosRouting,function([nombre,estado]) {return {nombre,...estado};})};
}
// Fin fase 3
// Inicio fase 4 — Enlaces, ejecución serial, resiliencia y trazas persistidas.
function registrarConsumidorContable(nombre,manejador) {
if (!Object.prototype.hasOwnProperty.call(DEPENDENCIAS_ROUTING,nombre) || !(PERFILES_ROUTING[paginaRoutingActual()] || []).includes(nombre) || typeof manejador !== "function") throw new Error("Consumidor de routing no permitido: " + nombre);
const existente = consumidoresRouting.get(nombre);
if (existente && existente !== manejador) throw new Error("Consumidor ya conectado con otro manejador: " + nombre);
consumidoresRouting.set(nombre,manejador);
return function() {if (consumidoresRouting.get(nombre) === manejador) consumidoresRouting.delete(nombre);};
}
function errorTransitorioRouting(error) {return ["AbortError","TransactionInactiveError","UnknownError"].includes(error && error.name);}
async function ejecutarConsumidorRouting(nombre,evento) {
const circuito = circuitosRouting.get(nombre) || {estado:"Closed",fallos:0,proximaPrueba:0};
circuitosRouting.set(nombre,circuito);
if (circuito.estado === "Open") {
if (Date.now() < circuito.proximaPrueba) throw new Error("Circuito abierto para " + nombre);
circuito.estado = "Half-Open";
}
try {
for (let intento = 0; ; intento++) {
try {await consumidoresRouting.get(nombre)(evento);break;}
catch (error) {
if (!errorTransitorioRouting(error) || intento >= POLITICA_ROUTING.reintentos) throw error;
telemetriaRouting.reintentos++;
await new Promise(function(resolve) {setTimeout(resolve,POLITICA_ROUTING.baseMs * 2 ** intento + Math.floor(Math.random() * POLITICA_ROUTING.jitterMs));});
}
}
circuito.estado = "Closed";circuito.fallos = 0;circuito.proximaPrueba = 0;
} catch (error) {
circuito.fallos++;
if (circuito.estado === "Half-Open" || circuito.fallos >= POLITICA_ROUTING.umbralFallos) {circuito.estado = "Open";circuito.proximaPrueba = Date.now() + POLITICA_ROUTING.aperturaMs;}
throw error;
}
}
async function fase4EjecutarRouting(plan) {
const resultados = [],fallidos = new Set();
const traza = {id:"routing:" + plan.pagina + ":" + plan.evento.id,eventoId:plan.evento.id,tipo:plan.evento.tipo,pagina:plan.pagina,fecha:new Date().toISOString(),estado:"en-proceso",resultados};
await guardarProyeccionBD(traza);
for (const nombre of plan.consumidores) {
if (DEPENDENCIAS_ROUTING[nombre].some(function(dependencia) {return fallidos.has(dependencia);})) {
fallidos.add(nombre);resultados.push({consumidor:nombre,estado:"omitido",error:"Dependencia fallida"});continue;
}
try {await ejecutarConsumidorRouting(nombre,plan.evento);resultados.push({consumidor:nombre,estado:"completado"});}
catch (error) {fallidos.add(nombre);resultados.push({consumidor:nombre,estado:"fallido",error:String(error.message || error)});}
await guardarProyeccionBD(traza);
}
traza.estado = fallidos.size ? "fallido" : "completado";
await guardarProyeccionBD(traza);
if (!estadoPersistidoCoincide(traza,await obtenerProyeccionBD(traza.id))) throw new Error("No pudo verificarse la traza del router.");
if (fallidos.size) throw new Error("Consumidores de routing fallidos: " + Array.from(fallidos).join(", "));
return Object.freeze(resultados.map(function(resultado) {return Object.freeze(resultado);}));
}
function enrutarEventoContable(evento) {
const ejecutar = async function() {
try {
const entrada = fase1EntradaRouting(evento);
telemetriaRouting.recibidos++;telemetriaRouting.ultimoEventoId = entrada.id;
if (document.readyState === "loading") await new Promise(function(resolve) {document.addEventListener("DOMContentLoaded",resolve,{once:true});});
fase2ValidarRouting(entrada);
if (!baseDatos) await abrirBaseDatos();
const resultado = await fase4EjecutarRouting(fase3ProcesarRouting(entrada,paginaRoutingActual()));
telemetriaRouting.completados++;return resultado;
} catch (error) {telemetriaRouting.fallidos++;throw error;}
};
const actual = colaRoutingEventos.then(ejecutar);
colaRoutingEventos = actual.catch(function() {});
return actual;
}
function iniciarRoutingEventos() {
if (routingEventosIniciado) return;
Object.values(TIPOS_EVENTOS).forEach(function(tipo) {suscribirEventoContable(tipo,enrutarEventoContable);});
routingEventosIniciado = true;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",verificarEnlacesRoutingEventos,{once:true});
else verificarEnlacesRoutingEventos();
}
iniciarRoutingEventos();
// Fin fase 4
