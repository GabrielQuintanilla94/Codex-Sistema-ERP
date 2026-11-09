'use strict';
// Prueba unitaria estática HTML5: unidad = un documento HTML. Criterios en docs/QA_ESTATICO_HTML5.md
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {analizarTexto,analizarProyecto,NOTA_MINIMA}=require('../../scripts/qa-html.cjs');
const d=analizarProyecto();
const resumen=h=>h.map(x=>`L${x.linea}:${x.columna} [${x.severidad}] ${x.regla}: ${x.mensaje}`).join('\n');
// Inicio fase 1: un caso por documento (0 críticos y 0 mayores)
for(const r of d.resultados)test(`[HTML] Página ${r.archivo} · nota ${r.nota}/10 · ${r.conteo.critico} críticos, ${r.conteo.mayor} mayores, ${r.conteo.menor} menores`,()=>{assert.equal(r.conteo.critico+r.conteo.mayor,0,resumen(r.hallazgos));});
test(`[HTML] Nota global ${d.notaGlobal}/10 (mínimo ${NOTA_MINIMA}) · defectos bloqueantes por KB: ${d.densidad}`,()=>{assert.ok(d.aprobado,`Nota global ${d.notaGlobal}`);});
// Fin fase 1
// Inicio fase 2: controles del oráculo (defectos sembrados = sin falsos negativos; HTML correcto = sin falsos positivos)
const base=c=>`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Control</title></head><body><main>${c}</main></body></html>`;
test('[HTML] Control: un documento conforme no produce hallazgos',()=>{const r=analizarTexto(base('<h1>Título</h1><label>Monto<input type="number"></label><button type="button">Guardar</button>'));assert.deepEqual(r.conteo,{critico:0,mayor:0,menor:0});assert.equal(r.nota,10);});
test('[HTML] Control: detecta defectos críticos sembrados',()=>{const r=analizarTexto(base('<p id="a">x</p><p id="a">y</p><div><span></div></span><script src="js/no-existe.js"></script>'));const reglas=new Set(r.hallazgos.filter(h=>h.severidad==='critico').map(h=>h.regla));for(const regla of ['no-dup-id','close-order','recurso-local'])assert.ok(reglas.has(regla),regla+' no detectada');assert.equal(r.aprobado,false);});
test('[HTML] Control: detecta defectos de accesibilidad sembrados',()=>{const r=analizarTexto(base('<h1>A</h1><h1>B</h1><input type="text"><img src="css/estilos.css"><button type="button"></button>'));const reglas=new Set(r.hallazgos.filter(h=>h.severidad==='mayor').map(h=>h.regla));for(const regla of ['heading-level','input-missing-label','wcag/h37','text-content'])assert.ok(reglas.has(regla),regla+' no detectada');assert.ok(r.nota<NOTA_MINIMA);});
test('[HTML] Control: botón sin type es mayor dentro de form y menor fuera',()=>{const dentro=analizarTexto(base('<form><button>Enviar</button></form>')),fuera=analizarTexto(base('<nav aria-label="x"><button>Ir</button></nav>'));assert.equal(dentro.conteo.mayor,1);assert.equal(fuera.conteo.mayor,0);assert.equal(fuera.conteo.menor,1);});
test('[HTML] Control: la nota es determinista y los menores restan como máximo 1 punto',()=>{const t=base('<input id="x" type="text" aria-label="x">'.repeat(1)+'<div style="color:red">a</div>'.repeat(20));assert.deepEqual(analizarTexto(t),analizarTexto(t));assert.equal(analizarTexto(t).nota,9);});
// Fin fase 2
