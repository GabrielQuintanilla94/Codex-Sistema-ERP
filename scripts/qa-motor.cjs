'use strict';
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const path=require('node:path');
const raiz=path.resolve(__dirname,'..');
function ejecutarArchivo(archivo,categoria,{cobertura=false,timeout=180000,onCaso=()=>{}}={}){
return new Promise(resolve=>{
const argumentos=['--test','--test-timeout=90000','--test-reporter='+path.join(__dirname,'qa-reportero.cjs')];
if(cobertura)argumentos.push('--experimental-test-coverage','--test-coverage-include=**/js/impuestos/iva.js','--test-coverage-include=**/js/motor_contable.js');
argumentos.push(archivo);
const entorno={...process.env};delete entorno.NODE_TEST_CONTEXT;
const hijo=spawn(process.execPath,argumentos,{cwd:raiz,env:entorno,stdio:['ignore','pipe','pipe']});
const casos=[],errores=[];let buffer='',salida='',errorSalida='',coberturaMedida=null,expirado=false,terminado=false;
const alarma=setTimeout(()=>{expirado=true;hijo.kill();},timeout);
function procesar(linea){if(!linea.trim())return;let e;try{e=JSON.parse(linea);}catch{errores.push('Salida del reportero inválida');return;}
if(e.tipo==='test:coverage')coberturaMedida=e.datos.summary;
if(['test:pass','test:fail'].includes(e.tipo)&&!e.suite){const estado=e.pendiente?'pendiente':e.omitida?'omitida':e.tipo==='test:pass'?'aprobada':'fallida';const caso={categoria,nombre:e.nombre,estado,duracionMs:e.duracion,error:e.error};casos.push(caso);onCaso(caso);}
}
hijo.stdout.on('data',d=>{const texto=d.toString();salida+=texto;buffer+=texto;let fin;while((fin=buffer.indexOf('\n'))>=0){procesar(buffer.slice(0,fin));buffer=buffer.slice(fin+1);}});
hijo.stderr.on('data',d=>{errorSalida+=d.toString();});
function finalizar(codigo,mensaje){if(terminado)return;terminado=true;clearTimeout(alarma);if(buffer)procesar(buffer);if(mensaje)errores.push(mensaje);if(expirado)errores.push('Tiempo máximo de la etapa excedido');if(casos.length===0)errores.push('No se ejecutó ninguna prueba');resolve({categoria,archivo,codigo:expirado?1:codigo,casos,cobertura:coberturaMedida,errores,salida:salida+'\n'+errorSalida});}
hijo.on('error',e=>finalizar(1,e.message));hijo.on('close',codigo=>finalizar(codigo??1));
});
}
async function archivosJS(directorio){const encontrados=[];for(const entrada of await fs.readdir(directorio,{withFileTypes:true})){const archivo=path.join(directorio,entrada.name);if(entrada.isDirectory())encontrados.push(...await archivosJS(archivo));else if(entrada.name.endsWith('.js'))encontrados.push(archivo);}return encontrados;}
async function comprobarSintaxis(){const errores=[];const archivos=await archivosJS(path.join(raiz,'js'));for(const archivo of archivos){const resultado=await new Promise(resolve=>{const hijo=spawn(process.execPath,['--check',archivo],{stdio:['ignore','pipe','pipe']});let texto='';hijo.stderr.on('data',d=>texto+=d);hijo.on('error',e=>resolve({codigo:1,texto:e.message}));hijo.on('close',codigo=>resolve({codigo,texto}));});if(resultado.codigo!==0)errores.push(path.relative(raiz,archivo)+': '+resultado.texto);}return{archivos:archivos.length,errores};}
function evaluarEtapa(etapa,minimo){const errores=[...etapa.errores];if(etapa.codigo!==0)errores.push('El runner terminó con código '+etapa.codigo);if(etapa.casos.length<minimo)errores.push('Se esperaban al menos '+minimo+' casos; se recibieron '+etapa.casos.length);if(etapa.casos.some(c=>c.estado!=='aprobada'))errores.push('Hay pruebas fallidas, omitidas o pendientes');return errores;}
function evaluarCobertura(cobertura){const objetivos=['js/impuestos/iva.js','js/motor_contable.js'];const errores=[];const archivos=(cobertura?.files||[]).map(f=>({archivo:path.relative(raiz,f.path).split(path.sep).join('/'),lineas:f.coveredLinePercent,ramas:f.coveredBranchPercent,funciones:f.coveredFunctionPercent,noCubiertas:(f.lines||[]).filter(l=>l.count===0).map(l=>l.line)}));for(const archivo of objetivos){const f=archivos.find(f=>f.archivo===archivo);if(!f)errores.push('Cobertura ausente: '+archivo);else if(f.lineas<90||f.ramas<90||f.funciones<100)errores.push('Cobertura bajo el umbral 90/90/100: '+archivo);}return{archivos,errores,umbrales:{lineas:90,ramas:90,funciones:100}};}
module.exports={raiz,ejecutarArchivo,comprobarSintaxis,evaluarEtapa,evaluarCobertura};
