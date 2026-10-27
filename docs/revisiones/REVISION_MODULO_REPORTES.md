# Revisión breve — Reportes y motor contable

- `js/motor_contable.js`: Balanza, Estado de resultados y Balance general incluyen triple verificación matemática.
- `js/reportes/reportes.js`: vuelve a leer IndexedDB antes de generar, bloquea Generar durante I/O y no renderiza un reporte sin verificación válida.
- Drill-down: sigue filtrando exclusivamente por código de cuenta y período.

Verificaciones: Debe=Haber, saldos deudores=acreedores, resultado=ingresos-gastos y Activo=Pasivo+Patrimonio+Resultado.
