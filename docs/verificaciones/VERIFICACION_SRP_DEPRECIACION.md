# Verificación — Refactor SRP del módulo de depreciación

## Alcance
Archivos revisados:
- `js/depreciacion/depreciacion.js`
- `js/depreciacion/depreciacion_ui.js`
- documentación `.v3.md` y procesos asociados.

## Comprobaciones
1. **SRP:** validación, cálculo, verificación, construcción de asiento, planificación, persistencia y render están separados en funciones específicas.
2. **Redundancia:** la cuota mensual se calcula únicamente en `calcularCuotaMensualCentavos()`; la UI no replica la fórmula.
3. **Determinismo:** `resolverFechaCorteEfectiva(fechaCorte, fechaSistema)` depende solo de parámetros; sincronización y render capturan un snapshot de fecha.
4. **Aislamiento:** funciones matemáticas no acceden a DOM ni IndexedDB.
5. **Verificación triple:** `verificarNivel1FormulaDepreciacion`, `verificarNivel2InvariantesCalendario` y `verificarNivel3CorteDepreciacion` deben aprobar antes de renderizar.
6. **Persistencia:** permanece aislada en `sincronizarDepreciacionAutomatica()` y auxiliares de persistencia.
7. **Sintaxis:** ambos archivos pasan `node --check`.

## Caso matemático de control
Activo automóvil:
```text
Costo = $25,000.00
Residual = $0.00
Vida = 4 años = 48 meses
Disponible = 2026-08-01
Corte = 2026-09-18
Fecha sistema = 2026-09-18
```
Resultado esperado:
```text
Cuota mensual = round(2,500,000 / 48) = 52,083 centavos = $520.83
Agosto cerrado = $520.83
Septiembre abierto = no reconocido
Depreciación acumulada = $520.83
Valor en libros = $24,479.17
V1 = true
V2 = true
V3 = true
```

## Verificación adicional — consolidación por período
- `planificarDepreciacionesPendientes()` agrupa activos por período cerrado.
- `construirPartidaDepreciacionConsolidada()` produce una sola partida por período.
- La metadata `depreciacionAutomatica.detalles[]` conserva trazabilidad por activo.
- El formato anterior de una partida por activo es detectado y migrado al volver a contabilizar.
- Caso probado: Toyota Hilux $520.83 + Escritorio $20.83 → una sola partida `DEP-202608` por $541.66 Debe/Haber.
