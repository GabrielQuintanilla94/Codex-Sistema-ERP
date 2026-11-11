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
