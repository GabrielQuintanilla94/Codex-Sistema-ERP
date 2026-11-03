'use strict';
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
function abrirReporte(archivo){
if(!fs.existsSync(archivo))throw Error('No existe el reporte. Ejecutá npm run qa primero.');
let comando,args,env=process.env;
if(process.platform==='win32'){comando='powershell.exe';args=['-NoProfile','-NonInteractive','-Command','Start-Process -FilePath $env:ERP_QA_REPORTE'];env={...process.env,ERP_QA_REPORTE:archivo};}
else if(process.platform==='darwin'){comando='open';args=[archivo];}
else if(process.env.DISPLAY||process.env.WAYLAND_DISPLAY){comando='xdg-open';args=[archivo];}
else return;
const hijo=spawn(comando,args,{env,stdio:'ignore',detached:true});
hijo.on('error',()=>console.error('Abrí el reporte manualmente:',archivo));hijo.unref();
}
if(require.main===module){try{abrirReporte(path.resolve(__dirname,'../reportes-qa/index.html'));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={abrirReporte};
