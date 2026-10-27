# Verificación — algoritmia de 5 fases

## Resultado
**APROBADO** para los flujos revisados.

## Pruebas ejecutadas

### Comercial
Harness: `test_fases5_comercial.js`

Resultado esperado/obtenido:
- compra `02/09/2026` normalizada a septiembre;
- inventario después de compra: 10;
- inventario después de venta de 2: 8;
- orden de eventos: `CompraRegistrada`, `VentaRegistrada`;
- los asserts del publicador exigen que registro/movimiento/inventario existan antes del evento.

Salida: `FASES5_COMERCIAL_OK`.

### Integración comercial + IVA
Harness: `test_fases5_integracion.js`

Flujo probado:
1. registrar compra;
2. editar compra;
3. registrar venta;
4. editar venta;
5. contabilizar cierre IVA;
6. eliminar venta y reconstruir inventario.

Eventos obtenidos en orden:
`CompraRegistrada`, `CompraEditada`, `VentaRegistrada`, `VentaEditada`, `IVACerrado`, `VentaEliminada`.

Salida: `FASES5_INTEGRACION_OK`.

### Depreciación
Harness: `test_fases5_depreciacion.js`.

Se simuló un activo 1204 con cuentas 1304/6204. La sincronización creó una partida consolidada y el publicador verificó que la partida existiera antes de aceptar `DepreciacionSincronizada`.

Salida: `FASES5_DEPRECIACION_OK`.

### Sintaxis
Todos los archivos `.js` fueron validados con `node --check`.
