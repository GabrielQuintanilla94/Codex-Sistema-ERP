# Verificación de corrección — edición y reportes

- `index.html` carga `js/diario/libro_diario.js`; la edición fue implementada en ese archivo efectivo.
- Partidas `Manual` y `CSV` muestran `Editar partida`.
- La edición usa `actualizarMovimientoBD()` y conserva el `id`.
- Se publica `PARTIDA_EDITADA` después de verificar persistencia.
- `6xxx` se clasifica como `Gastos`, por lo que gasto por depreciación entra al Estado de Resultados.
- Las cuentas de depreciación acumulada `13xx`, de naturaleza acreedora, reducen el activo en el Balance General.
- La Balanza puede generarse de forma independiente del Balance General.
- Se ejecutó `node --check` sobre los JavaScript modificados sin errores de sintaxis.
- Se probó el motor con: Automóvil 25,000 + Otros bienes muebles 500 + depreciación 520.83; el Balance resultó Activo neto 24,979.17 = Pasivo 25,500 + Resultado -520.83.
