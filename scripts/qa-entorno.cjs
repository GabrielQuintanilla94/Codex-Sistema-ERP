'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
function opcionesChromium(){
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
if(process.env.CHROMIUM_PATH){if(!fs.existsSync(process.env.CHROMIUM_PATH))throw Error('CHROMIUM_PATH no existe. Corregí la ruta o eliminá esa variable.');return{executablePath:process.env.CHROMIUM_PATH,...(process.platform==='linux'?{args:['--no-sandbox']}:{})};}
const candidatos=[chromium.executablePath()];
if(process.platform==='win32')for(const base of [process.env.ProgramFiles,process.env['ProgramFiles(x86)'],process.env.LOCALAPPDATA].filter(Boolean))candidatos.push(path.join(base,'Microsoft','Edge','Application','msedge.exe'),path.join(base,'Google','Chrome','Application','chrome.exe'));
if(process.platform==='linux')candidatos.push('/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome');
if(process.platform==='darwin')candidatos.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const executablePath=candidatos.find(p=>fs.existsSync(p));
if(!executablePath)throw Error('No se encontró navegador. Ejecutá npm run qa:preparar una vez.');
return{executablePath,...(process.platform==='linux'?{args:['--no-sandbox']}:{})};
}
function preparar(){
try{const o=opcionesChromium();console.log('Navegador listo:',o.executablePath);return 0;}catch(error){if(process.env.CHROMIUM_PATH)throw error;}
const cli=path.join(path.dirname(require.resolve('playwright/package.json')),'cli.js');
const resultado=spawnSync(process.execPath,[cli,'install','chromium'],{stdio:'inherit'});
if(resultado.error)throw resultado.error;
if(resultado.status!==0)throw Error('No se pudo instalar Chromium. Revisá la conexión y repetí npm run qa:preparar.');
console.log('Navegador listo:',opcionesChromium().executablePath);return 0;
}
if(require.main===module){try{process.exitCode=preparar();}catch(e){console.error(e.message);console.error('Si faltan dependencias, ejecutá npm ci.');process.exitCode=1;}}
module.exports={opcionesChromium,preparar};
