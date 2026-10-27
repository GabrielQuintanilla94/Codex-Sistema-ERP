# iva.js — reflejo técnico v3

## A. Objetivo
Centralizar el cálculo del 13% de IVA, el resumen débito/crédito y utilidades comunes de exportación F07.

## B. Entrada
Importes numéricos, compras, ventas y fechas ISO.

## C. Validación
`ivaACentavos()` rechaza valores no numéricos; `calcularIVA()` rechaza bases negativas; `calcularIVACentavos()` exige centavos enteros no negativos.

## D. Procesamiento
Los cálculos monetarios se realizan en centavos. La tasa se expresa también como entero `13` para evitar duplicación de fórmulas flotantes en los módulos consumidores.

## E. Decisión
`resumirIVA()` clasifica una diferencia positiva como IVA por pagar y una negativa como remanente de crédito fiscal.

## F. Recuperación
Los errores se propagan al módulo llamador; no se inventan importes ni se renderizan resultados no verificados.

## G. Verificación
`verificarCalculoIVATresNiveles()` exige simultáneamente:
1. `IVA = round(baseCentavos * 13 / 100)`;
2. `total = base + IVA`;
3. comprobación inversa `base = total - IVA` y límites no negativos.
`calcularIVA()` falla si cualquiera de los tres niveles falla.

## H. Telemetría
No mantiene estado global mutable; las funciones matemáticas son puras y deterministas. `descargarTexto()` es la única utilidad con I/O de navegador.

## Afinación octubre 2026
- El cálculo individual mantiene triple verificación.
- `resumirIVA()` ahora verifica acumulados, diferencia pagar/remanente e identidad de liquidación.
