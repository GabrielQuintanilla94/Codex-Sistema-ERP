# importador_csv.js — reflejo técnico v3

## A. Objetivo
Transformar CSV comercial en objetos sin duplicar lógica contable.
## B. Entrada
Texto CSV UTF-8.
## C. Validación
Respeta comillas dobles y encabezados; conserva número de fila para errores.
## D. Procesamiento
Una pasada O(n) sobre caracteres y una pasada O(r) sobre filas.
## E. Decisión
La agrupación usa fecha+documento y una clave adicional cuando corresponde.
## F. Recuperación
Las validaciones de dominio se realizan en Compras/Ventas y no aquí.
## G. Verificación
Cada objeto conserva exactamente las columnas del encabezado recibido.
## H. Telemetría
Sin estado global mutable.
