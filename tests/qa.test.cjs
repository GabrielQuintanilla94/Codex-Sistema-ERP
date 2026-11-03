'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {ejecutarArchivo,evaluarEtapa,evaluarCobertura}=require('../scripts/qa-motor.cjs');
const {informe}=require('../scripts/qa-informe.cjs');
test('QA detecta fallo real, omisión y ausencia de pruebas',async()=>{
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'erp-qa-'));
try{for(const [nombre,texto,estado] of [
['pasa',"require('node:test').test('caso',()=>{});",'aprobada'],
['falla',"require('node:test').test('caso',()=>{throw Error('fallo intencional');});",'fallida'],
['omite',"require('node:test').test('caso',{skip:true},()=>{});",'omitida']]){
const archivo=path.join(dir,nombre+'.cjs');await fs.writeFile(archivo,texto);const r=await ejecutarArchivo(archivo,'Control');assert.equal(r.casos[0].estado,estado);assert.equal(evaluarEtapa(r,1).length===0,estado==='aprobada');}
const inexistente=await ejecutarArchivo(path.join(dir,'inexistente.cjs'),'Control');assert.ok(inexistente.errores.some(e=>e.includes('Could not find')));
const vacio=path.join(dir,'vacio.cjs');await fs.writeFile(vacio,'');const r=await ejecutarArchivo(vacio,'Control');assert.ok(evaluarEtapa(r,2).length>0);
}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('QA rechaza cobertura ausente o insuficiente',()=>{
assert.equal(evaluarCobertura(null).errores.length,2);
const files=['js/impuestos/iva.js','js/motor_contable.js'].map(f=>({path:path.resolve(__dirname,'..',f),coveredLinePercent:100,coveredBranchPercent:89,coveredFunctionPercent:100,lines:[]}));
assert.equal(evaluarCobertura({files}).errores.length,2);
});
test('Reporte escapa contenido y mantiene aceptación pendiente',()=>{
const r={estado:'fallida',id:'prueba',fecha:'hoy',commit:'abc',node:'24',plataforma:'linux',duracionMs:1,sintaxis:{archivos:1},errores:['<script>alert(1)</script>'],cobertura:{archivos:[]},etapas:[]};
const html=informe(r);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('Aceptación manual: PENDIENTE'));
});

test('Reportero usa URL file portable y conserva la ruta original',()=>{
const {reporteroURL}=require('../scripts/qa-motor.cjs');
const {fileURLToPath}=require('node:url');
assert.ok(reporteroURL.startsWith('file:'));
assert.equal(fileURLToPath(reporteroURL),path.resolve(__dirname,'../scripts/qa-reportero.cjs'));
});
