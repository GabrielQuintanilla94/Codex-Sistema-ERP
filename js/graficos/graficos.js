// Inicio fase 0: referencias del módulo de visualización (docs/diseno/VISUALIZACION_BI.md)
const GRAFICO_SVG = "http://www.w3.org/2000/svg";
const GRAFICO_ALTO = 240, GRAFICO_BARRA_MAX = 24, GRAFICO_HUECO = 2;
const graficoMemoria = new WeakMap();
// Fin fase 0
// Inicio fase 1: cálculos puros (escala, formato, variación y geometría)
function graficoRedondear(n) { return Math.round(n * 100) / 100; }
function graficoNumeroAgradable(x, redondear) {
    const e = Math.floor(Math.log10(x)), f = x / 10 ** e;
    const n = redondear ? (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) : (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10);
    return n * 10 ** e;
}
function graficoEscala(maximo, minimo = 0, objetivo = 4) {
    let max = Math.max(0, Number(maximo) || 0), min = Math.min(0, Number(minimo) || 0);
    if (max === min) max = min + 100;
    const paso = graficoNumeroAgradable(graficoNumeroAgradable(max - min, false) / objetivo, true);
    const desde = Math.floor(min / paso) * paso, hasta = Math.ceil(max / paso) * paso, n = Math.round((hasta - desde) / paso);
    return { min: desde, max: hasta, paso: paso, ticks: Array.from({ length: n + 1 }, (_, i) => Number((desde + i * paso).toFixed(10))) };
}
function graficoFormatoMoneda(valor) {
    return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(valor || 0));
}
function graficoFormatoCompacto(valor) {
    const v = Number(valor) || 0, a = Math.abs(v), s = v < 0 ? "−" : "";
    const corto = (x, sufijo) => s + "$" + String(Math.round(x * 10) / 10) + sufijo;
    return a >= 1e6 ? corto(a / 1e6, "M") : a >= 1e3 ? corto(a / 1e3, "K") : s + "$" + Math.round(a);
}
function graficoFormatoEje(valor, maximoEje) {
    return Math.abs(maximoEje) >= 10000 ? graficoFormatoCompacto(valor) : (valor < 0 ? "−$" : "$") + new Intl.NumberFormat("es-SV", { maximumFractionDigits: 0 }).format(Math.abs(valor));
}
function graficoVariacion(actual, anterior, opciones = {}) {
    const sentido = opciones.sentido ?? 1, referencia = opciones.referencia || "mes anterior";
    const a = Number(actual) || 0, b = Number(anterior) || 0, diferencia = graficoRedondear(a - b);
    if (diferencia === 0) return { direccion: "igual", simbolo: "", texto: "Sin cambio vs. " + referencia, tono: "neutral", diferencia: 0, porcentaje: 0 };
    const sube = diferencia > 0, comparable = b > 0 && a >= 0, porcentaje = comparable ? graficoRedondear(diferencia / b * 100) : null;
    const magnitud = comparable ? Math.abs(porcentaje).toFixed(1) + " %" : graficoFormatoCompacto(Math.abs(diferencia));
    const tono = sentido === 0 ? "neutral" : sube === sentido > 0 ? "bueno" : "malo";
    return { direccion: sube ? "sube" : "baja", simbolo: sube ? "▲" : "▼", texto: (sube ? "▲ " : "▼ ") + magnitud + " vs. " + referencia, tono: tono, diferencia: diferencia, porcentaje: porcentaje };
}
function graficoGeometriaColumnas(ancho, alto, margen, categorias, series, escala) {
    const plot = { x: margen.izq, y: margen.sup, ancho: Math.max(1, ancho - margen.izq - margen.der), alto: Math.max(1, alto - margen.sup - margen.inf) };
    const y = v => plot.y + plot.alto - (v - escala.min) / (escala.max - escala.min) * plot.alto, base = y(0);
    const banda = plot.ancho / Math.max(1, categorias.length), n = Math.max(1, series.length);
    const anchoBarra = Math.max(2, Math.min(GRAFICO_BARRA_MAX, (banda * 0.7 - GRAFICO_HUECO * (n - 1)) / n)), grupo = anchoBarra * n + GRAFICO_HUECO * (n - 1);
    return { plot: plot, base: graficoRedondear(base), y: y, bandas: categorias.map(function(categoria, i) {
        const x0 = plot.x + i * banda;
        return { categoria: categoria, x: graficoRedondear(x0), ancho: graficoRedondear(banda), centro: graficoRedondear(x0 + banda / 2), barras: series.map(function(serie, j) {
            const valor = Number(serie.valores[i]) || 0, yv = y(valor);
            return { serie: j, valor: valor, x: graficoRedondear(x0 + (banda - grupo) / 2 + j * (anchoBarra + GRAFICO_HUECO)), ancho: graficoRedondear(anchoBarra), y: graficoRedondear(Math.min(yv, base)), alto: graficoRedondear(Math.abs(base - yv)), negativo: valor < 0 };
        }) };
    }) };
}
function graficoRutaBarra(b) {
    const r = Math.min(4, b.ancho / 2, b.alto), x = b.x, y = b.y, w = b.ancho, h = b.alto;
    if (h <= 0) return "";
    return b.negativo ? `M${x},${y}V${y + h - r}A${r},${r} 0 0 0 ${x + r},${y + h}H${x + w - r}A${r},${r} 0 0 0 ${x + w},${y + h - r}V${y}Z`
        : `M${x},${y + h}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h}Z`;
}
function graficoPuntosSparkline(valores, ancho, alto, relleno = 5) {
    const lista = (valores || []).map(v => Number(v) || 0), min = Math.min(...lista), max = Math.max(...lista), rango = max - min;
    const paso = lista.length > 1 ? (ancho - relleno * 2) / (lista.length - 1) : 0;
    return lista.map((v, i) => ({ x: graficoRedondear(relleno + i * paso), y: graficoRedondear(rango ? relleno + (max - v) / rango * (alto - relleno * 2) : alto / 2), valor: v }));
}
// Fin fase 1
// Inicio fase 2: renderizado atómico (solo se redibuja si cambian los datos o el ancho)
function graficoNodo(etiqueta, atributos, padre, svg = true) {
    const nodo = svg ? document.createElementNS(GRAFICO_SVG, etiqueta) : document.createElement(etiqueta);
    for (const [k, v] of Object.entries(atributos || {})) if (v !== undefined && v !== null) k === "texto" ? nodo.textContent = v : nodo.setAttribute(k, v);
    if (padre) padre.appendChild(nodo);
    return nodo;
}
function graficoRender(contenedor, datos, dibujar) {
    if (!contenedor) return false;
    const memo = graficoMemoria.get(contenedor) || {}, clave = JSON.stringify(datos), ancho = Math.round(contenedor.clientWidth) || 640;
    if (memo.clave === clave && memo.ancho === ancho) return false;
    Object.assign(memo, { clave: clave, ancho: ancho, dibujar: dibujar });
    contenedor.replaceChildren(...dibujar(ancho));
    if (!memo.observador && typeof ResizeObserver !== "undefined") {
        memo.observador = new ResizeObserver(function() {
            const w = Math.round(contenedor.clientWidth);
            if (w && Math.abs(w - memo.ancho) > 4) { memo.ancho = w; contenedor.replaceChildren(...memo.dibujar(w)); }
        });
        memo.observador.observe(contenedor);
    }
    graficoMemoria.set(contenedor, memo);
    return true;
}
function graficoLeyenda(series, forma = "barra") {
    const leyenda = graficoNodo("div", { class: "grafico-leyenda" }, null, false);
    series.forEach(function(s, j) {
        const item = graficoNodo("span", {}, leyenda, false);
        graficoNodo("i", { class: `grafico-clave ${forma} serie-${j + 1}`, "aria-hidden": "true" }, item, false);
        item.appendChild(document.createTextNode(s.nombre));
    });
    return leyenda;
}
function graficoTabla(categorias, series, formato) {
    const detalles = graficoNodo("details", { class: "grafico-tabla" }, null, false);
    graficoNodo("summary", { texto: "Ver datos en tabla" }, detalles, false);
    const contenedor = graficoNodo("div", { class: "tabla-reporte-contenedor" }, detalles, false);
    const tabla = graficoNodo("table", { class: "tabla-reporte compact-table" }, contenedor, false);
    const fila = graficoNodo("tr", {}, graficoNodo("thead", {}, tabla, false), false);
    graficoNodo("th", { scope: "col", texto: "Período" }, fila, false);
    series.forEach(s => graficoNodo("th", { scope: "col", class: "numero", texto: s.nombre }, fila, false));
    const cuerpo = graficoNodo("tbody", {}, tabla, false);
    categorias.forEach(function(c, i) {
        const tr = graficoNodo("tr", {}, cuerpo, false);
        graficoNodo("th", { scope: "row", texto: c }, tr, false);
        series.forEach(s => graficoNodo("td", { class: "numero", texto: formato(s.valores[i]) }, tr, false));
    });
    return detalles;
}
// Fin fase 2
// Inicio fase 3: componentes (columnas con tooltip, sparkline y ranking)
function graficoColumnas(contenedor, cfg) {
    return graficoRender(contenedor, cfg, function(ancho) {
        const formato = graficoFormatoMoneda, maximo = Math.max(0, ...cfg.series.flatMap(s => s.valores.map(Number)));
        const escala = graficoEscala(maximo, Math.min(0, ...cfg.series.flatMap(s => s.valores.map(Number))));
        const etiquetas = escala.ticks.map(t => graficoFormatoEje(t, escala.max));
        const margen = { izq: Math.max(...etiquetas.map(e => e.length)) * 6.5 + 14, der: 8, sup: 10, inf: 28 };
        const g = graficoGeometriaColumnas(ancho, cfg.alto || GRAFICO_ALTO, margen, cfg.categorias, cfg.series, escala);
        const lienzo = graficoNodo("div", { class: "grafico-lienzo" }, null, false);
        const svg = graficoNodo("svg", { class: "grafico-svg", width: ancho, height: cfg.alto || GRAFICO_ALTO, viewBox: `0 0 ${ancho} ${cfg.alto || GRAFICO_ALTO}`, role: "group", "aria-label": cfg.descripcion }, lienzo);
        escala.ticks.forEach(function(t, i) {
            const y = graficoRedondear(g.y(t));
            graficoNodo("line", { class: t === 0 ? "grafico-base" : "grafico-guia", x1: g.plot.x, x2: g.plot.x + g.plot.ancho, y1: y, y2: y }, svg);
            graficoNodo("text", { class: "grafico-eje", x: g.plot.x - 8, y: y + 4, "text-anchor": "end", texto: etiquetas[i] }, svg);
        });
        const tooltip = graficoNodo("div", { class: "grafico-tooltip", role: "status", hidden: "" }, lienzo, false);
        g.bandas.forEach(function(banda, i) {
            const grupo = graficoNodo("g", { class: "grafico-banda" + (cfg.activo === i ? " activa" : cfg.activo != null ? " atenuada" : "") }, svg);
            banda.barras.forEach(b => b.alto > 0 && graficoNodo("path", { class: `grafico-marca serie-${b.serie + 1}`, d: graficoRutaBarra(b) }, grupo));
            graficoNodo("text", { class: "grafico-eje grafico-categoria", x: banda.centro, y: g.plot.y + g.plot.alto + 18, "text-anchor": "middle", texto: banda.categoria }, grupo);
            const resumen = banda.categoria + ": " + cfg.series.map(s => s.nombre + " " + formato(s.valores[i])).join(", ");
            const zona = graficoNodo("rect", { class: "grafico-zona", x: banda.x, y: g.plot.y, width: banda.ancho, height: g.plot.alto, tabindex: 0, role: "img", "aria-label": resumen }, grupo);
            const mostrar = function() {
                grupo.classList.add("resaltada");
                tooltip.replaceChildren(graficoNodo("strong", { texto: cfg.etiquetasLargas ? cfg.etiquetasLargas[i] : banda.categoria }, null, false));
                cfg.series.forEach(function(s, j) {
                    const fila = graficoNodo("span", { class: "grafico-tooltip-fila" }, tooltip, false);
                    graficoNodo("i", { class: `grafico-clave linea serie-${j + 1}`, "aria-hidden": "true" }, fila, false);
                    graficoNodo("b", { texto: formato(s.valores[i]) }, fila, false);
                    graficoNodo("small", { texto: s.nombre }, fila, false);
                });
                tooltip.hidden = false;
                tooltip.style.left = Math.min(Math.max(banda.centro, 90), ancho - 90) + "px";
            };
            const ocultar = function() { grupo.classList.remove("resaltada"); tooltip.hidden = true; };
            zona.addEventListener("pointerenter", mostrar); zona.addEventListener("focus", mostrar);
            zona.addEventListener("pointerleave", ocultar); zona.addEventListener("blur", ocultar);
        });
        return [graficoLeyenda(cfg.series), lienzo, graficoTabla(cfg.etiquetasLargas || cfg.categorias, cfg.series, formato)];
    });
}
function graficoSparkline(contenedor, valores, descripcion) {
    return graficoRender(contenedor, { valores: valores, descripcion: descripcion }, function(ancho) {
        const alto = 34, puntos = graficoPuntosSparkline(valores, ancho, alto), ultimo = puntos[puntos.length - 1];
        const svg = graficoNodo("svg", { class: "sparkline", width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}`, role: "img", "aria-label": descripcion + ": " + valores.map(graficoFormatoCompacto).join(", ") });
        if (!puntos.length) return [svg];
        graficoNodo("polyline", { class: "sparkline-linea", points: puntos.map(p => p.x + "," + p.y).join(" ") }, svg);
        graficoNodo("circle", { class: "sparkline-punto", cx: ultimo.x, cy: ultimo.y, r: 4 }, svg);
        return [svg];
    });
}
function graficoRanking(contenedor, items, opciones = {}) {
    const lista = (items || []).map(x => ({ nombre: String(x.nombre ?? ""), valor: Number(x.valor) || 0 })).filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor);
    const visibles = lista.slice(0, opciones.maximo || 5), total = lista.reduce((t, x) => t + x.valor, 0);
    return graficoRender(contenedor, { visibles: visibles, total: total, vacio: opciones.vacio }, function() {
        if (!visibles.length) return [graficoNodo("p", { class: "grafico-vacio", texto: opciones.vacio || "Sin datos en el período." }, null, false)];
        const ol = graficoNodo("ol", { class: "grafico-ranking" }, null, false), maximo = visibles[0].valor;
        visibles.forEach(function(x) {
            const li = graficoNodo("li", {}, ol, false), texto = graficoNodo("div", { class: "grafico-ranking-texto" }, li, false);
            graficoNodo("span", { texto: x.nombre }, texto, false);
            graficoNodo("strong", { texto: graficoFormatoMoneda(x.valor) }, texto, false);
            graficoNodo("small", { texto: (x.valor / total * 100).toFixed(1) + " %" }, texto, false);
            graficoNodo("i", { style: "width:" + (x.valor / maximo * 100).toFixed(2) + "%" }, graficoNodo("div", { class: "grafico-ranking-pista", "aria-hidden": "true" }, li, false), false);
        });
        return [ol];
    });
}
// Fin fase 3
