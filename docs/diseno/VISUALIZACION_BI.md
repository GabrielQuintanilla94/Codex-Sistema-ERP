# Visualización BI del ERP

Guía de las vistas analíticas (Inicio, Inventario, Activos fijos) y del módulo compartido `js/graficos/graficos.js`. Complementa `ESTILOS_COMPARTIDOS.md`.

## 1. Problemas encontrados (antes)

Se auditaron las 8 vistas con seis meses de datos de ejemplo (18 compras, 40 ventas, gastos mensuales y 3 activos fijos):

| # | Problema | Principio que incumplía |
|---|---|---|
| 1 | La «tendencia» repartía un solo mes en bloques de 5 días: no mostraba evolución | Comparar el período contra su historia (Few; IBCS) |
| 2 | Barras sin eje, sin valores ni tooltip; los valores en cero dibujaban barras igual | Toda magnitud debe poder leerse (Cleveland y McGill) |
| 3 | Variaciones sin sentido (`-138.4 %` al pasar de utilidad a pérdida) y solo con color | Variaciones válidas; el color nunca solo (WCAG 1.4.1) |
| 4 | KPI destacado por color sin motivo; etiquetas en mayúsculas en todas las tarjetas | Reducir tinta que no es dato (Tufte) |
| 5 | Íconos de texto (⌂ ⇄ ◇) y menú sin nombres visibles | Navegación reconocible y nombrada |
| 6 | Tablas más angostas que su tarjeta; montos sin separador de miles en Activos fijos | Consistencia y legibilidad |
| 7 | Tarjeta de relleno «Cómo leer este módulo» en Inventario | Cada bloque debe responder una pregunta |

## 2. Principios aplicados

1. **Una pregunta por bloque.** Inicio responde: ¿cuánto vendí y compré?, ¿gané o perdí?, ¿cuánta liquidez tengo?, ¿cuánto IVA debo? y ¿en qué se fue el dinero?
2. **Comparar siempre.** Cada indicador muestra su variación contra el mes anterior, con flecha y signo (▲/▼), y una mini tendencia (sparkline) de 6 meses. El color refuerza, pero nunca es el único indicio.
3. **La forma sigue a la tarea.**
   - Columnas agrupadas para comparar ventas y compras por mes.
   - Barras horizontales ordenadas para los costos y gastos, en lugar de un pastel (Cleveland y McGill).
   - Un medidor para el margen bruto.
   - Cifras grandes para los totales.
4. **Énfasis, no arcoíris.** El mes analizado se muestra en color pleno y los anteriores atenuados. Solo hay dos colores de serie: ventas o ingresos en azul, compras o gastos en naranja.
5. **Un solo filtro, arriba.** El período (‹ mes ›, Mes actual) gobierna todos los bloques de la vista.
6. **Accesible por diseño:**
   - Leyenda siempre visible.
   - Tooltip con ratón y con teclado (Tab).
   - «Ver datos en tabla» como equivalente de cada gráfico.
   - Textos en color de texto, nunca en el color de la serie.
7. **Marcas finas:**
   - Barras de 24 px como máximo, con esquina redondeada en el extremo del dato y separadas 2 px.
   - Guías de 1 px.
   - Ejes con valores redondos (algoritmo de Heckbert).

## 3. Paleta validada

| Rol | Color | Uso |
|---|---|---|
| Serie 1 | `#2a78d6` | Ventas, ingresos, débito |
| Serie 2 | `#eb6834` | Compras, costos y gastos, crédito |
| Variación favorable | `#006300` | Texto de ▲/▼ favorable |
| Variación desfavorable | `#b42323` | Texto de ▲/▼ desfavorable y resultado negativo |
| Neutral | `#5b6778` | Variaciones sin juicio (compras) |

Validación sobre fondo blanco: banda de luminosidad, croma, contraste ≥ 3:1 y separación bajo daltonismo de tipo protan (ΔE 24,7) y tritan (ΔE 32,7). Todas las comprobaciones aprobadas. Los tokens están en `css/componentes.css` (`--viz-*`).

## 4. Arquitectura

- `js/graficos/graficos.js`: módulo nuevo, sin dependencias externas.
  - **Funciones puras:** `graficoEscala`, `graficoFormatoCompacto`, `graficoFormatoEje`, `graficoFormatoMoneda`, `graficoVariacion`, `graficoGeometriaColumnas`, `graficoRutaBarra`, `graficoPuntosSparkline`.
  - **Componentes de interfaz (DOM):** `graficoColumnas`, `graficoSparkline`, `graficoRanking`.
- **Renderizado atómico:** `graficoRender` guarda la firma de los datos y el ancho de cada contenedor. Si un evento EDA no cambia los datos de un bloque, ese bloque no se redibuja (`graficoColumnas` devuelve `false`). `ResizeObserver` redibuja solo cuando cambia el ancho.
- **Seguridad:** los nombres de cuentas y productos se insertan con `textContent`, nunca como HTML.
- **EDA sin cambios:** Inicio sigue siendo el consumidor `dashboard` del router. El módulo de gráficos no publica ni consume eventos, porque no los necesita.
- `js/dashboard.js` separa:
  - el cálculo puro (`dashboardSerieMensual`, `dashboardComposicionResultado`);
  - el renderizado por bloque (`dashboardRenderKPI`, `dashboardRenderResultado`, `dashboardRenderIVA`, etc.).

  Se eliminó `dashboardBloquesPeriodo`: la tendencia de 6 meses la reemplaza.
- `js/nav.js` usa íconos SVG de línea con nombre visible y `aria-current="page"`.

## 5. Cambios por vista

| Vista | Cambio |
|---|---|
| Inicio | Filtro de período en una fila; 5 indicadores con variación y sparkline; columnas de 6 meses con tooltip y tabla; resultado del mes con costo de ventas, gastos de operación y margen bruto; ranking de costos y gastos; IVA con barras de débito y crédito |
| Inventario | Ranking compartido con participación %; se retiró la tarjeta de relleno |
| Activos fijos | Montos con separador de miles; controles de corte en una fila en 1024 px |
| Todas | Fuente del sistema (Segoe UI en Windows); etiquetas de KPI en minúsculas; tablas al 100 % del ancho; números alineados a la derecha con cifras tabulares; menú con íconos y nombres |

## 6. Verificación

- Unitarias nuevas (11): escala, formatos, variación, geometría de barras, sparkline, navegación de meses y serie mensual. Cuatro mutaciones del módulo fueron detectadas por las pruebas.
- Integración nueva (1): Inicio dibuja 6 meses, resalta el mes, muestra el tooltip al enfocar con teclado, la tabla coincide con los datos y un segundo render con los mismos datos no redibuja.
- La prueba estática del HTML5 se mantiene en 10/10.

## 7. Fuentes

1. Few, S. *Information Dashboard Design: Displaying Data for At-a-Glance Monitoring*, 2.ª ed. Analytics Press, 2013.
2. Tufte, E. R. *The Visual Display of Quantitative Information*, 2.ª ed. Graphics Press, 2001.
3. Cleveland, W. S. y McGill, R. «Graphical Perception: Theory, Experimentation, and Application to the Development of Graphical Methods». *Journal of the American Statistical Association* 79(387), 1984, pp. 531–554.
4. IBCS Association. *International Business Communication Standards (IBCS)*, versión 1.2 (ibcs.com): comparación real vs. período anterior y notación uniforme.
5. Heckbert, P. S. «Nice Numbers for Graph Labels». En *Graphics Gems*, Academic Press, 1990, pp. 61–63.
6. SAP. *SAP Fiori Design Guidelines*: tarjetas analíticas y gráficos (experience.sap.com/fiori-design-web).
7. Microsoft. *Dynamics 365 Business Central*: Role Centers (learn.microsoft.com).
8. IBM. *Carbon Design System*: Data visualization (carbondesignsystem.com/data-visualization).
9. W3C. *WCAG 2.2*: CS 1.3.1, 1.4.1 (uso del color), 1.4.11 (contraste no textual) y 2.1.1 (teclado).

## 8. Límites

- No hay modo oscuro: la aplicación no lo tenía y agregarlo sería un cambio aparte.
- Los gráficos usan los datos del navegador (IndexedDB). No reemplazan los reportes contables formales.
- La tendencia compara bases gravadas. El resultado y la liquidez se muestran en los indicadores y sus sparklines.

## 9. Reportes financieros (rediseño de noviembre de 2026)

### Qué fallaba
- **Títulos repetidos:** «Reportes estándar», «Vista del reporte» y otra vez el nombre del reporte.
- **Selección poco profesional:** tarjetas con íconos de texto para elegir el reporte y nombres de cuenta en verde subrayado.
- **Estado de resultados sin estructura:** solo dos listas (ingresos y gastos), sin utilidad bruta ni utilidad de operación.
- **Balance incompleto:** la depreciación acumulada no se veía como resta del activo fijo.
- **Faltaban funciones básicas:** no había períodos predefinidos, comparación con otro período, exportación ni impresión.

### Cómo queda (patrones comunes de NetSuite, SAP Business One, Dynamics 365 Business Central, Odoo y QuickBooks Online)

| Elemento | Decisión |
|---|---|
| Navegación | Pestañas: Balanza de comprobación · Estado de resultados · Balance general |
| Filtros (una fila) | Período predefinido (este mes, mes anterior, trimestre, año a la fecha, año anterior, todas las fechas, personalizado), Desde/Hasta («Al» en el balance) y Comparar con (período anterior o mismo período del año anterior) |
| Documento | Encabezado centrado (título, período en letras, «Cifras en USD»); jerarquía sección → grupo del catálogo → cuenta, con su código |
| Subtotales | Una raya sobre los subtotales y totales; doble subrayado en el total final; renglones de resultado (utilidad bruta, de operación) sombreados |
| Negativos | Entre paréntesis, según la convención contable: ($554.84) |
| Comparación | Columnas Actual · Comparativo · Variación · Var. %; el margen bruto varía en puntos porcentuales (pp) |
| Control | Insignia con ícono y texto: «✓ Cuadrado: Activo = Pasivo + Patrimonio» o «✕ Descuadre de $X» |
| Detalle | Al hacer clic o presionar Enter sobre una cuenta se abren sus movimientos del Libro Diario con saldo acumulado; las compras y ventas se pueden eliminar desde ahí |
| Acciones | Exportar CSV (separador `;`, con BOM para Excel) e Imprimir / PDF (la hoja de impresión oculta menú, filtros y tarjetas) |

**Estructura de cada estado:**
- **Estado de resultados por función:**
  1. Ingresos de operación.
  2. Costo de ventas (cuentas 5).
  3. **Utilidad bruta** y margen bruto.
  4. Gastos de operación (cuentas 6).
  5. **Utilidad de operación.**
  6. **Utilidad neta del período.**
- **Balance general** en orden de liquidez:
  - Activo corriente, activo fijo y depreciación acumulada (que resta).
  - Pasivo.
  - Patrimonio, incluido el resultado del ejercicio.
  - Total pasivo y patrimonio.
- **Balanza:** cuentas agrupadas por clasificación, con «Sumas iguales» al final.

**Regla de no repetir:** si una sección tiene un solo grupo del catálogo, el grupo y su subtotal no se muestran. Así se evita la secuencia «Pasivo corriente / Total pasivo corriente / Total pasivo».

### Arquitectura
- `js/reportes/reportes_estructura.js` (nuevo, puro) arma los renglones de cada estado, los períodos predefinidos y comparativos, las variaciones, el formato contable y el CSV. Las cifras salen sin cambios de `motor_contable.js` y se verifican antes de mostrarse (`verificarReporteAntesDeRender`, también para el período comparativo).
- `js/reportes/reportes.js` queda como interfaz y orquestación: filtros, documento, detalle por cuenta, exportar e imprimir. Sigue siendo el consumidor `reportes` del router EDA.

**Funciones:**
- **Reemplazadas por el renderizador genérico:** `crearFilaBalanza`, `crearFilaEstado` y `crearSeccionEstado`. Ahora están `crearFilaReporte` y `renderizarDocumentoReporte`.
- **Retirada:** `prepararVistaBalanza`, porque hay una sola vista de documento.
- **Conservadas:** las demás, con su nombre.

### Fuentes
10. IASB. *Norma NIIF para las PYMES*, secciones 3 (Presentación de estados financieros), 4 (Estado de situación financiera) y 5 (Estado del resultado integral).
11. AICPA/FASB. ASC 220 y ASC 210: presentación del estado de resultados y del balance (clasificación por función, orden de liquidez, partidas corrientes y no corrientes).

### Verificación
- **Pruebas unitarias nuevas (6):**
  - Períodos y comparativos, incluidos el cambio de año y el 29 de febrero.
  - Formato contable.
  - Estado de resultados (utilidad bruta, margen, control y comparación).
  - Balance (depreciación negativa, pérdida en patrimonio, detección de descuadre).
  - Balanza.
  - CSV.
  - Cuatro errores metidos a propósito fueron detectados.
- **Prueba de integración nueva (1):** en una página real:
  - balanza cuadrada;
  - estado de resultados de septiembre comparado con agosto (utilidad bruta $20.00, margen 50.0 %);
  - CSV exportado;
  - libro de la cuenta 4101 con saldo $40.00;
  - balance con total $138.20 y control cuadrado.
- **Pruebas anteriores:** las 51 de integración siguen aprobando, incluida la conciliación que lee `#resumen-valor-1`.

