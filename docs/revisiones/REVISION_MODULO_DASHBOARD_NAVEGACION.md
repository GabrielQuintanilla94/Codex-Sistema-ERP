# Revisión breve — Dashboard y navegación

- `dashboard.js`: consume motor contable; no recalcula asientos.
- `nav.js`: queda como única fuente de navegación.
- Se eliminó HTML de navegación duplicado en cada página para evitar divergencias.
- Se retiraron la vista general redundante `libro_diario.html` y scripts raíz duplicados no utilizados.

`partida_manual.html` sigue accesible como acción explícita Nueva partida.
