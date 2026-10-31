# Guía evaluable de prueba unitaria JavaScript — objetivo 10/10
Esta guía define una rúbrica propuesta de 10 puntos, criterios de aprobación y evidencia reproducible. No existe un porcentaje de cobertura ni una regla universal de la industria que garantice una nota: si el docente tiene una rúbrica, debe prevalecer. Alcanzar 100 % de cobertura no demuestra ausencia de defectos.

## Fase 0 — Elegir el archivo y preparar el entorno
Registrar antes de probar:
- Archivo `.js`, funciones públicas, versión/commit y responsabilidad de la unidad.
- Entradas, tipos, rangos, resultados, excepciones y efectos secundarios permitidos.
- Dependencias externas y cuáles se simularán. Conservar nombres, arquitectura y contratos existentes.
- Versión de Node.js, runner y comando exacto de ejecución.

Una prueba unitaria aísla una unidad lógica; no significa necesariamente una prueba por archivo ni invocar todas sus funciones privadas. Acceder a IndexedDB real, un navegador, red o varios módulos corresponde a pruebas de integración/E2E. Estas complementan, pero no reemplazan, las unitarias.

El ejemplo autocontenido usa **Node.js 24**, `node:test` y `node:assert/strict`, sin instalar paquetes. Crear una carpeta aparte para no modificar el ERP:
```powershell
node --version
$directorioPrueba = Join-Path $env:TEMP ("prueba-unitaria-js-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path "$directorioPrueba\src", "$directorioPrueba\tests" -Force | Out-Null
Set-Location $directorioPrueba
```
Guardar allí los dos archivos de la fase 2. El ejemplo no reemplaza un módulo del ERP ni convierte sus pruebas de integración en unitarias.

## Fase 1 — Contrato, reglas y matriz de casos
Aplicar **Arrange → Act → Assert (AAA)**: preparar datos, ejecutar la unidad y verificar un resultado observable. Aplicar **FIRST**: pruebas rápidas, independientes, repetibles, con resultado automático y escritas oportunamente con la funcionalidad.

Contrato del ejemplo `calcularTotal(cantidad, precioCentavos)`:
- Ambos argumentos son números enteros seguros, sin coerción implícita, y no negativos.
- El precio y el resultado se expresan en centavos; se admite cero y se normaliza `-0` a `0`.
- El resultado debe ser un entero seguro; un producto fuera de precisión se rechaza.
- Tipos/precisión de argumentos inválidos producen `TypeError`; negativos o total fuera de rango producen `RangeError`.
- No hay I/O, dependencias externas ni mutación de entradas/estado global.

| Categoría | Caso mínimo | Resultado esperado |
| --- | --- | --- |
| Nominal | 2 unidades × 350 centavos | 700 |
| Límites inferiores | Cantidad cero, precio cero y ambos cero | 0 |
| Particularidad de JS | Cantidad/precio `-0` | 0, sin signo negativo |
| Tipos inválidos | Texto, booleano, `null`, `undefined`, objeto, arreglo, función, `Symbol`, `BigInt`, número encapsulado | `TypeError` |
| Números inválidos | `NaN`, infinitos, decimales e enteros inseguros | `TypeError` |
| Rangos inválidos | Cantidad o precio negativos | `RangeError` |
| Límite superior | 1 × `Number.MAX_SAFE_INTEGER` | Valor exacto |
| Desbordamiento | 2 × `Number.MAX_SAFE_INTEGER` | `RangeError` |
| Repetibilidad | Misma entrada en ejecuciones separadas | Mismo resultado |

Para otro archivo, sustituir esta matriz por su contrato real. No asumir que cero, `null`, texto numérico o decimales son inválidos en todas las funciones.

### Qué acepta y qué rechaza JavaScript
- `NaN` e `Infinity` son valores legales de JS; su rechazo depende del contrato. `typeof NaN` devuelve `"number"` y no basta para validarlo.
- JS admite conversiones como `Number("2")`; una unidad puede admitirlas expresamente o rechazarlas. No cambiar su contrato solo para hacer pasar la prueba.
- `==`, `var`, ausencia de punto y coma, `async/await` y callbacks pueden ser sintaxis válida. No implican automáticamente una prueba aprobada o reprobada; el estilo se evalúa con el linter/configuración del proyecto.
- Preferir aserciones estrictas y valores esperados explícitos. No comparar dinero con tolerancias arbitrarias; usar centavos o la política decimal documentada.
- `node --check` solo comprueba sintaxis. No ejecuta casos ni valida reglas de negocio.

## Fase 2 — Implementar la unidad y sus pruebas
### Archivo `src/calcular_total.js`
```javascript
'use strict';
function calcularTotal(cantidad, precioCentavos) {
if (!Number.isSafeInteger(cantidad)) throw new TypeError('cantidad debe ser un entero seguro');
if (!Number.isSafeInteger(precioCentavos)) throw new TypeError('precioCentavos debe ser un entero seguro');
if (cantidad < 0 || precioCentavos < 0) throw new RangeError('Los valores no pueden ser negativos');
const total = cantidad * precioCentavos;
if (!Number.isSafeInteger(total)) throw new RangeError('El total excede la precisión admitida');
return total === 0 ? 0 : total;
}
module.exports = { calcularTotal };
```
### Archivo `tests/calcular_total.test.cjs`
El sufijo `.cjs` explicita CommonJS. Las expectativas se escriben independientemente del cálculo, no copiando el algoritmo dentro del test.
```javascript
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularTotal } = require('../src/calcular_total.js');
test('dos unidades de 350 centavos producen 700 centavos', () => {
const cantidad = 2, precioCentavos = 350, esperado = 700;
const obtenido = calcularTotal(cantidad, precioCentavos);
assert.equal(obtenido, esperado);
});
for (const [cantidad, precioCentavos] of [[0,350],[2,0],[0,0],[-0,350],[2,-0],[-0,-0]]) {
test(`acepta el límite cero: ${cantidad} x ${precioCentavos}`, () => {
assert.equal(calcularTotal(cantidad, precioCentavos), 0);
});
}
const invalidos = [undefined,null,'2',true,NaN,Infinity,-Infinity,1.5,{},[],Number.MAX_SAFE_INTEGER+1,1n,Symbol("x"),()=>1,new Number(2)];
for (const [indice, valor] of invalidos.entries()) {
test(`rechaza tipo o precisión inválidos en cantidad: caso ${indice}`, () => {
assert.throws(() => calcularTotal(valor, 350), {name:'TypeError',message:'cantidad debe ser un entero seguro'});
});
test(`rechaza tipo o precisión inválidos en precio: caso ${indice}`, () => {
assert.throws(() => calcularTotal(2, valor), {name:'TypeError',message:'precioCentavos debe ser un entero seguro'});
});
}
for (const [cantidad, precioCentavos] of [[-1,350],[2,-350]]) {
test(`rechaza valores negativos: ${cantidad} x ${precioCentavos}`, () => {
assert.throws(() => calcularTotal(cantidad, precioCentavos), {name:'RangeError',message:'Los valores no pueden ser negativos'});
});
}
test('acepta el mayor total entero seguro representable', () => {
assert.equal(calcularTotal(1, Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
});
test('rechaza un total que excede la precisión, aunque las entradas sean seguras', () => {
assert.throws(() => calcularTotal(2, Number.MAX_SAFE_INTEGER), {name:'RangeError',message:'El total excede la precisión admitida'});
});
test('mantiene el mismo resultado en ejecuciones repetidas', () => {
const primero = calcularTotal(3, 125);
assert.equal(primero, 375);
assert.equal(calcularTotal(3, 125), primero);
});
```
El patrón parametrizado cubre el mismo tipo de error en ambos argumentos; cada caso es independiente y tiene aserciones. No hay `test.only`, `skip`, `todo`, esperas arbitrarias ni reintentos para ocultar inestabilidad.

### Si la unidad tiene dependencias o es asíncrona
- Simular solo fronteras: repositorio, reloj, aleatoriedad, HTTP o publicador. No sustituir la función bajo prueba por un mock.
- Comprobar valor/estado observable además de llamadas relevantes a dependencias. Restaurar mocks después de cada caso.
- Esperar `await` o devolver la promesa. Para fallos usar `await assert.rejects(...)`; para ausencia de rechazo, `await assert.doesNotReject(...)` más aserciones de resultado.
- Controlar tiempo y aleatoriedad con dependencias inyectadas o temporizadores simulados. No depender de `Date.now()`, zona horaria del equipo, orden de ejecución, Internet ni datos personales.
- Probar éxito y rechazo de cada dependencia crítica, recuperación y ausencia de efectos parciales. Un error capturado no equivale a un caso exitoso si no se verifica su resultado.

## Fase 3 — Ejecutar, medir y demostrar sensibilidad
Desde la carpeta del ejemplo, ejecutar en PowerShell. El carácter de continuación es el acento grave y no debe tener espacios después:
```powershell
node --check .\src\calcular_total.js
if ($LASTEXITCODE -ne 0) { throw "Sintaxis inválida" }
node --test --test-timeout=5000 `
--test-reporter=spec --test-reporter-destination=stdout `
--test-reporter=junit --test-reporter-destination=resultado-unitario.xml `
--experimental-test-coverage `
--test-coverage-include="**/calcular_total.js" `
--test-coverage-lines=90 --test-coverage-branches=90 --test-coverage-functions=100 `
.\tests\calcular_total.test.cjs
$codigoSalida = $LASTEXITCODE
if ($codigoSalida -ne 0) { throw "Pruebas o umbrales reprobados: código $codigoSalida" }
```
Los flags de cobertura son del runner de Node.js 24; comprobar compatibilidad si se usa otra versión. No desactivar verificaciones ni cambiar el runner para esconder un fallo.

Confirmar ejecución real, no solamente un código de salida cero:
```powershell
[xml]$reporte = Get-Content -Raw .\resultado-unitario.xml
$casos = $reporte.SelectNodes("//testcase")
if ($casos.Count -ne 42) { throw "No se ejecutaron los 42 casos esperados del ejemplo" }
if ($reporte.SelectNodes("//failure | //error | //skipped").Count -gt 0) { throw "Hay resultados pendientes o fallidos" }
```
Para una unidad distinta, usar el número esperado de su matriz, no exigir artificialmente 42 casos. El reporte debe incluir el archivo fuente seleccionado y cobertura no vacía; excluir el archivo bajo prueba o medir solo el test invalida la evidencia.

### Métricas y umbrales de esta guía
Son criterios de evaluación propuestos, no porcentajes obligatorios de una norma universal.

| Métrica | Cálculo / evidencia | Aprobación propuesta |
| --- | --- | --- |
| Ejecución | Casos ejecutados frente a matriz acordada | Todos los casos requeridos; nunca cero |
| Resultado | Aprobados, fallidos, cancelados, omitidos y pendientes separados | 100 % aprobados; 0 fallidos/cancelados y 0 casos requeridos omitidos/pendientes |
| Cobertura de líneas | Líneas ejecutadas ÷ líneas instrumentadas | ≥90 % del archivo elegido |
| Cobertura de ramas | Ramas ejecutadas ÷ ramas instrumentadas | ≥90 %; todas las decisiones críticas del contrato cubiertas |
| Cobertura de funciones | Funciones ejecutadas ÷ funciones instrumentadas | 100 % del alcance declarado |
| Repetibilidad | Misma suite y datos controlados | Sin dependencia de orden ni fallos intermitentes observados |
| Tiempo | Duración del runner y timeout | Sin timeout; registrar equipo/versión, sin imponer un tiempo universal |
| Sensibilidad | Error introducido deliberadamente | Al menos un defecto relevante debe ser detectado |

No perseguir cobertura de líneas sin aserciones ni ejecutar funciones privadas solo para subir porcentajes. Las ramas de validación y recuperación importan tanto como el recorrido exitoso. Para reglas críticas, exigir 100 % de sus decisiones aunque el promedio del archivo alcance el umbral.

### Prueba de sensibilidad con una mutación controlada
Ejecutar **solo en la carpeta aislada del ejemplo**. Introducir un error conocido, confirmar que la suite falle y restaurar el archivo incluso si ocurre otro error:
```powershell
$rutaFuente = ".\src\calcular_total.js"
$original = Get-Content -Raw $rutaFuente
try {
$mutado = $original.Replace("return total === 0 ? 0 : total;", "return total + 1;")
if ($mutado -eq $original) { throw "No se aplicó la mutación; la prueba no es válida" }
Set-Content -Path $rutaFuente -Value $mutado -Encoding utf8 -NoNewline
node --test .\tests\calcular_total.test.cjs
if ($LASTEXITCODE -eq 0) { throw "La suite no detectó el defecto introducido" }
} finally {
Set-Content -Path $rutaFuente -Value $original -Encoding utf8 -NoNewline
}
```
Ese fallo es el resultado esperado del experimento, **no** una suite original aprobada con errores. Restaurar y repetir el comando normal antes de entregar. Una mutación detectada demuestra sensibilidad a ese defecto; no es un mutation score global. Si se usa Stryker u otra herramienta, informar mutantes detectados, sobrevivientes, equivalentes/no válidos y timeout por separado; fijar su umbral antes de ejecutar, no después de ver resultados.

## Fase 4 — Aprobar, rechazar y asignar la nota
### Rúbrica propuesta: 10 criterios de un punto
Cada punto exige evidencia, no solamente marcar una casilla. Puntuar 0, 0.5 o 1 según cumplimiento nulo, parcial o completo.

| Punto | Criterio | Evidencia para obtenerlo completo |
| --- | --- | --- |
| 1 | Contrato y alcance | Entradas, salidas, errores, efectos y archivo/funciones identificados |
| 2 | Trazabilidad | Cada requisito del contrato tiene un caso identificable |
| 3 | Recorrido nominal | Resultados correctos calculados independientemente |
| 4 | Límites | Cero, mínimos, máximos, precisión y colecciones vacías cuando apliquen |
| 5 | Rechazos | Tipos, rangos y errores verificados por tipo/mensaje estable o código |
| 6 | Aislamiento | Sin red/BD real; dependencias controladas y restauradas; sin efectos no permitidos |
| 7 | Fallos y asincronía | Rechazos, orden requerido y recuperación; en una función pura, justificar ausencia de asincronía/dependencias |
| 8 | Calidad de la suite | AAA/FIRST, nombres claros, aserciones útiles, sin orden obligatorio ni exclusiones |
| 9 | Cobertura pertinente | Umbrales cumplidos en el archivo real y decisiones críticas cubiertas |
| 10 | Reproducibilidad y sensibilidad | Comando, versión, reporte, resultados reales y defecto controlado detectado |

**10/10 según esta rúbrica:** diez puntos completos, todos los bloqueos resueltos y evidencia adjunta. La nota definitiva corresponde al evaluador.

### Bloqueos: no aprobar aunque la suma parezca suficiente
- Sintaxis o carga del módulo incorrectas; pruebas fallidas, canceladas o sin finalizar.
- Cero casos, ejecución de otro archivo, cobertura vacía, reporte antiguo o exclusión del archivo evaluado.
- Requisitos críticos omitidos; `only`, casos requeridos con `skip`/`todo` o excepciones silenciadas sin verificar.
- Aserciones como `assert.ok(true)`, limitarse a `console.log`, verificar solo que una función exista o afirmar que algo se guardó sin comprobarlo.
- Mock de la unidad evaluada, expectativas producidas por el mismo algoritmo bajo prueba o snapshots aceptados sin revisión.
- Modificar el contrato, eliminar validaciones o relajar umbrales después del resultado para conseguir verde.
- Entregar el archivo mutado, alterar datos del usuario o atribuir a unitarias una ejecución que usó toda la aplicación.

## Aplicación al ERP existente
Seleccionar un `.js` y conservar sus nombres. Ejemplos de responsabilidades unitarias:
- `js/impuestos/iva.js`: conversiones, cálculo, redondeo, pagar/remanente e invariantes con entradas conocidas.
- `js/inventario/inventario_costos.js`: entrada, salida, stock insuficiente y costo ponderado con estado en memoria; verificar que no se muten los datos de entrada donde el contrato lo exige.
- `js/eventos/routing_eventos.js`: DAG, rutas, perfiles, dependencias ausentes y consumidores con dobles; temporizadores controlados para backoff y Half-Open.
- Compras/Ventas: simular el repositorio, provocar fallos de persistencia/relectura y comprobar que no se publique el evento de éxito antes de la verificación.

Los archivos clásicos del navegador no se pueden importar necesariamente con `require`. No copiar sus funciones a una prueba: usar un adaptador separado que evalúe el archivo real en un contexto aislado o la estrategia de módulos ya adoptada. No cambiar toda la arquitectura a CommonJS por este ejemplo. Si depende de DOM/IndexedDB real, documentar esa ejecución aparte como integración.
Las pruebas del ciclo mensual, navegación, estilos y comunicación entre pestañas de `tests/integracion.cjs` siguen siendo de integración; no acreditan por sí solas cobertura unitaria de cada archivo.

## Plantilla de evidencia para entregar
```text
Archivo y commit:
Responsabilidad y contrato:
Funciones públicas evaluadas:
Node/runner y sistema operativo:
Comando y directorio:
Fecha de ejecución:
Casos requeridos / ejecutados:
Aprobados / fallidos / cancelados / omitidos / pendientes:
Cobertura del archivo: líneas / ramas / funciones:
Decisiones críticas verificadas:
Duración y timeout:
Dependencias simuladas y restauración:
Mutación introducida, resultado y restauración:
Archivos de reporte:
Limitaciones y defectos abiertos:
Puntaje por criterio / total:
Dictamen: aprobado / reprobado / incompleto.
```

## Verificación del ejemplo incluido
Se ejecutó con Node.js 24.19.0 en un directorio temporal, fuera del ERP: **42 casos aprobados, 0 fallidos, 0 omitidos, 0 pendientes; 100 % de líneas, ramas y funciones en `src/calcular_total.js`**. El JUnit contiene 42 casos. La mutación `return total + 1` fue detectada y el original se restauró. Esto valida el ejemplo, no asigna automáticamente 10/10 a los módulos del ERP.

## Referencias técnicas
- Node.js, runner y cobertura: https://nodejs.org/api/test.html
- Node.js, aserciones estrictas: https://nodejs.org/api/assert.html
- ESLint, reglas configurables: https://eslint.org/docs/latest/rules/
- Stryker, pruebas de mutación: https://stryker-mutator.io/docs/
Las referencias orientan la práctica; no implican una certificación ni una revisión formal de cumplimiento de una norma ISO.
