'use strict';
// Inicio fase 0: referencias del análisis estático HTML5 (ver docs/QA_ESTATICO_HTML5.md)
const fs=require('node:fs');
const path=require('node:path');
const {HtmlValidate}=require('html-validate');
const raiz=path.resolve(__dirname,'..');
const CONFIG={extends:['html-validate:recommended'],rules:{'doctype-style':'off','input-missing-label':'error','no-missing-references':'error','heading-level':'error','missing-doctype':'error','no-unknown-elements':'error'}};
const CRITICOS=new Set(['close-attr','close-order','element-name','element-permitted-content','element-permitted-occurrences','element-permitted-order','element-permitted-parent','element-required-ancestor','element-required-attributes','element-required-content','no-dup-attr','no-dup-id','attribute-allowed-values','attribute-misuse','void-content','doctype-html','missing-doctype','valid-id','valid-for','form-dup-name','map-dup-name','map-id-name','unrecognized-char-ref','no-missing-references','no-unknown-elements','deprecated','no-deprecated-attr','script-element','attr-delimiter','attr-spacing','no-multiple-main','input-attributes','valid-autocomplete','recurso-local']);
const MENORES=new Set(['attr-case','attr-quotes','attribute-boolean-style','attribute-empty-style','element-case','long-title','no-dup-class','no-implicit-input-type','no-inline-style','no-redundant-aria-label','no-redundant-for','no-redundant-role','no-self-closing','no-trailing-whitespace','prefer-native-element','prefer-tbody','script-type','tel-non-breaking','unique-landmark','wcag/h63','void-style','no-utf8-bom','no-raw-characters','no-conditional-comment','prefer-button','no-implicit-close','deprecated-rule','no-unused-disable']);
const PESOS={critico:3,mayor:1,menor:0.1},TOPE_MENOR=1,NOTA_MINIMA=9;
// Fin fase 0
// Inicio fase 1: clasificación determinista (regla no listada = mayor, para no ocultar defectos)
const dentroDeForm=selector=>String(selector||'').split(' > ').some(s=>/^form(?![\w-])/.test(s));
function severidad(m){if(m.ruleId==='no-implicit-button-type')return dentroDeForm(m.selector)?'mayor':'menor';return CRITICOS.has(m.ruleId)?'critico':MENORES.has(m.ruleId)?'menor':'mayor';}
function nota(c){return Math.max(1,Math.round((10-PESOS.critico*c.critico-PESOS.mayor*c.mayor-Math.min(TOPE_MENOR,PESOS.menor*c.menor))*10)/10);}
// Fin fase 1
// Inicio fase 2: verificación de recursos locales (src/href) que html-validate no comprueba
function recursosLocales(texto,archivo){const hallazgos=[],patron=/\b(?:src|href)\s*=\s*"([^"]*)"/g;let m;while((m=patron.exec(texto))){const ref=m[1].split(/[?#]/)[0];if(!ref||/^[a-z][a-z0-9+.-]*:|^\/\//i.test(m[1]))continue;if(!fs.existsSync(path.resolve(path.dirname(archivo),ref)))hallazgos.push({ruleId:'recurso-local',line:texto.slice(0,m.index).split('\n').length,column:m.index-texto.lastIndexOf('\n',m.index-1),message:`El recurso local "${ref}" no existe`,selector:''});}return hallazgos;}
// Fin fase 2
// Inicio fase 3: análisis por archivo (unidad = un documento HTML)
function analizarTexto(texto,archivo=path.join(raiz,'fragmento.html')){
const hv=new HtmlValidate(CONFIG);
const mensajes=[...hv.validateStringSync(texto,archivo).results.flatMap(r=>r.messages),...recursosLocales(texto,archivo)];
const hallazgos=mensajes.map(m=>({regla:m.ruleId,severidad:severidad(m),linea:m.line,columna:m.column,mensaje:m.message,selector:m.selector||''}));
const conteo={critico:0,mayor:0,menor:0};for(const h of hallazgos)conteo[h.severidad]++;
return{archivo:path.relative(raiz,archivo).split(path.sep).join('/'),bytes:Buffer.byteLength(texto),hallazgos,conteo,nota:nota(conteo),aprobado:conteo.critico+conteo.mayor===0};
}
function analizarProyecto(){
const archivos=fs.readdirSync(raiz).filter(f=>f.endsWith('.html')).sort();
const resultados=archivos.map(f=>{const ruta=path.join(raiz,f);return analizarTexto(fs.readFileSync(ruta,'utf8'),ruta);});
const total=resultados.reduce((t,r)=>({critico:t.critico+r.conteo.critico,mayor:t.mayor+r.conteo.mayor,menor:t.menor+r.conteo.menor,bytes:t.bytes+r.bytes}),{critico:0,mayor:0,menor:0,bytes:0});
const notaGlobal=Math.round(resultados.reduce((s,r)=>s+r.nota,0)/resultados.length*10)/10;
return{resultados,total,notaGlobal,densidad:Math.round((total.critico+total.mayor)/(total.bytes/1024)*100)/100,aprobado:resultados.every(r=>r.aprobado)&&notaGlobal>=NOTA_MINIMA};
}
// Fin fase 3
// Inicio fase 4: salida legible en terminal (npm run qa:html)
if(require.main===module){
const d=analizarProyecto();
console.table(d.resultados.map(r=>({archivo:r.archivo,nota:r.nota,criticos:r.conteo.critico,mayores:r.conteo.mayor,menores:r.conteo.menor})));
for(const r of d.resultados)for(const h of r.hallazgos)console.log(`${r.archivo}:${h.linea}:${h.columna} [${h.severidad}] ${h.regla} — ${h.mensaje}`);
console.log(`Nota global: ${d.notaGlobal}/10 · Defectos bloqueantes por KB: ${d.densidad} · ${d.aprobado?'APROBADO':'NO APROBADO'}`);
process.exitCode=d.aprobado?0:1;
}
module.exports={analizarTexto,analizarProyecto,severidad,nota,NOTA_MINIMA};
// Fin fase 4
