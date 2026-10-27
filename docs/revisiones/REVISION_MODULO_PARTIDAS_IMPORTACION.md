# Revisión breve — Partidas manuales e importación

- `partida_manual.html`: única pantalla de captura manual; no existe ya una vista general redundante del Libro Diario.
- `js/diario/libro_diario.js`: valida partida doble, auxiliares y metadata de inventario/PPE.
- `js/importacion/importador_partidas.js`: vista previa, rechazo total si existen errores y verificación posterior a persistencia.
- El lote CSV ahora usa una sola marca de tiempo y orden estable por fecha+número, mejorando determinismo.

Los movimientos se consultan desde el drill-down de Reportes.
