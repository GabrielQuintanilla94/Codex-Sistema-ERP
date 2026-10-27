# Estándares del proyecto

## Código

- Mantener los nombres actuales cuando no exista una razón real para cambiarlos.
- Separar interfaz, reglas contables, almacenamiento, eventos y reportes.
- Evitar duplicar validaciones importantes; las reglas de partida doble y reportes viven en `motor_contable.js`, mientras la valuación/existencia por SKU vive en `js/inventario/inventario_costos.js`.
- Calcular dinero en centavos enteros.
- Escapar texto antes de insertarlo en HTML.
- No guardar partidas descuadradas.
- No permitir salidas de inventario mayores que la existencia disponible.
- Mantener importes de inventario persistidos en centavos enteros y documentar cualquier cambio del método de valuación.
- No ocultar errores de IndexedDB, Web Worker o EDA.

## Criptografía

La aplicación no cifra la IndexedDB porque todavía no administra usuarios, contraseñas ni claves. Agregar cifrado sin administrar correctamente la clave daría una seguridad falsa.

Reglas aplicadas:

- Los identificadores de eventos usan `crypto.randomUUID()`.
- Si `randomUUID()` no existe, se usa `crypto.getRandomValues()` para construir un UUID versión 4.
- No se usa `Math.random()` como fuente criptográfica.
- Los mensajes recibidos por EDA se validan antes de entregarlos a los consumidores.
- No se escriben claves en el código fuente.

Si posteriormente se cifra información:

- Usar Web Crypto API.
- Usar AES-256-GCM para cifrado autenticado.
- Generar un IV nuevo de 96 bits para cada operación.
- Nunca repetir el mismo IV con la misma clave.
- Guardar la clave fuera del código y definir cómo se recupera.
- Usar SHA-256 solamente como huella de integridad; no es cifrado.

Referencias:

- Web Cryptography API: https://www.w3.org/TR/webcrypto/
- AES, FIPS 197: https://csrc.nist.gov/pubs/fips/197/final
- GCM, NIST SP 800-38D: https://csrc.nist.gov/pubs/sp/800/38/d/final

## QA

Cada cambio debe pasar estas comprobaciones:

1. Sintaxis válida en todos los `.js`.
2. JSON válido.
3. Un `.md` de proceso por archivo JavaScript.
4. Pruebas de partida doble, naturaleza, tres reportes, DAG, contrato de eventos y valuación de inventario.
5. Prueba manual de IndexedDB, importación CSV, entradas/salidas de inventario y actualización de reportes.
6. Revisión de la consola del navegador sin errores inesperados.

La validación de entradas sigue el criterio de rechazar datos incorrectos antes de almacenarlos. Como guía se usa OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/

## Automatización

`scripts/verificar_proyecto.ps1` revisa sintaxis, JSON, estructura documental y archivos requeridos. No instala paquetes y no modifica datos.

`tests/pruebas.html` ejecuta las reglas puras en el navegador. Las pruebas de IndexedDB y de interacción visual se conservan como pruebas manuales porque dependen del origen y del navegador.

## Criterio de aceptación

Una entrega se acepta cuando la verificación de PowerShell termina sin errores, las pruebas del navegador pasan y el flujo manual permite crear, importar y eliminar datos válidos sin romper la balanza.

## Patrón global de responsividad (septiembre 2026)

La interfaz aplica un patrón responsive común a Dashboard, Libro Diario, Catálogo, Inventario, Depreciación y Reportes. La regla principal es reorganizar el contenido antes de reducirlo: grids y formularios cambian de columnas según el ancho disponible, mientras las tablas contables conservan un ancho mínimo legible y usan desplazamiento horizontal cuando el contenido excede el viewport.

Breakpoints de referencia:
- Escritorio amplio: distribución completa con barra lateral y grids multicolumna.
- Escritorio medio/tablet (`<=1199px`): barra lateral compacta y reducción progresiva de grids.
- Tablet (`<=900px`): encabezados y formularios se reorganizan; estados financieros se apilan.
- Móvil (`<=720px`): navegación inferior, tarjetas/formularios a una columna y tablas con scroll táctil.
- Teléfonos estrechos (`<=420px`): reducción adicional de espaciado sin comprimir datos contables.

La matriz de depreciación conserva columnas amplias y mantiene Código/Activo visibles durante el desplazamiento horizontal; las tablas de Reportes y la captura del Libro Diario no deben reducir columnas hasta volver ilegibles encabezados o montos.
