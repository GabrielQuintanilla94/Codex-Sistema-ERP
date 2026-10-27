# Verificación — cierre mensual y captura ampliada

- El diálogo de Nueva partida usa hasta 1560 px o el ancho disponible del viewport y la tabla de captura reduce su ancho mínimo a 1080 px.
- `fechaCorteEfectivaDepreciacion()` limita el corte a `min(fecha solicitada, fecha del sistema)`.
- `calcularDepreciacionAFecha()` ya no reconoce depreciación parcial de un mes abierto.
- La matriz muestra `—` para meses abiertos o futuros.
- `sincronizarDepreciacionAutomatica()` genera partidas únicamente cuando `ultimoDia(periodo) <= fechaCorteEfectiva`.
- La cuota mensual continúa siendo `round((Costo - Residual) / (VidaUtilAnios × 12))`; el primer período conserva el prorrateo por días solicitado previamente.
- `node --check` valida los JavaScript modificados.
