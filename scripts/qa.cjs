'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const {raiz,ejecutarArchivo,comprobarSintaxis,evaluarEtapa,evaluarCobertura}=require('./qa-motor.cjs');
const {informe}=require('./qa-informe.cjs');
const {abrirReporte}=require('./qa-abrir.cjs');
async function main(){
const inicio=Date.now(),id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),directorio=path.join(raiz,'reportes-qa'),historial=path.join(directorio,id);
let commit='sin información';try{commit=execFileSync('git',['rev-parse','--short','HEAD'],{cwd:raiz,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
const r={id,fecha:new Date().toISOString(),commit,node:process.version,plataforma:process.platform,estado:'en curso',duracionMs:0,sintaxis:null,etapas:[],cobertura:{archivos:[]},errores:[]};
await fs.mkdir(historial,{recursive:true});
async function guardar(){r.duracionMs=Date.now()-inicio;await fs.writeFile(path.join(historial,'resultado.json'),JSON.stringify(r,null,2));await fs.writeFile(path.join(historial,'index.html'),informe(r));await fs.writeFile(path.join(directorio,'index.html'),informe(r,id+'/'));}
await guardar();
try{
const [mayor,menor]=process.versions.node.split('.').map(Number);if(mayor<24||mayor===24&&menor<8)throw Error('Se requiere Node.js 24.8 o posterior.');
r.sintaxis=await comprobarSintaxis();r.errores.push(...r.sintaxis.errores);
console.log('Ejecutando pruebas unitarias…');
const unidad=await ejecutarArchivo('tests/unit/contabilidad.test.cjs','Unitarias',{cobertura:true});r.etapas.push(unidad);r.errores.push(...evaluarEtapa(unidad,76));r.cobertura=evaluarCobertura(unidad.cobertura);r.errores.push(...r.cobertura.errores);
console.log('Ejecutando prueba estática HTML5…');
const html=await ejecutarArchivo('tests/html/estatico.test.cjs','HTML5 estático');r.etapas.push(html);r.errores.push(...evaluarEtapa(html,17));
require('./qa-entorno.cjs').preparar();
console.log('Ejecutando integración y flujos funcionales en navegador…');
const integracion=await ejecutarArchivo('tests/integracion.cjs','Integración y funcionales');r.etapas.push(integracion);r.errores.push(...evaluarEtapa(integracion,51));
r.estado=r.errores.length?'fallida':'aprobada';
}catch(error){r.errores.push(error.message);r.estado='bloqueada';}
for(let i=0;i<r.etapas.length;i++){await fs.writeFile(path.join(historial,`etapa-${i+1}.log`),r.etapas[i].salida);delete r.etapas[i].salida;}
await guardar();console.log(`${r.estado.toUpperCase()}: ${r.etapas.flatMap(t=>t.casos).filter(c=>c.estado==='aprobada').length} pruebas aprobadas.\nReporte: ${path.join(directorio,'index.html')}`);
if(r.errores.length)console.error(r.errores.join('\n'));
if(!process.argv.includes('--no-open'))abrirReporte(path.join(directorio,'index.html'));
process.exitCode=r.estado==='aprobada'?0:1;
}
main().catch(e=>{console.error('No se pudo generar el reporte:',e.message);process.exitCode=1;});
