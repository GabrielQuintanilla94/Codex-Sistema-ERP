# terceros.js — reflejo técnico v3

## A. Objetivo
Proveer el catálogo reutilizable de razón social, NRC y giro para compras y ventas.
## B. Entrada
IndexedDB y `datos/terceros.json`.
## C. Validación
Solo persiste el JSON cuando el store está vacío.
## D. Procesamiento
Ordena por razón social y permite búsqueda exacta por NRC.
## E. Decisión
IndexedDB tiene prioridad; JSON funciona como semilla inicial.
## F. Recuperación
Errores de red o persistencia se propagan.
## G. Verificación
El NRC es la clave única del store `terceros`.
## H. Telemetría
Sin estado global adicional.
