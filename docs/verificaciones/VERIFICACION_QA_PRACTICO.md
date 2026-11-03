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

## Reporte simplificado

Se retiró el formulario de aceptación manual del HTML y su campo del JSON. El resumen separa pruebas que pasaron, fallaron y quedaron sin completar; explica datos de ejemplo, rechazos esperados y cobertura. Nombres técnicos, registros y metadatos quedan desplegables.

Verificación: 5 controles del lanzador/reporte aprobados. Se renderizó el nuevo HTML en Chromium usando la última ejecución real de 84 casos, comprobando conteos 84/0/0, apertura de casos, ausencia del formulario manual, ausencia de errores JavaScript y ancho móvil de 375 px sin desbordamiento. No se modificaron cálculos, operaciones ni sus pruebas.
