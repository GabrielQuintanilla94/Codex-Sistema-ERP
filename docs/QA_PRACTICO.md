# QA desde VS Code

Requisito: Node.js 24 o posterior. No requiere otro IDE ni pegar código en la consola del navegador.

En la terminal PowerShell de VS Code, ubicada en la carpeta del proyecto:

```powershell
npm.cmd ci
npm.cmd run qa
```

`ci` instala las dependencias fijadas en `package-lock.json`; se repite al cambiar esas dependencias. Para las siguientes demostraciones basta `npm.cmd run qa`. En Linux/macOS se puede usar `npm`.

El comando comprueba la sintaxis, ejecuta 34 pruebas unitarias sobre los archivos reales de IVA y motor contable, y 50 pruebas de integración y flujos funcionales en navegador. Después abre `reportes-qa/index.html` en el navegador predeterminado. No necesitás abrir Live Server. Usa un servidor temporal y bases IndexedDB aisladas de tus datos.

Utiliza Chromium instalado o Edge/Chrome detectado. Si falta navegador, descarga Chromium mediante Playwright; esa primera preparación requiere conexión. También puede prepararse con `npm.cmd run qa:preparar`. Para elegir un ejecutable, definir `CHROMIUM_PATH` con su ruta completa.

## Qué mostrar

1. Ejecutar `npm.cmd run qa` y mostrar el resultado de la terminal.
2. Mostrar los casos aprobados/fallidos y la cobertura en el HTML.
3. Mostrar fecha, identificador de ejecución y commit para identificar la evidencia.
4. Completar la aceptación manual durante la demostración e imprimir el reporte como PDF.

El HTML incluye enlaces a JSON y registros. Cada ejecución conserva su propia carpeta; el último reporte se actualiza incluso si la ejecución queda bloqueada. `npm.cmd run qa:abrir` vuelve a abrir el último reporte. `npm.cmd test` ejecuta lo mismo sin abrir el navegador.

## Criterios de aprobación automática

- Sintaxis válida en todos los archivos `js/**/*.js`.
- Al menos 34 casos unitarios y 50 de integración; ninguno fallido, omitido o pendiente.
- Por cada archivo medido: líneas ≥90%, ramas ≥90% y funciones 100%.
- El proceso devuelve código 0 si aprueba; devuelve 1 ante fallo, prerrequisito ausente, cobertura insuficiente o salida inválida.

La cobertura solo mide `js/impuestos/iva.js` y `js/motor_contable.js`, mediante V8 y las pruebas unitarias; no significa que todo el ERP tenga esa cobertura. La regresión es la repetición de los casos existentes. La aceptación del usuario y la conciliación con sus documentos siguen siendo manuales. Estos umbrales son criterios del proyecto, no una garantía de calificación ni un estándar universal.

Para comprobar el mecanismo del reporte ante fallos:

```powershell
node --test tests/qa.test.cjs
```

Este control provoca fallos y omisiones dentro de procesos aislados y comprueba que sean rechazados. No modifica el sistema. El reporte HTML es estático y no depende de servicios externos. Las carpetas `node_modules/` y `reportes-qa/` quedan fuera de Git. La aplicación sigue funcionando sin npm en producción.

Si PowerShell muestra un bloqueo de `npm.ps1`, usá los comandos `npm.cmd` indicados. Si no se abre el reporte automáticamente, abrí `reportes-qa/index.html` desde el explorador de archivos. No borres los datos del navegador para ejecutar estas pruebas.
