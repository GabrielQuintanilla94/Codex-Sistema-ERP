# `graficos.js` — documentación técnica V3

## Qué es
Módulo de visualización compartido, sin dependencias, que dibuja con SVG y HTML: columnas agrupadas con tooltip y tabla equivalente, sparklines para indicadores y rankings de barras horizontales.

## Fases A–H
- **A. Objetivo:** representar datos ya calculados por el dominio; nunca calcula saldos ni escribe en IndexedDB.
- **B. Entrada:** `{categorias, series:[{nombre, valores}], activo}` o listas `{nombre, valor}`; los números no finitos se tratan como 0.
- **C. Validación:** escalas siempre incluyen 0; con datos vacíos se usa una escala de 0 a 100 y un mensaje de vacío.
- **D. Procesamiento:** funciones puras (`graficoEscala`, `graficoGeometriaColumnas`, `graficoVariacion`, `graficoPuntosSparkline`) con salida determinista.
- **E. Decisión:** barras ≤ 24 px y 2 px de separación; variación en % solo si la base es positiva; si no, diferencia absoluta.
- **F. Recuperación:** contenedor ausente → no hace nada (`false`); sin `ResizeObserver` → render estático.
- **G. Verificación:** firma JSON de datos + ancho por contenedor; si coincide no se redibuja (render atómico). Pruebas unitarias y de integración.
- **H. Telemetría:** sin red ni eventos; la accesibilidad se expone con `aria-label`, foco por teclado y tabla equivalente.

Guía completa: `docs/diseno/VISUALIZACION_BI.md`.
