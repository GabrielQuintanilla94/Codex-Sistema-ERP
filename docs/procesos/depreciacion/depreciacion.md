# Proceso — depreciacion.js — SRP y triple verificación

## Objetivo
Calcular y contabilizar depreciación lineal de activos fijos con responsabilidades separadas, ausencia de fórmulas duplicadas, entradas temporales deterministas y tres verificaciones matemáticas antes de usar resultados.

## Pipeline
```text
Adquisición PPE
→ validar datos
→ construir metadata
→ reconstruir auxiliar
→ calcular calendario puro
→ verificar fórmula (V1)
→ verificar invariantes (V2)
→ verificar cálculo a corte (V3)
→ resultado autorizado
→ agrupar activos por período
→ construir una sola partida consolidada por período
→ persistir
→ verificar persistencia
```

## Fases A–H
- **A Objetivo:** obtener depreciación correcta, reproducible y trazable.
- **B Entrada:** activo, costo, residual, vida útil, fecha disponible, fecha de corte y fecha del sistema.
- **C Validación:** fechas ISO, costo > residual, vida > 0, cuentas auxiliares y metadatos PPE.
- **D Procesamiento:** línea recta y prorrateo de primer período en centavos; agrupación de todas las cuotas vencidas por período antes de construir la partida.
- **E Decisión:** solo un resultado con V1 ∧ V2 ∧ V3 puede consumirse; solo meses cerrados pueden contabilizarse y cada período cerrado admite una sola partida automática consolidada.
- **F Recuperación:** errores fail-fast; si se migran partidas antiguas por activo y falla el nuevo guardado, se eliminan las nuevas y se restauran las anteriores.
- **G Verificación:** tres niveles matemáticos + relectura de IndexedDB después del guardado.
- **H Telemetría:** contadores de cálculos, errores y verificaciones.

## Triple verificación
```text
V1: Base, cuota y suma total del calendario
V2: Acumulada/valor en libros de cada período y límites
V3: Recalculo independiente de acumulada/valor en libros a la fecha efectiva
```

## Determinismo
```text
FechaEfectiva = min(FechaCorte, FechaSistemaSnapshot)
```
La fecha del sistema se captura una vez por operación y se pasa al cálculo.

## Consolidación por período
```text
Periodo 2026-08
  Activo A → cuota A
  Activo B → cuota B
  Activo C → cuota C
        ↓
1 movimiento DEP-202608
        ↓
2 líneas por activo: gasto + depreciación acumulada
```

Invariante:
```text
COUNT(partidas_depreciacion_automaticas(periodo)) = 1
```
si existen activos depreciables para ese período.
