# Proceso — depreciacion_ui.js — SRP de presentación

## Objetivo
Presentar exclusivamente cálculos de depreciación previamente autorizados por las tres verificaciones del dominio.

## Flujo
```text
Movimientos BD
→ reconstruir activos
→ solicitar cálculo al dominio
→ exigir verificación V1/V2/V3
→ preparar filas/totales
→ renderizar DOM
```

## Regla crítica
```text
Render permitido ⇔ resultado.verificacion.valido = true
                  ∧ cantidad(niveles) = 3
```

## Aislamiento
La UI no implementa fórmulas contables ni decide cuentas Debe/Haber. Solo coordina interacción y representación.
