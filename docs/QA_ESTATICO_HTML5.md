# QA estático HTML5 (prueba unitaria de código estático)

Ejecución: `npm.cmd run qa:html` (solo HTML, en terminal) o `npm.cmd run qa` (todo el QA con reporte HTML).
Implementación: `scripts/qa-html.cjs` · Casos: `tests/html/estatico.test.cjs` · Herramienta: html-validate 11.16.4 (fijada en `package-lock.json`).

## 0. Precisión terminológica (ISTQB)

ISTQB CTFL v4.0 distingue **prueba de componente/unidad** (§2.2.1, dinámica: ejecuta el código) de **prueba estática** (cap. 3: examina el producto sin ejecutarlo; el análisis estático es su forma automatizada, §3.1). La solicitud «prueba unitaria de código estático» se implementa como **análisis estático con granularidad de unidad**: la unidad es un documento `.html`. ISTQB no define una nota 1–10; la nota es una **métrica del proyecto** construida con conceptos ISTQB: severidad de defectos (§5.5), criterios de salida (§5.1.3) y métricas como densidad de defectos (§5.3.1).

## 1. Prompt v1 (diseño inicial)

```text
Actúa como experto QA certificado ISTQB. Realiza una prueba unitaria de código estático al siguiente HTML5.
Reglas aceptadas: HTML5 válido, semántico, accesible, con buenas prácticas y código limpio.
Reglas rechazadas: errores de sintaxis, etiquetas obsoletas, código redundante y malas prácticas.
Métricas para aprobar: 100 % de cumplimiento, 0 errores y puntuación 10/10.
Califica del 1 al 10, lista los errores, refactoriza el código y cita fuentes bibliográficas.
```

## 2. Veinte errores críticos del prompt v1

FP = falso positivo (marca como defecto algo correcto). FN = falso negativo (deja pasar un defecto real).

| # | Error del prompt v1 | Efecto | Corrección en v2 |
|---|---|---|---|
| 1 | Mezcla prueba unitaria (dinámica) con análisis estático sin definir el tipo | FP/FN | Tipo de prueba explícito: análisis estático (CTFL §3.1) |
| 2 | No define la unidad ni el objeto de prueba | FN (archivos omitidos) | Unidad = cada `.html`; inventario de archivos obligatorio |
| 3 | No define la base de prueba (qué norma y qué versión) | FP/FN | WHATWG HTML Living Standard, WCAG 2.2 A/AA, ARIA in HTML |
| 4 | «Buenas prácticas» y «código limpio» no son verificables | FP | Solo reglas con identificador y fuente |
| 5 | No separa la conformidad de la norma del estilo (ej.: `<!doctype html>` en minúsculas es válido) | FP | `doctype-style` desactivada; las reglas de estilo son «menores» |
| 6 | No clasifica la severidad: todo pesa lo mismo | FP/FN | Crítico / mayor / menor, con tabla cerrada |
| 7 | «100 % de cumplimiento» no dice de qué ni cómo se mide | No medible | Criterios de salida numéricos (sección 5) |
| 8 | «0 errores» bloquea por detalles cosméticos o empuja a ocultar hallazgos | FP/FN | Bloquean solo los críticos y mayores; los menores se informan |
| 9 | No hay fórmula de nota: cada ejecución da un número distinto | No reproducible | Fórmula determinista y publicada |
| 10 | Exigir un 10/10 incentiva el sesgo de confirmación | FN | La nota sale de los hallazgos, nunca al revés |
| 11 | No exige evidencia (línea, columna, regla) | FP (hallazgos inventados) | Cada hallazgo debe traer `archivo:línea:columna` y su regla |
| 12 | Usa el LLM como analizador HTML; un LLM no es un parser y tiene sesgos como juez | FP/FN | La salida de la herramienta es la fuente; el LLM solo interpreta |
| 13 | Ignora que el HTML es un esqueleto que JavaScript completa (tablas vacías a propósito) | FP | Reglas sobre el HTML fuente; el DOM generado queda en las pruebas de integración |
| 14 | No verifica que existan los recursos enlazados (`src`/`href`) | FN | Regla propia `recurso-local` (crítico) |
| 15 | No contempla páginas de redirección (`compras.html`, `ventas.html`, `impuestos.html`) | FP | Se validan como documentos completos y válidos; su brevedad no es defecto |
| 16 | Pide fuentes sin exigir que sean verificables | Bibliografía inventada | Solo fuentes de la sección 8, con su sección citada |
| 17 | No contempla reglas que dependen del contexto (un `<button>` sin `type` dentro de `<form>` envía el formulario) | FP/FN | Mayor dentro de `<form>`; menor fuera |
| 18 | No valida al propio evaluador (no hay controles positivos ni negativos) | FN invisibles | Defectos sembrados + documento conforme (mutación) |
| 19 | Pide refactorizar sin restricciones ni prueba de regresión | Regresión | Conservar IDs, clases, nombres y diseño; pruebas y comparación visual |
| 20 | Sin formato de salida ni trazabilidad (fecha, commit, versión de la herramienta) | No auditable | Informe estructurado (ISO/IEC/IEEE 29119-3) |

## 3. Prompt v2 (refactorizado; usar en DeepSeek u otra IA)

Adjuntar **la salida completa de `npm.cmd run qa:html`** y el archivo HTML que se va a revisar.

```text
ROL: Analista de pruebas (ISTQB CTFL v4.0). Ejecutas un ANÁLISIS ESTÁTICO (CTFL §3.1), no pruebas dinámicas.
OBJETO: cada archivo .html adjunto es una UNIDAD. Lista los archivos recibidos antes de evaluar.
BASE DE PRUEBA: WHATWG HTML Living Standard; WCAG 2.2 niveles A/AA; W3C ARIA in HTML.
FUENTE DE VERDAD: la salida adjunta de html-validate (npm run qa:html). No inventes hallazgos.
  Si propones un hallazgo adicional, márcalo «HIPÓTESIS» con la cita exacta de la norma; no cuenta en la nota.
CONTEXTO DEL PROYECTO (no son defectos):
  - Contenedores vacíos (tbody, div con id) que JavaScript completa en ejecución.
  - Páginas de redirección mínimas que contienen doctype, lang, charset, viewport y title.
  - DOCTYPE en minúsculas (la norma no distingue mayúsculas).
SEVERIDAD (cerrada; una regla no listada = MAYOR):
  CRÍTICO (peso 3): rompe el árbol DOM o el funcionamiento: close-order, element-permitted-*,
    element-required-*, no-dup-id, attribute-allowed-values, missing-doctype, no-missing-references,
    valid-id, deprecated, recurso-local, entre otras listadas en scripts/qa-html.cjs.
  MAYOR (peso 1): accesibilidad WCAG A/AA o riesgo funcional: input-missing-label, heading-level,
    aria-label-misuse, text-content, wcag/h30/h32/h36/h37/h67/h71; button sin type dentro de <form>.
  MENOR (peso 0.1, máximo 1 punto en total): estilo o recomendación: no-implicit-input-type,
    unique-landmark, wcag/h63, prefer-native-element, no-inline-style; button sin type fuera de <form>.
NOTA POR ARCHIVO: max(1, 10 − 3·C − 1·M − min(1; 0,1·m)), redondeada a 1 decimal.
NOTA GLOBAL: promedio de las notas por archivo. DENSIDAD: (C + M) / KB de HTML.
CRITERIOS DE SALIDA: APROBADO si C = 0 y M = 0 en cada archivo y la nota global es ≥ 9,0.
EVIDENCIA OBLIGATORIA por hallazgo: archivo:línea:columna | regla | severidad | fragmento | corrección.
REFACTOR (solo si se pide): corrige primero los críticos, luego los mayores y después los menores. Conserva ids, clases,
  nombres, textos visibles, colores y diseño. No agregues frameworks. Entrega un diff mínimo.
  Tras el refactor, exige volver a ejecutar npm run qa:html y npm run qa; no declares 10/10 sin esa salida.
FORMATO DE SALIDA:
  1) Inventario de unidades. 2) Tabla: archivo | nota | C | M | m. 3) Hallazgos con evidencia.
  4) Veredicto según los criterios de salida. 5) Límites del análisis. 6) Fuentes (solo verificables, con sección).
PROHIBIDO: inventar fuentes; ajustar la nota a un objetivo; tratar el estilo como defecto de conformidad;
  afirmar que el código está «libre de errores» (las pruebas muestran presencia de defectos, no su ausencia).
```

## 4. Reglas que se aceptan y que se rechazan

| Se acepta (conforme) | Se rechaza (defecto) |
|---|---|
| `<!DOCTYPE html>` en cualquier combinación de mayúsculas | Ausencia de doctype, `lang`, `charset` o `title` |
| Contenedores vacíos que JS completa | IDs duplicados, etiquetas mal cerradas, contenido no permitido |
| Redirecciones mínimas válidas | `src`/`href` locales que apuntan a archivos inexistentes |
| `<input>` sin `type` (por defecto es `text`): menor | Controles sin etiqueta accesible (`label`/`aria-label`) |
| `<button>` sin `type` fuera de `<form>`: menor | `<button>` sin `type` dentro de `<form>` (envío accidental) |
| Varias regiones con nombre accesible | Más de un `<h1>` o saltos de nivel de encabezado |
| Atributos ARIA permitidos por ARIA in HTML | `aria-label` en elementos genéricos sin rol |
| Estilos en archivos CSS | Elementos y atributos obsoletos |

## 5. Métricas y criterios de salida

| Métrica | Definición | Umbral para aprobar |
|---|---|---|
| Defectos críticos (C) | Hallazgos de severidad crítica por archivo | 0 |
| Defectos mayores (M) | Hallazgos de severidad mayor por archivo | 0 |
| Defectos menores (m) | Recomendaciones; no bloquean | Se informan |
| Nota por archivo | `max(1, 10 − 3C − M − min(1, 0,1m))` | Informativa |
| Nota global | Promedio de las notas por archivo | ≥ 9,0 |
| Densidad de defectos | (C + M) / KB de HTML analizado | 0 |
| Eficacia del evaluador | Defectos sembrados detectados / sembrados | 100 % (controles 13–17) |
| Unidades analizadas | Archivos `.html` en la raíz | 100 % (11 de 11) |

La suite `tests/html/estatico.test.cjs` tiene 17 casos: 11 unidades, 1 nota global y 5 controles del evaluador. Los controles confirman que un HTML correcto da 0 hallazgos (evita falsos positivos) y que los defectos sembrados se detectan (evita falsos negativos). Además se aplicaron 4 mutaciones al propio evaluador (quitar una regla, cambiar el tope de los menores, desactivar una regla de accesibilidad, ignorar el contexto `<form>`): las 4 fueron detectadas por los controles.

## 6. Diagnóstico inicial (commit `6f74e08`, antes del refactor)

| Archivo | Nota | C | M | m | Hallazgos principales |
|---|---|---|---|---|---|
| catalogo_cuentas.html | 9,8 | 0 | 0 | 2 | `input` sin `type` |
| compras.html | 10 | 0 | 0 | 0 | — |
| depreciacion.html | 9,9 | 0 | 0 | 1 | `aside` sin nombre accesible |
| impuestos.html | 10 | 0 | 0 | 0 | — |
| index.html | 8,8 | 0 | 1 | 2 | `aria-label` en `div` sin rol; 2 `aside` sin nombre |
| inventario.html | 9,9 | 0 | 0 | 1 | `aside` sin nombre accesible |
| matriz_depreciacion.html | 9,0 | 0 | 0 | 11 | `th` sin `scope` (10); `div role="region"` en vez de `section` |
| operaciones.html | 7,0 | 0 | 2 | 18 | 2 selectores de archivo sin etiqueta; 12 `input` y 3 `button` sin `type`; 3 regiones sin nombre |
| partida_manual.html | 9,6 | 0 | 0 | 4 | `input` sin `type`; `aside` sin nombre |
| reportes.html | 8,9 | 0 | 1 | 1 | Dos `<h1>`; estilo en línea |
| ventas.html | 10 | 0 | 0 | 0 | — |
| **Global** | **9,4** | **0** | **4** | **40** | **NO APROBADO** (4 mayores; densidad 0,07/KB) |

## 7. Refactor aplicado y diagnóstico final

Correcciones (sin cambiar nombres, ids, clases ni textos visibles):
- Etiquetas accesibles: `aria-label` en los selectores de archivo CSV, en los `aside` y en la navegación duplicada; `role="img"` en el gráfico de tendencia.
- Tipos explícitos: `type="text"` en 17 campos y `type="button"` en las 3 pestañas de Operaciones.
- Tabla de la matriz: contenedor `section` y `scope="col"`/`"colgroup"` en los encabezados.
- Reportes: el segundo título pasa a `<h2 class="titulo-pagina">` con el mismo estilo que tenía como `<h1>`; el estilo en línea pasa a la clase `acciones-con-margen` en `css/componentes.css` (versión `?v=2`).

Diagnóstico final: **11 de 11 archivos con nota 10; nota global 10/10; 0 críticos, 0 mayores, 0 menores; densidad 0; APROBADO.**

Verificación de no regresión:
- Las 16 capturas (8 pantallas, a 1024 × 876 y 375 px) son idénticas píxel a píxel antes y después del refactor.
- El título de Reportes conserva el mismo tamaño, peso, color, márgenes y posición.
- `npm run qa` con Node 24.14: 101 de 101 aprobadas (34 unitarias, 17 de HTML estático y 50 de integración); los 5 controles del lanzador también aprobaron.
- Durante el refactor, el evaluador detectó un error introducido por un reemplazo automático (atributos dentro de `<thead>`) antes de publicar.

## 8. Fuentes del diseño del prompt

1. ISTQB. *Certified Tester Foundation Level Syllabus v4.0*, 2023. §2.2.1 niveles de prueba; cap. 3 prueba estática; §3.1 análisis estático; §5.1.3 criterios de entrada y salida; §5.3.1 métricas; §5.5 gestión de defectos.
2. ISTQB. *Glossary* (glossary.istqb.org): «false-positive result», «false-negative result», «static analysis», «exit criteria».
3. ISO/IEC/IEEE 29119-1:2022 (conceptos) y 29119-3:2021 (documentación de pruebas).
4. ISO/IEC 25010:2023. Modelo de calidad del producto: mantenibilidad y capacidad de interacción (accesibilidad).
5. WHATWG. *HTML Living Standard*: §13.1.1 DOCTYPE (no distingue mayúsculas); elemento `input` (`type` por defecto `text`); elemento `button` (`type` por defecto `submit`).
6. W3C. *Web Content Accessibility Guidelines (WCAG) 2.2*, 2023. CS 1.3.1, 2.4.6, 3.1.1, 4.1.2; técnicas H44, H63, ARIA11.
7. W3C. *ARIA in HTML* y *WAI-ARIA 1.2*: nombre accesible prohibido en el rol `generic`.
8. html-validate. Documentación de reglas: https://html-validate.org/rules/
9. Jia, Y. y Harman, M. «An Analysis and Survey of the Development of Mutation Testing». *IEEE TSE* 37(5), 2011. Respalda los defectos sembrados para medir la eficacia del evaluador.
10. Zheng, L. et al. «Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena». *NeurIPS* 2023. Sesgos de un LLM usado como juez; respalda que la herramienta sea la fuente de verdad.
11. Myers, G., Sandler, C. y Badgett, T. *The Art of Software Testing*, 3.ª ed. Wiley, 2011. Una prueba revela la presencia de defectos, no su ausencia.

## 9. Límites

- Analiza el HTML fuente. El HTML que JavaScript genera al ejecutarse se comprueba en las pruebas de integración, no aquí.
- No mide contraste de color, orden de foco ni uso real con lector de pantalla: eso requiere una revisión manual o dinámica.
- La nota 10/10 significa que se cumplen los criterios de esta sección con esta herramienta y esta versión. No certifica que el código esté libre de errores.
