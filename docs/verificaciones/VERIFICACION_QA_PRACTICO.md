# Verificación del QA práctico

Verificado el 2026-11-03 en Linux, Node.js 24.19.0, Playwright 1.64.1 y Chromium del entorno.

- `npm run qa`: código 0, 84 casos aprobados (34 unitarios + 50 de integración/funcionales).
- IVA: líneas 100%, ramas 96.55%, funciones 100%.
- Motor contable: líneas 98.44%, ramas 94.06%, funciones 100%.
- `node --test tests/qa.test.cjs`: 3 controles aprobados; incluyen procesos aislados con fallo intencional, omisión, ausencia de casos esperados y cobertura insuficiente.
- Ejecución con `CHROMIUM_PATH` inexistente: código 1, reporte BLOQUEADA, sin reutilizar la aprobación anterior.
- HTML renderizado en Chromium y enlaces a registros/JSON comprobados; sin errores JavaScript. La apertura automática del navegador de escritorio de Windows requiere comprobarse en ese equipo; aquí no hay escritorio gráfico.
- Sintaxis de los nuevos scripts y pruebas válida; `git diff --check` sin errores.

El HTML identifica fecha, ejecución y commit. Conserva aceptación manual PENDIENTE. Los perfiles de navegador de integración son efímeros; no se usa la base de datos del usuario. Los artefactos se generan localmente, fuera de Git.

## Compatibilidad del reportero en Windows

Se cambió el argumento `--test-reporter` de ruta absoluta a URL `file:` mediante `pathToFileURL`, para evitar que el cargador ESM interprete `C:` como un protocolo. También se muestran los errores estándar del proceso fallido en la terminal. El control del lanzador ahora incluye la URL del reportero (4 controles). La ejecución nativa en Windows queda por confirmar en el equipo del usuario.
