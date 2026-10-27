# depreciacion_ui.js — P3 v4 SRP / aislamiento de UI

## Qué es este archivo
`js/depreciacion/depreciacion_ui.js` es exclusivamente el controlador de presentación del módulo de depreciación.

## Propósito técnico
Recuperar datos, solicitar cálculos al dominio, comprobar que el resultado viene con triple verificación aprobada y recién entonces renderizar la matriz/totales. No contiene fórmulas contables de depreciación.

## Fases reales

### FASE UI 01 — Formato y escape
Funciones:
```js
dineroDepreciacion()
fechaLocalDepreciacion()
escaparDepreciacion()
```
Responsabilidad: presentación y frontera de reloj del navegador.

### FASE UI 02 — Entrada
```js
cargarActivosDepreciacion()
```
Lee movimientos mediante la capa de BD y delega reconstrucción a `extraerActivosFijosDesdeMovimientos()`.

### FASE UI 03 — Selector de años
```js
prepararAniosDepreciacion()
```
Solo determina opciones visibles del selector. No calcula depreciación acumulada.

### FASE UI 04 — Cálculo validado previo al render
```js
calcularFilasDepreciacionParaRender(fechaCorte, anio, fechaSistema)
```
Punto crítico:
```js
const corte = calcularDepreciacionAFecha(activo, fechaCorte, fechaSistema);
if (!corte.verificacion || !corte.verificacion.valido || corte.verificacion.niveles.length !== 3)
    throw new Error("No se renderizará un cálculo de depreciación sin triple verificación.");
```

Esto implementa la regla:
```text
Renderizar ⇔ V1 ∧ V2 ∧ V3
```

El mismo `fechaSistema` se usa para todas las filas de una renderización:
```js
const fechaSistema = fechaLocalDepreciacion();
```
por lo que la matriz no puede cambiar de criterio temporal entre una fila y otra.

### FASE UI 05 — Render puro de resultados ya verificados
Funciones:
```js
calcularTotalesDepreciacion()
construirHtmlFilaDepreciacion()
renderizarFilasDepreciacion()
renderizarTotalesDepreciacion()
renderizarDepreciacion()
```
La UI no vuelve a calcular la fórmula de línea recta.

### FASE UI 06 — Orquestación y errores
```js
actualizarDepreciacionUI()
```
Coordina carga → años → render y captura errores.

### FASE UI 07 — Contabilización explícita
```js
contabilizarDepreciacionAlCorte()
```
La UI no construye el asiento; delega:
```js
sincronizarDepreciacionAutomatica(fechaCorteDepreciacion.value)
```

### FASE UI 08 — Inicio
```js
iniciarDepreciacionUI()
```
Fija fecha máxima, abre BD y carga el reporte.

## SRP
`depreciacion_ui.js` cambia por motivos de presentación/interacción. Las reglas contables viven en `depreciacion.js`.

## Aislamiento
No contiene:
- fórmula de cuota mensual;
- prorrateo del primer mes;
- cálculo de base depreciable;
- lógica Debe/Haber;
- idempotencia de partidas;
- acceso directo a object stores de IndexedDB.

## Verificación antes de renderizar
La UI exige explícitamente `verificacion.valido === true` y exactamente tres niveles aprobados antes de crear una fila HTML.
