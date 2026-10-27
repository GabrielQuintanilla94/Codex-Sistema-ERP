# Fuente y decisiones del exportador F07
Fuente exclusiva: `700-DGII-MN-2021-26031.pdf`, aportado por el usuario. No se consultó la página de Hacienda. El documento describe F-07v14; no se presume que cubra cambios posteriores a esta copia.
SHA-256: `7ead3b975a70eed86d435dcb6e7404be7594e4e120d8a3ed501bfc06a789b179`. PDF de 79 páginas; su numeración impresa empieza dos páginas después del índice físico. El binario original no se duplica en Git.

| Fuente: páginas impresas (páginas PDF) | Regla aplicada |
| --- | --- |
| 2–4 (4–6) | CSV sin encabezados, separador de listas `;`; nombre corto (hasta 25 caracteres). Se mantienen decimales con punto y saltos CRLF. |
| 5–8 (7–10) | Anexo 1: 20 columnas. DTE clase `4`, CCF tipo `03`. D: Número de Control sin guiones; E: Sello de Recepción; F: Código de Generación sin guiones; G: vacío. Antes de noviembre 2022 se intercambian D y F. NRC/NIT sin guiones ni pleca, sin agregar ceros. |
| 5, 7–8 (7, 9–10) | R/S: tipo de operación y de ingreso; antes de enero 2025 ambas `0`. Para las ventas de materiales del ERP, Actividades Comerciales corresponde a `3`, no Servicios (`2`). |
| 11–14 (13–16) | Anexo 2: 23 columnas. DTE de consumidor final se agrupan por día y clasificación Renta. D/E/F/G: `N/A`; H/I: Código de Generación del primer/último DTE emitido (se conserva el UUID original, pues aquí el texto no exige retirar guiones); J: vacío. N: ventas gravadas con IVA incluido. T: total. U/V: `0` antes de enero 2025. |
| 17–20 (19–22) | Anexo 3: 21 columnas. D: Código de Generación sin guiones; antes de noviembre 2022, Número de Control sin guiones. N: crédito fiscal. O: suma G–M; para compras internas gravadas del ERP, equivale a la base, sin sumar N. El total contable con IVA se conserva en `compra.total`; únicamente cambia la columna O exportada. |
| 17, 20 (19, 22) | Q/R/S/T: clasificación de compras; antes de febrero 2024 se exportan cuatro `0`. |

## Identidad y compatibilidad
`documento` sigue siendo referencia interna y parte de la clave comercial. `claseDocumento`, `tipoDocumento`, `codigoGeneracion`, `numeroControl`, `selloRecepcion` y `horaEmision` se capturan aparte. No se inventan ni se deducen de correlativos internos. Las compras/ventas históricas conservan sus datos; se pueden consultar y editar, pero un registro sin identidad fiscal explícita no se convierte automáticamente en DTE al exportar.
La edición conserva identidad existente cuando una llamada API omite los campos fiscales. El formulario permite completarlos; el CSV usa `clase_documento`, `tipo_documento`, `codigo_generacion`, `numero_control`, `sello_recepcion`, `hora_emision`, iguales en todas las líneas de un documento.
La validación UUID/estructura del control es una comprobación sintáctica local, no autenticación del DTE ante Hacienda. Sello requerido para el Anexo 1. La hora real se requiere si hay varios DTE en una agrupación diaria; el orden usa hora y, en empate dentro de una misma serie, Número de Control. Si coinciden hora y series diferentes se rechaza el orden ambiguo. No se usa la fecha de registro en el ERP ni el orden de importación para inferir emisión.

## Alcance explícito
Se implementan compras internas gravadas CCF DTE `03`, ventas gravadas a contribuyentes CCF DTE `03` y consumidor final Factura DTE `01`, que corresponden a los flujos existentes. Los anexos admiten otros casos, pero este ERP todavía no modela documentos físicos, notas de crédito/débito, exportaciones, anulaciones, retenciones ni selección de períodos anteriores para deducibilidad de compras. Tampoco se incorpora la alternativa de DUI en lugar del NRC: el catálogo actual identifica por NRC.
No se simulan esas operaciones con importes cero o códigos prestados. Incorporarlas requiere sus flujos contables y fiscales completos. No se efectuó presentación ni validación en el portal; las pruebas comparan columnas y reglas con esta copia del manual.

## Validación reproducible
Suite `tests/integracion.cjs`, Chromium con IndexedDB real; incluye comparación completa de columnas, reglas de fechas históricas, IVA incluido, consolidación de redondeos, formularios y descarga del archivo.

Resultado ejecutado: **33 pruebas aprobadas, 0 fallidas, 0 omitidas**; sintaxis de los 30 archivos JavaScript y `git diff --check` correctos.
