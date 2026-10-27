# Revisión breve — módulo Depreciación

- El dominio ya estaba separado de la UI y usa línea recta con prorrateo inicial.
- Mantiene tres verificaciones antes de renderizar y antes de contabilizar.
- La UI usa una sola fecha-snapshot por render y refresca después de contabilizar.
- Las partidas automáticas permanecen consolidadas por período.

No se requirió un refactor adicional de fórmula en esta pasada.
