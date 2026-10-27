# Verificación — módulo de depreciación automática

- Las adquisiciones PPE siguen originándose en las cuentas auxiliares `1201`–`1204` del Libro Diario.
- Las vidas útiles configuradas son: Edificios 20 años, Maquinaria 5 años, Automóviles 4 años y Otros bienes muebles 2 años.
- El método implementado es línea recta con primer período prorrateado por días.
- Cada categoría enlaza una cuenta auxiliar `620x` de gasto y una `130x` de depreciación acumulada.
- `sincronizarDepreciacionAutomatica(fechaCorte)` solo genera períodos cuyo cierre mensual es igual o anterior al corte.
- La llave lógica `codigoActivo + periodo` impide repetir automáticamente la depreciación del mismo activo/mes.
- Las partidas se guardan en `movimientos`; no existe libro paralelo.
- La pantalla no contabiliza solo por abrirse: la acción explícita es **Contabilizar al corte**.
- Después de guardar, las partidas se releen desde IndexedDB para verificar su existencia.
- `depreciacion.js` y `depreciacion_ui.js` pasan `node --check`.
