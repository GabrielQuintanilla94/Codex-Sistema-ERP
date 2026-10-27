# reportes.js — P3 v3

## Qué es este archivo
Controlador de reportería que carga datos, valida períodos, solicita cálculos/proyecciones y transforma los resultados contables en vistas HTML seguras.


## Propósito técnico
Controlador de reportería: carga datos, valida período, invoca motor contable o proyección materializada y renderiza balanza, estado de resultados y balance general.

## Dependencias reales
- motor_contable.js
- proyeccion_contable.js
- base_datos.js
- DOM de reportes.html

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases y funciones reales de este archivo. No se asume DAG, Circuit Breaker, checksum, Epoll, GPU/SIMD o criptografía si el código no los implementa o no los necesita.

### FASE 00 — Estado de reportes y utilidades de salida
**Funciones reales de la fase:** `formatearDineroReporte()`, `escaparTextoReporte()`.

- **A. Objetivo (DDD):** Mantener estado de datos y tipo de reporte separado del cálculo contable.
- **B. Entrada (Zero-Trust):** Importes/textos que serán renderizados y referencias DOM.
- **C. Validación (Harness IAST):** Escapa texto antes de HTML y formatea números de forma controlada.
- **D. Procesamiento:** Mantiene `cuentasReporte`, `movimientosReporte`, `tipoReporteActual` y helpers de formato.
- **E. Decisión:** Tipo actual selecciona qué generador/vista usar en fases posteriores.
- **F. Recuperación:** Errores de formato no deben alterar los datos fuente.
- **G. Verificación:** Datos de cálculo permanecen en arrays separados de HTML renderizado.
- **H. Telemetría:** No tiene objeto de telemetría; mensajes/estado de UI evidencian resultado.

### FASE 01 — Carga de datos y validación de período
**Funciones reales de la fase:** `cargarJSONReporte()`, `asegurarDatosReportes()`, `crearFilaBalanza()`, `crearFilaEstado()`, `crearSeccionEstado()`, `actualizarResumenReporte()`, `actualizarPeriodoReporte()`, `validarPeriodoReporte()`.

- **A. Objetivo (DDD):** Garantizar que los reportes tengan catálogo/movimientos disponibles y rango de fechas coherente.
- **B. Entrada (Zero-Trust):** IndexedDB, JSON fallback y valores de fecha de la UI.
- **C. Validación (Harness IAST):** `asegurarDatosReportes` valida arrays; `validarPeriodoReporte` rechaza desde>hasta.
- **D. Procesamiento:** Carga/cachea datos, prepara filas/secciones y actualiza etiquetas de período/resumen.
- **E. Decisión:** Si ya hay arrays cargados evita recarga; período inválido impide generar.
- **F. Recuperación:** Fallback JSON se usa como bootstrap cuando corresponde; errores suben a inicialización/generación.
- **G. Verificación:** Antes de calcular, cuentas y movimientos deben estar disponibles como arrays.
- **H. Telemetría:** Mensajes del reporte reflejan carga/errores; no hay contador dedicado.

### FASE 02 — Preparación y renderizado de vistas
**Funciones reales de la fase:** `prepararVistaBalanza()`, `prepararVistaEstado()`, `mostrarMensajeReporte()`, `mostrarBalanza()`, `mostrarEstadoResultados()`, `mostrarBalanceGeneral()`.

- **A. Objetivo (DDD):** Convertir objetos de reporte ya calculados en HTML seguro y resúmenes visuales.
- **B. Entrada (Zero-Trust):** Objetos `balanza`, `estadoResultados` o `balanceGeneral` producidos por motor/proyección.
- **C. Validación (Harness IAST):** Texto de cuentas pasa por escape; se selecciona estructura esperada por tipo.
- **D. Procesamiento:** Muestra/oculta contenedores, genera filas/secciones y actualiza tarjetas resumen.
- **E. Decisión:** Cada función renderiza un tipo específico; no recalcula contabilidad.
- **F. Recuperación:** `mostrarMensajeReporte` y catch superiores presentan fallos sin alterar datos fuente.
- **G. Verificación:** UI final corresponde al objeto recibido; cálculo sigue siendo responsabilidad de motor_contable.
- **H. Telemetría:** El mensaje visible funciona como señal de estado de generación.

### FASE 03 — Configuración de interacción
**Funciones reales de la fase:** `configurarInterfazReporte()`.

- **A. Objetivo (DDD):** Vincular filtros y selector de reportes al controlador sin mezclar cálculo.
- **B. Entrada (Zero-Trust):** Eventos de botones/fechas del DOM.
- **C. Validación (Harness IAST):** Los valores de tipo se restringen a controles conocidos de la página.
- **D. Procesamiento:** Configura listeners y estado visual activo.
- **E. Decisión:** Interacción cambia `tipoReporteActual` y dispara regeneración cuando corresponde.
- **F. Recuperación:** Errores de generación se manejan en FASE 04/05; listeners no mutan persistencia.
- **G. Verificación:** Un único tipo queda seleccionado como reporte actual.
- **H. Telemetría:** No contador; estado activo de botones y mensajes reflejan selección.

### FASE 04 — Generación/selección de reporte
**Funciones reales de la fase:** `generarReporteConDatos()`, `mostrarReporteCalculado()`, `mostrarReporteDesdeProyeccion()`, `generarReporteActualizado()`, `seleccionarReporte()`.

- **A. Objetivo (DDD):** Elegir entre cálculo por período y proyección materializada sin duplicar fórmulas contables.
- **B. Entrada (Zero-Trust):** Tipo actual, rango de fechas y datos cargados/proyección.
- **C. Validación (Harness IAST):** Valida período antes de invocar generadores; motor contable valida integridad interna.
- **D. Procesamiento:** Llama `generarBalanzaComprobacion`, `generarEstadoResultados` o `generarBalanceGeneral`; si no hay filtros puede mostrar proyección.
- **E. Decisión:** Tipo+período determinan fuente y función de renderizado.
- **F. Recuperación:** Catch en `generarReporteActualizado` muestra mensaje y no conserva HTML engañoso.
- **G. Verificación:** No implementa fórmulas propias; todos los totales provienen de motor/proyección.
- **H. Telemetría:** Mensaje de éxito/error y resumen visual son salida observable.

### FASE 05 — Inicialización y actualización reactiva
**Funciones reales de la fase:** `iniciarReportes()`.

- **A. Objetivo (DDD):** Dejar reportería lista al cargar y mantenerla sincronizada con nuevas proyecciones.
- **B. Entrada (Zero-Trust):** Datos persistidos y eventos DOM `proyeccion:actualizada`.
- **C. Validación (Harness IAST):** Inicialización solo renderiza tras `asegurarDatosReportes`; evento usa proyección recibida cuando no hay filtros.
- **D. Procesamiento:** Abre BD, carga datos, configura UI, reconstruye proyección y muestra reporte inicial.
- **E. Decisión:** Sin filtros => usa evento/proyección; con filtros => recalcula con rango.
- **F. Recuperación:** Catch limpia cuerpos de reporte y muestra `No se pudo generar...`.
- **G. Verificación:** Al terminar, existe una vista coherente con tipo actual y período seleccionado.
- **H. Telemetría:** No contador formal; errores y mensajes de reporte documentan estado de inicialización.

### FASE 02B — Despliegue del Libro Diario por cuenta
**Funciones reales de la fase:** `movimientoEnPeriodoReporte()`, `obtenerLineasCuentaReporte()`, `cerrarDetalleCuentaReporte()`, `crearDetalleCuentaReporte()`, `alternarDetalleCuentaReporte()`, `activarDetalleCuentaReporte()`.

- **A. Objetivo (SRP):** permitir que una cuenta visible en Balanza, Balance General o Estado de Resultados despliegue exclusivamente sus líneas del Libro Diario sin recalcular el reporte.
- **B. Entrada (Zero-Trust):** `codigo` de la fila seleccionada, `movimientosReporte` y el período actualmente visible.
- **C. Validación:** una línea solo pertenece al detalle si `String(linea.codigo) === String(codigo)` y la fecha del movimiento cumple el mismo rango del reporte.
- **D. Procesamiento:** recorre partidas y extrae únicamente las líneas de la cuenta seleccionada; el resto de cuentas de cada partida no se renderiza.
- **E. Decisión:** una fila de cuenta abierta se cierra al volver a seleccionarla; al abrir otra cuenta se elimina primero el detalle anterior.
- **F. Recuperación:** si la cuenta no tiene movimientos en el período, se muestra un estado vacío sin alterar el reporte ni IndexedDB.
- **G. Verificación:** el detalle presenta fecha, partida, concepto, descripción, Debe y Haber, y sus totales se obtienen solo de las líneas filtradas.
- **H. Telemetría:** no agrega persistencia ni contadores; `aria-expanded` y la fila `seleccionada` reflejan el estado de UI.

**Fragmento crítico real:**

```js
(movimiento.partida || []).forEach(function(linea) {
    if (String(linea.codigo || "") !== String(codigo || "")) return;
    lineas.push({
        fecha: movimiento.fecha || "",
        numero: movimiento.numero || movimiento.referencia || ("JE-" + String(movimiento.id || "")),
        concepto: movimiento.concepto || "Partida contable",
        descripcion: linea.descripcion || "",
        debe: Number(linea.debe || 0),
        haber: Number(linea.haber || 0)
    });
});
```

**Invariante:** `Detalle(c) = { l ∈ partida(m) | codigo(l)=c ∧ fecha(m)∈PeriodoReporte }`. Ninguna línea perteneciente a otra cuenta puede aparecer en el detalle expandido.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `PeriodoValido ⇔ fechaDesde="" ∨ fechaHasta="" ∨ fechaDesde≤fechaHasta`.
- `tipoReporteActual="balance" ⇒ generarBalanceGeneral(...)`.
- `tipoReporteActual="resultados" ⇒ generarEstadoResultados(...)`.
- `otro ⇒ generarBalanzaComprobacion(...)`.
- `Vista = escaparTextoReporte(datos) + formatearDineroReporte(importes)`; el render no recalcula reglas contables.

### Declaraciones y estado de módulo reflejados desde el código

```js
const cuerpoBalanza = document.getElementById("cuerpo-balanza");
const fechaDesdeReporte = document.getElementById("fecha-desde");
const fechaHastaReporte = document.getElementById("fecha-hasta");
const mensajeReporte = document.getElementById("mensaje-reporte");
const sinDatosReporte = document.getElementById("sin-datos-reporte");
const vistaBalanza = document.getElementById("vista-balanza");
const vistaEstadoFinanciero = document.getElementById("vista-estado-financiero");
const botonesReportes = document.querySelectorAll("[data-reporte]");
let cuentasReporte = [];
let movimientosReporte = [];
let tipoReporteActual = "balanza";
document.addEventListener("proyeccion:actualizada", function(evento) {
    if (!fechaDesdeReporte.value && !fechaHastaReporte.value) {
        mostrarReporteDesdeProyeccion(evento.detail);
    } else {
        generarReporteActualizado();
    }
});
botonesReportes.forEach(function(boton) {
    boton.addEventListener("click", seleccionarReporte);
});
document.getElementById("generar-reporte").addEventListener("click", generarReporteActualizado);
iniciarReportes();
```

### FASE 00 — Estado de reportes y utilidades de salida — espejo técnico

**Firmas reales:** `function formatearDineroReporte(valor)`, `function escaparTextoReporte(texto)`.

**Formalización de la fase:** `Reporte = selector(tipoReporteActual, cuentasReporte, movimientosReporte, periodo)`; la vista es una transformación de presentación del objeto calculado.

**Estructuras/tecnicismos reales:** DOM.

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Postcondiciones/retornos observables extraídos:**

```js
return new Intl.NumberFormat("es-SV", {
return elemento.innerHTML;
```

**Código exacto correspondiente a la fase:**

```js
function formatearDineroReporte(valor) {
    return new Intl.NumberFormat("es-SV", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2
    }).format(Number(valor || 0));
}

function escaparTextoReporte(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = String(texto || "");
    return elemento.innerHTML;
}

```

### FASE 01 — Carga de datos y validación de período — espejo técnico

**Firmas reales:** `async function cargarJSONReporte(ruta)`, `async function asegurarDatosReportes()`, `function crearFilaBalanza(cuenta)`, `function crearFilaEstado(cuenta)`, `function crearSeccionEstado(titulo, cuentas, etiquetaTotal, total, filaAdicional)`, `function actualizarResumenReporte(etiqueta1, valor1, detalle1, etiqueta2, valor2, detalle2, etiqueta3, valor3, detalle3)`, `function actualizarPeriodoReporte()`, `function validarPeriodoReporte()`.

**Formalización de la fase:** `Reporte = selector(tipoReporteActual, cuentasReporte, movimientosReporte, periodo)`; la vista es una transformación de presentación del objeto calculado.

**Estructuras/tecnicismos reales:** DOM.

**Complejidad dominante:** `O(n)` respecto al tamaño de la colección recorrida.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!respuesta.ok) throw new Error("No se pudo cargar " + ruta + ".");
if (cuentasReporte.length === 0) {
if (movimientosReporte.length === 0) {
if (tipoReporteActual === "balance") {
if (tipoReporteActual !== "balance" && fechaDesdeReporte.value &&
```

**Postcondiciones/retornos observables extraídos:**

```js
return respuesta.json();
return `<tr>
return `<article class="seccion-estado">
```

**Código exacto correspondiente a la fase:**

```js
async function cargarJSONReporte(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error("No se pudo cargar " + ruta + ".");
    return respuesta.json();
}

async function asegurarDatosReportes() {
    cuentasReporte = await obtenerCuentasBD();
    if (cuentasReporte.length === 0) {
        const cuentasIniciales = await cargarJSONReporte("datos/catalogo_cuentas.json");
        await guardarCuentasBD(cuentasIniciales);
        cuentasReporte = await obtenerCuentasBD();
    }
    movimientosReporte = await obtenerMovimientosBD();
    if (movimientosReporte.length === 0) {
        const movimientosIniciales = await cargarJSONReporte("datos/movimientos_iniciales.json");
        await guardarMovimientosBD(movimientosIniciales);
        movimientosReporte = await obtenerMovimientosBD();
    }
}

function crearFilaBalanza(cuenta) {
    return `<tr>
        <td>${escaparTextoReporte(cuenta.codigo)}</td>
        <td>${escaparTextoReporte(cuenta.nombre)}</td>
        <td>${escaparTextoReporte(cuenta.clasificacion)}</td>
        <td>${escaparTextoReporte(cuenta.naturaleza)}</td>
        <td>${formatearDineroReporte(cuenta.debe)}</td>
        <td>${formatearDineroReporte(cuenta.haber)}</td>
        <td>${formatearDineroReporte(cuenta.saldoDeudor)}</td>
        <td>${formatearDineroReporte(cuenta.saldoAcreedor)}</td>
    </tr>`;
}

function crearFilaEstado(cuenta) {
    return `<tr>
        <td>${escaparTextoReporte(cuenta.codigo)}</td>
        <td>${escaparTextoReporte(cuenta.nombre)}</td>
        <td>${formatearDineroReporte(cuenta.saldoNatural)}</td>
    </tr>`;
}

function crearSeccionEstado(titulo, cuentas, etiquetaTotal, total, filaAdicional) {
    const filas = cuentas.map(crearFilaEstado).join("");
    const vacio = filas || filaAdicional
        ? ""
        : '<tr><td colspan="3" class="estado-sin-cuentas">Sin cuentas con saldo</td></tr>';
    return `<article class="seccion-estado">
        <h3>${escaparTextoReporte(titulo)}</h3>
        <table class="tabla-estado">
            <thead><tr><th>Código</th><th>Cuenta</th><th>Saldo</th></tr></thead>
            <tbody>${filas}${vacio}${filaAdicional || ""}</tbody>
            <tfoot><tr><td colspan="2">${escaparTextoReporte(etiquetaTotal)}</td><td>${formatearDineroReporte(total)}</td></tr></tfoot>
        </table>
    </article>`;
}

function actualizarResumenReporte(etiqueta1, valor1, detalle1, etiqueta2, valor2, detalle2, etiqueta3, valor3, detalle3) {
    document.getElementById("resumen-etiqueta-1").textContent = etiqueta1;
    document.getElementById("resumen-valor-1").textContent = valor1;
    document.getElementById("resumen-detalle-1").textContent = detalle1;
    document.getElementById("resumen-etiqueta-2").textContent = etiqueta2;
    document.getElementById("resumen-valor-2").textContent = valor2;
    document.getElementById("resumen-detalle-2").textContent = detalle2;
    document.getElementById("resumen-etiqueta-3").textContent = etiqueta3;
    document.getElementById("resumen-valor-3").textContent = valor3;
    document.getElementById("resumen-detalle-3").textContent = detalle3;
}

function actualizarPeriodoReporte() {
    const desde = fechaDesdeReporte.value;
    const hasta = fechaHastaReporte.value;
    let texto = "Período completo";
    if (tipoReporteActual === "balance") {
        texto = hasta ? "Al " + hasta : "A la fecha";
    } else if (desde && hasta) {
        texto = "Del " + desde + " al " + hasta;
    } else if (desde) {
        texto = "Desde " + desde;
    } else if (hasta) {
        texto = "Hasta " + hasta;
    }
    document.getElementById("periodo-reporte").textContent = texto;
}

function validarPeriodoReporte() {
    if (tipoReporteActual !== "balance" && fechaDesdeReporte.value &&
        fechaHastaReporte.value && fechaDesdeReporte.value > fechaHastaReporte.value) {
        throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
    }
}

```

### FASE 02 — Preparación y renderizado de vistas — espejo técnico

**Firmas reales:** `function prepararVistaBalanza()`, `function prepararVistaEstado()`, `function mostrarMensajeReporte(texto)`, `function mostrarBalanza(balanza)`, `function mostrarEstadoResultados(estadoResultados)`, `function mostrarBalanceGeneral(balanceGeneral)`.

**Formalización de la fase:** `Reporte = selector(tipoReporteActual, cuentasReporte, movimientosReporte, periodo)`; la vista es una transformación de presentación del objeto calculado.

**Estructuras/tecnicismos reales:** DOM.

**Complejidad dominante:** `O(n)` respecto al tamaño de la colección recorrida.

**Código exacto correspondiente a la fase:**

```js
function prepararVistaBalanza() {
    vistaBalanza.classList.remove("oculto");
    vistaEstadoFinanciero.classList.add("oculto");
    vistaEstadoFinanciero.innerHTML = "";
}

function prepararVistaEstado() {
    vistaBalanza.classList.add("oculto");
    vistaEstadoFinanciero.classList.remove("oculto");
}

function mostrarMensajeReporte(texto) {
    mensajeReporte.textContent = texto;
    mensajeReporte.className = "mensaje-reporte correcto";
}

function mostrarBalanza(balanza) {
    prepararVistaBalanza();
    cuerpoBalanza.innerHTML = balanza.cuentas.map(crearFilaBalanza).join("");
    document.getElementById("pie-total-debe").textContent = formatearDineroReporte(balanza.totalDebe);
    document.getElementById("pie-total-haber").textContent = formatearDineroReporte(balanza.totalHaber);
    document.getElementById("pie-saldo-deudor").textContent = formatearDineroReporte(balanza.totalSaldoDeudor);
    document.getElementById("pie-saldo-acreedor").textContent = formatearDineroReporte(balanza.totalSaldoAcreedor);
    actualizarResumenReporte(
        "Total Debe", formatearDineroReporte(balanza.totalDebe), "Movimientos del período",
        "Total Haber", formatearDineroReporte(balanza.totalHaber), "Movimientos del período",
        "Cuentas con movimiento", String(balanza.cuentas.length), "Solo cuentas auxiliares"
    );
    sinDatosReporte.style.display = balanza.cuentas.length === 0 ? "block" : "none";
    mostrarMensajeReporte("Balanza generada para " + balanza.cuentas.length + " cuentas con movimientos.");
    actualizarPeriodoReporte();
}

function mostrarEstadoResultados(estadoResultados) {
    prepararVistaEstado();
    const seccionIngresos = crearSeccionEstado(
        "Ingresos",
        estadoResultados.ingresos,
        "Total ingresos",
        estadoResultados.totalIngresos
    );
    const seccionGastos = crearSeccionEstado(
        "Gastos",
        estadoResultados.gastos,
        "Total gastos",
        estadoResultados.totalGastos
    );
    vistaEstadoFinanciero.innerHTML = `<div class="estado-resultados-contenido">
        ${seccionIngresos}
        ${seccionGastos}
        <div class="resultado-estado">
            <span>${escaparTextoReporte(estadoResultados.tipoResultado)}</span>
            <strong>${formatearDineroReporte(estadoResultados.resultadoNeto)}</strong>
        </div>
    </div>`;
    actualizarResumenReporte(
        "Ingresos", formatearDineroReporte(estadoResultados.totalIngresos), "Cuentas de naturaleza acreedora",
        "Gastos", formatearDineroReporte(estadoResultados.totalGastos), "Cuentas de naturaleza deudora",
        estadoResultados.tipoResultado, formatearDineroReporte(estadoResultados.resultadoNeto), "Ingresos menos gastos"
    );
    const cantidad = estadoResultados.ingresos.length + estadoResultados.gastos.length;
    sinDatosReporte.style.display = cantidad === 0 ? "block" : "none";
    mostrarMensajeReporte("Estado de resultados generado para " + cantidad + " cuentas.");
    actualizarPeriodoReporte();
}

function mostrarBalanceGeneral(balanceGeneral) {
    prepararVistaEstado();
    const filaResultado = `<tr class="fila-resultado-periodo">
        <td>—</td>
        <td>${escaparTextoReporte(balanceGeneral.tipoResultado)}</td>
        <td>${formatearDineroReporte(balanceGeneral.resultadoPeriodo)}</td>
    </tr>`;
    const seccionActivos = crearSeccionEstado(
        "Activo",
        balanceGeneral.activos,
        "Total activo",
        balanceGeneral.totalActivos
    );
    const seccionPasivos = crearSeccionEstado(
        "Pasivo",
        balanceGeneral.pasivos,
        "Total pasivo",
        balanceGeneral.totalPasivos
    );
    const seccionPatrimonio = crearSeccionEstado(
        "Patrimonio",
        balanceGeneral.patrimonio,
        "Total patrimonio y resultado",
        balanceGeneral.totalPatrimonioResultado,
        filaResultado
    );
    vistaEstadoFinanciero.innerHTML = `<div class="columnas-estados">
        <div>${seccionActivos}</div>
        <div>${seccionPasivos}${seccionPatrimonio}</div>
    </div>
    <div class="ecuacion-balance">
        <span>Total activo <strong>${formatearDineroReporte(balanceGeneral.totalActivos)}</strong></span>
        <span>Total pasivo + patrimonio <strong>${formatearDineroReporte(balanceGeneral.totalPasivoPatrimonio)}</strong></span>
    </div>`;
    actualizarResumenReporte(
        "Total activo", formatearDineroReporte(balanceGeneral.totalActivos), "Bienes y derechos",
        "Total pasivo", formatearDineroReporte(balanceGeneral.totalPasivos), "Obligaciones",
        "Patrimonio + resultado", formatearDineroReporte(balanceGeneral.totalPatrimonioResultado), "Participación residual"
    );
    const cantidad = balanceGeneral.activos.length + balanceGeneral.pasivos.length + balanceGeneral.patrimonio.length;
    sinDatosReporte.style.display = cantidad === 0 && balanceGeneral.resultadoPeriodo === 0 ? "block" : "none";
    mostrarMensajeReporte("Balance general generado.");
    actualizarPeriodoReporte();
}

```

### FASE 03 — Configuración de interacción — espejo técnico

**Firmas reales:** `function configurarInterfazReporte()`.

**Formalización de la fase:** `Reporte = selector(tipoReporteActual, cuentasReporte, movimientosReporte, periodo)`; la vista es una transformación de presentación del objeto calculado.

**Estructuras/tecnicismos reales:** DOM.

**Complejidad dominante:** `O(n)` respecto al tamaño de la colección recorrida.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (esBalance) fechaDesdeReporte.value = "";
```

**Código exacto correspondiente a la fase:**

```js
function configurarInterfazReporte() {
    const configuraciones = {
        balanza: {
            titulo: "Balanza de comprobación",
            descripcion: "Movimientos y saldos del catálogo y el Libro Diario.",
            detalle: "Detalle por cuenta",
            nota: "Los totales se calculan en centavos para evitar diferencias por decimales."
        },
        balance: {
            titulo: "Balance general",
            descripcion: "Activo, pasivo y patrimonio acumulados a una fecha.",
            detalle: "Situación financiera",
            nota: "El resultado acumulado se presenta dentro del patrimonio para completar la ecuación contable."
        },
        resultados: {
            titulo: "Estado de resultados",
            descripcion: "Ingresos, gastos y resultado neto del período.",
            detalle: "Rendimiento del período",
            nota: "El resultado neto corresponde a ingresos menos gastos."
        }
    };
    const configuracion = configuraciones[tipoReporteActual];
    document.getElementById("titulo-reporte-pagina").textContent = configuracion.titulo;
    document.getElementById("descripcion-reporte").textContent = configuracion.descripcion;
    document.getElementById("titulo-detalle-reporte").textContent = configuracion.detalle;
    document.getElementById("nota-reporte").textContent = configuracion.nota;
    const esBalance = tipoReporteActual === "balance";
    document.getElementById("campo-fecha-desde").classList.toggle("oculto", esBalance);
    document.getElementById("etiqueta-fecha-hasta").textContent = esBalance ? "Al" : "Hasta";
    if (esBalance) fechaDesdeReporte.value = "";
    botonesReportes.forEach(function(boton) {
        boton.classList.toggle("activo", boton.dataset.reporte === tipoReporteActual);
    });
}

```

### FASE 04 — Generación/selección de reporte — espejo técnico

**Firmas reales:** `function generarReporteConDatos()`, `function mostrarReporteCalculado(reporte)`, `function mostrarReporteDesdeProyeccion(proyeccion)`, `async function generarReporteActualizado()`, `async function seleccionarReporte(evento)`.

**Formalización de la fase:** `Reporte = selector(tipoReporteActual, cuentasReporte, movimientosReporte, periodo)`; la vista es una transformación de presentación del objeto calculado.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** Costo CPU local cercano a `O(1)` más latencia de I/O/asíncrona determinada por la API externa o el almacenamiento.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (tipoReporteActual === "balance") {
if (tipoReporteActual === "resultados") {
if (tipoReporteActual === "balance") mostrarBalanceGeneral(reporte);
else if (tipoReporteActual === "resultados") mostrarEstadoResultados(reporte);
if (tipoReporteActual === "balance") mostrarBalanceGeneral(proyeccion.balanceGeneral);
else if (tipoReporteActual === "resultados") mostrarEstadoResultados(proyeccion.estadoResultados);
```

**Postcondiciones/retornos observables extraídos:**

```js
return generarBalanceGeneral(cuentasReporte, movimientosReporte, fechaHastaReporte.value);
return generarEstadoResultados(
return generarBalanzaComprobacion(
```

**Código exacto correspondiente a la fase:**

```js
function generarReporteConDatos() {
    validarPeriodoReporte();
    if (tipoReporteActual === "balance") {
        return generarBalanceGeneral(cuentasReporte, movimientosReporte, fechaHastaReporte.value);
    }
    if (tipoReporteActual === "resultados") {
        return generarEstadoResultados(
            cuentasReporte,
            movimientosReporte,
            fechaDesdeReporte.value,
            fechaHastaReporte.value
        );
    }
    return generarBalanzaComprobacion(
        cuentasReporte,
        movimientosReporte,
        fechaDesdeReporte.value,
        fechaHastaReporte.value
    );
}

function mostrarReporteCalculado(reporte) {
    mensajeReporte.textContent = "";
    mensajeReporte.className = "mensaje-reporte";
    if (tipoReporteActual === "balance") mostrarBalanceGeneral(reporte);
    else if (tipoReporteActual === "resultados") mostrarEstadoResultados(reporte);
    else mostrarBalanza(reporte);
}

function mostrarReporteDesdeProyeccion(proyeccion) {
    if (tipoReporteActual === "balance") mostrarBalanceGeneral(proyeccion.balanceGeneral);
    else if (tipoReporteActual === "resultados") mostrarEstadoResultados(proyeccion.estadoResultados);
    else mostrarBalanza(proyeccion.balanza);
}

async function generarReporteActualizado() {
    try {
        movimientosReporte = await obtenerMovimientosBD();
        cuentasReporte = await obtenerCuentasBD();
        mostrarReporteCalculado(generarReporteConDatos());
    } catch (error) {
        mensajeReporte.textContent = error.message;
        mensajeReporte.className = "mensaje-reporte error";
    }
}

async function seleccionarReporte(evento) {
    tipoReporteActual = evento.currentTarget.dataset.reporte;
    configurarInterfazReporte();
    await generarReporteActualizado();
}

```

### FASE 05 — Inicialización y actualización reactiva — espejo técnico

**Firmas reales:** `async function iniciarReportes()`.

**Formalización de la fase:** `Reporte = selector(tipoReporteActual, cuentasReporte, movimientosReporte, periodo)`; la vista es una transformación de presentación del objeto calculado.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** Costo CPU local cercano a `O(1)` más latencia de I/O/asíncrona determinada por la API externa o el almacenamiento.

**Código exacto correspondiente a la fase:**

```js
async function iniciarReportes() {
    try {
        await abrirBaseDatos();
        await asegurarDatosReportes();
        configurarInterfazReporte();
        const proyeccion = await reconstruirProyeccionContable();
        mostrarReporteDesdeProyeccion(proyeccion);
    } catch (error) {
        cuerpoBalanza.innerHTML = "";
        vistaEstadoFinanciero.innerHTML = "";
        mensajeReporte.textContent = "No se pudo generar el reporte: " + error.message;
        mensajeReporte.className = "mensaje-reporte error";
    }
}

```

### Regla de fidelidad del reflejo

- Las ecuaciones describen únicamente relaciones que ya están codificadas; no sustituyen el comportamiento JavaScript.
- Los nombres `codigo`, `cuenta`, `movimiento`, `partida`, `baseDatos`, stores, eventos y demás símbolos se mantienen exactamente como aparecen en el código.
- Una futura modificación del `.js` exige actualizar esta sección si cambia una firma, condición, estructura, efecto secundario o postcondición.
- No se introducen DAG, criptografía, Circuit Breaker, checksum, GPU/SIMD u otras tecnologías salvo que el propio archivo las implemente.


## Refutación P3 — pros y contras
### Pros a preservar
- **Preservar:** Cálculo separado del renderizado.
- **Preservar:** Reutiliza motor contable como única fuente de fórmulas.
- **Preservar:** Puede usar proyección materializada para estado sin filtros.
- **Preservar:** Escapa texto antes de HTML.

### Contras y tratamiento
- **Contra:** Controlador acoplado al DOM.
  **Tratamiento/refutación:** Propio de la capa UI; mantener funciones de cálculo fuera.
- **Contra:** Caché local de cuentas/movimientos puede quedar obsoleta.
  **Tratamiento/refutación:** Evento de proyección actualiza vista; si se necesitan datos fuente frescos con filtros, recargar explícitamente como mejora controlada.

## Sintaxis e instrucciones finales de mantenimiento
- Escapa texto antes de HTML y formatea números de forma controlada.
- asegurarDatosReportes valida arrays; validarPeriodoReporte rechaza desde>hasta.
- Texto de cuentas pasa por escape; se selecciona estructura esperada por tipo.
- Los valores de tipo se restringen a controles conocidos de la página.
- Valida período antes de invocar generadores; motor contable valida integridad interna.
- Inicialización solo renderiza tras asegurarDatosReportes; evento usa proyección recibida cuando no hay filtros.
- No renombrar funciones públicas, variables globales compartidas ni contratos entre módulos sin revisar consumidores.
- Mantener comentarios de inicio/fin de fase cortos; la explicación detallada permanece en este `.md`.

## Criterio de cierre P3
El objetivo de “contras al 0%” se interpreta como **cero debilidades identificadas sin tratamiento**: corregir, mitigar, documentar como restricción o convertir en prueba obligatoria. No se declara riesgo técnico cero cuando el código conserva un trade-off real.

## Actualización — independencia entre reportes

`iniciarReportes()` ya no obliga a reconstruir simultáneamente Balanza, Estado de Resultados y Balance General para mostrar la pestaña seleccionada. Al iniciar, recarga cuentas/movimientos y calcula directamente el reporte activo mediante `generarReporteActualizado()`.

Código crítico:
```js
await abrirBaseDatos();
await asegurarDatosReportes();
configurarInterfazReporte();
await generarReporteActualizado();
```

Esto evita que un fallo específico del Balance General deje vacía la Balanza de comprobación o el Estado de Resultados.


## Refactor 2026-09-28 — eliminación desde drill-down
El detalle por cuenta permite eliminar movimientos cuyo origen sea `Compra` o `Venta`. La acción no borra una línea aislada: resuelve la operación comercial de origen por `movimientoId` y ejecuta la misma cascada controlada usada por Compras, Ventas e Impuestos. Los movimientos derivados de otros módulos permanecen de solo lectura desde reportes.

## Afinación octubre 2026
- `Generar` se bloquea durante I/O.
- La UI exige `reporte.verificacion.valido` antes de renderizar y relee IndexedDB en cada generación.
