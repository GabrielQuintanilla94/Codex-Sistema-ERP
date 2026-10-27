# `dashboard.js` — documentación técnica V3

## Qué es este archivo
`dashboard.js` es el controlador de presentación de la carátula del sistema contable. Reutiliza los datos persistidos y las funciones ya existentes del motor contable para construir exclusivamente el resumen visual del negocio.

## Propósito técnico
Separar la carátula del Libro Diario sin crear una segunda lógica contable. El módulo consulta cuentas y movimientos, invoca `generarBalanzaComprobacion()` y `generarEstadoResultados()` y transforma sus resultados en las tres visualizaciones existentes: disponibilidad bancaria/caja, barras de ingresos y gastos y distribución de gastos de los últimos 30 días.

## Fases A–H
### A. Objetivo
Renderizar el resumen contable sin modificar movimientos, cuentas o cálculos del motor.

### B. Entrada
`cuentas` y `movimientos` provenientes de IndexedDB; fecha local capturada una sola vez por ejecución.

### C. Validación
Si el catálogo está vacío se carga `datos/catalogo_cuentas.json`; los errores de lectura o cálculo impiden renderizar datos parciales engañosos.

### D. Procesamiento
```js
const balanza = generarBalanzaComprobacion(cuentas, movimientos, "", hoy);
const estado = generarEstadoResultados(cuentas, movimientos, desde, hoy);
```
No se replica la lógica de saldos ni del Estado de Resultados.

### E. Decisión
Las cuentas mostradas en disponibilidad cumplen `clasificacion === "Activo"` y nombre compatible con `Banco` o `Caja`. Los gastos se ordenan por `saldoNatural` y se agrupan visualmente solo cuando exceden cuatro categorías.

### F. Recuperación
Ante un error se muestra un estado vacío controlado; no se escriben movimientos ni se corrige información desde la UI.

### G. Verificación
La carátula se considera válida únicamente si sus valores proceden del resultado devuelto por el motor contable existente.

### H. Telemetría
No introduce almacenamiento ni telemetría nueva; la capa permanece de solo lectura.

## Complejidad
La construcción del resumen recorre colecciones linealmente: `O(C + M)` más el costo interno de los reportes ya implementados. La ordenación de gastos es `O(G log G)`.

## Invariante
`dashboard.js` nunca crea, edita, elimina ni contabiliza partidas. Toda cifra contable proviene del motor y toda persistencia pertenece a `base_datos.js`.
