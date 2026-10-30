function opsDinero(valor) {
    return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(Number(valor || 0));
}
function opsPeriodoActual() {
    const f = new Date();
    return f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0");
}
function opsCambiarTab(nombre, actualizarHash) {
    const valido = ["compras", "ventas", "impuestos"].includes(nombre) ? nombre : "compras";
    document.querySelectorAll(".module-tab").forEach(function(b) { b.classList.toggle("activo", b.dataset.tab === valido); });
    document.querySelectorAll(".module-panel").forEach(function(p) { p.classList.toggle("activo", p.dataset.panel === valido); });
    if (actualizarHash) history.replaceState(null, "", "#" + valido);
}
// Inicio consulta mensual — Estado de presentación; no modifica operaciones.
const OPS_PERIODO_STORAGE = "erp:operaciones:periodo";
let opsPeriodoSeleccionado = "";
let opsPeriodoPreferido = "";
let opsResumenEnCurso = null;
let opsResumenPendiente = false;
function opsPeriodoValido(periodo) {return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(periodo || ""));}
try {const guardado=localStorage.getItem(OPS_PERIODO_STORAGE);if(opsPeriodoValido(guardado))opsPeriodoPreferido=guardado;} catch {}
function opsObtenerPeriodoConsulta() {return opsPeriodoSeleccionado || opsPeriodoPreferido || opsPeriodoActual();}
function opsElegirPeriodo(compras,ventas) {
if(opsPeriodoPreferido)return opsPeriodoPreferido;
return compras.concat(ventas).reduce(function(ultimo,registro) {const periodo=String(registro.fecha || "").slice(0,7);return opsPeriodoValido(periodo)&&periodo>ultimo?periodo:ultimo;},"") || opsPeriodoActual();
}
function opsMostrarError(error) {
const mensaje=document.getElementById("ops-mensaje-periodo");
mensaje.textContent=error.message || String(error);mensaje.hidden=false;
}
async function opsRefrescarListados() {
await Promise.all([refrescarCompras(),refrescarVentas(),recargarDatosImpuestos(),refrescarInventarioVenta()]);
}
async function opsRefrescarResumen() {
opsResumenPendiente=true;
if(opsResumenEnCurso)return opsResumenEnCurso;
opsResumenEnCurso=(async function() {
if(!baseDatos)await abrirBaseDatos();
do {
opsResumenPendiente=false;
const [compras,ventas]=await Promise.all([obtenerComprasBD(),obtenerVentasBD()]);
const periodo=opsElegirPeriodo(compras,ventas),cambio=opsPeriodoSeleccionado!==periodo;
opsPeriodoSeleccionado=periodo;
document.getElementById("ops-periodo").value=periodo;
document.getElementById("periodo-iva").value=periodo;
const cm=filtrarPorPeriodo(compras,periodo),vm=filtrarPorPeriodo(ventas,periodo),resumen=resumirIVA(cm,vm);
document.getElementById("ops-compras-mes").textContent=opsDinero(cm.reduce(function(t,x){return t+Number(x.comprasGravadas || 0);},0));
document.getElementById("ops-ventas-mes").textContent=opsDinero(vm.reduce(function(t,x){return t+Number(x.ventasGravadas || 0);},0));
document.getElementById("ops-compras-docs").textContent=cm.length+(cm.length===1?" documento":" documentos");
document.getElementById("ops-ventas-docs").textContent=vm.length+(vm.length===1?" documento":" documentos");
document.getElementById("ops-iva-credito").textContent=opsDinero(resumen.creditoFiscal);
document.getElementById("ops-iva-debito").textContent=opsDinero(resumen.debitoFiscal);
document.getElementById("ops-iva-neto").textContent=opsDinero(resumen.ivaPorPagar || resumen.remanenteCreditoFiscal || 0);
document.getElementById("ops-iva-estado").textContent=resumen.ivaPorPagar>0?"IVA por pagar":resumen.remanenteCreditoFiscal>0?"Remanente de crédito":"Sin diferencia";
document.getElementById("ops-mensaje-periodo").hidden=true;
if(cambio)await opsRefrescarListados();
}while(opsResumenPendiente);
})();
try {await opsResumenEnCurso;}finally{opsResumenEnCurso=null;}
}
async function opsSeleccionarPeriodo(valor) {
if(!opsPeriodoValido(valor)) {document.getElementById("ops-periodo").value=opsObtenerPeriodoConsulta();opsMostrarError(new Error("Seleccioná un mes y año válidos."));return;}
opsPeriodoPreferido=valor;
try{localStorage.setItem(OPS_PERIODO_STORAGE,valor);}catch{}
await opsRefrescarResumen();
}
async function opsRefrescarConsultas() {
await opsRefrescarResumen();
await opsRefrescarListados();
}
registrarConsumidorContable("operaciones",opsRefrescarConsultas);
// Fin consulta mensual
document.addEventListener("DOMContentLoaded",function() {
document.querySelectorAll(".module-tab").forEach(function(b){b.addEventListener("click",function(){opsCambiarTab(b.dataset.tab,true);});});
opsCambiarTab(location.hash.replace("#","") || "compras",false);
window.addEventListener("hashchange",function(){opsCambiarTab(location.hash.replace("#",""),false);});
document.getElementById("ops-periodo").addEventListener("change",function(evento){opsSeleccionarPeriodo(evento.target.value).catch(opsMostrarError);});
document.getElementById("periodo-iva").addEventListener("change",function(evento){opsSeleccionarPeriodo(evento.target.value).catch(opsMostrarError);});
opsRefrescarResumen().catch(opsMostrarError);
});
window.addEventListener("erp:data-updated",function(){opsRefrescarResumen().catch(opsMostrarError);});
