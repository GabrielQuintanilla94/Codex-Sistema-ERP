# libro_diario.js — P3 v3

## Qué es este archivo
Controlador principal del Libro Diario; administra captura, validación, construcción, persistencia, eliminación y visualización de partidas contables en la interfaz.


## Propósito técnico
Controlador principal del Libro Diario: carga catálogo/movimientos, renderiza partidas, captura formulario, valida reglas de entrada, construye movimiento, persiste, verifica y publica eventos.

## Dependencias reales
- DOM de index.html
- movimientos.js
- motor_contable.js
- base_datos.js
- bus_eventos.js/TIPOS_EVENTOS
- datos JSON como bootstrap

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases y funciones reales de este archivo. No se asume DAG, Circuit Breaker, checksum, Epoll, GPU/SIMD o criptografía si el código no los implementa o no los necesita.

### FASE 00 — Estado UI, utilidades y carga auxiliar
**Funciones reales de la fase:** `actualizarTelemetriaMovimiento()`, `escaparTexto()`, `escaparAtributo()`, `convertirDinero()`, `centavosADinero()`, `valorACentavos()`, `fechaEsValida()`, `mostrarFecha()`, `calcularTotal()`, `siguienteIdMovimiento()`, `normalizarMovimientoExistente()`, `crearLineasPartida()`, `crearMovimiento()`, `actualizarResumen()`, `filtrarMovimientos()`, `ordenarMovimientos()`, `mostrarMovimientos()`, `activarAcordeones()`, `eliminarPartida()`, `cargarJSON()`, `prepararCuentas()`, `prepararMovimientos()`, `opcionesCuentas()`, `agregarLineaFormulario()`, `numerarFilas()`, `obtenerTotalesFormulario()`, `actualizarTotalesFormulario()`, `fechaLocalActual()`, `sugerirNumeroPartida()`, `reiniciarFormularioPartida()`, `abrirFormularioMovimiento()`, `cerrarFormularioMovimiento()`, `mostrarErrorFormulario()`.

- **A. Objetivo (DDD):** Mantener presentación/estado del diario separado de validación contable central.
- **B. Entrada (Zero-Trust):** Valores DOM, movimientos existentes y respuestas JSON/IndexedDB.
- **C. Validación (Harness IAST):** Escapa texto/atributos, convierte importes a centavos y valida fechas antes de uso.
- **D. Procesamiento:** Renderiza partidas, filtra/ordena, gestiona formularios, carga cuentas y movimientos y calcula totales visuales.
- **E. Decisión:** Filtros/orden/UI no alteran persistencia; las mutaciones usan funciones dedicadas.
- **F. Recuperación:** Errores de carga/eliminación se muestran y no deben dejar HTML como fuente canónica.
- **G. Verificación:** Estado visual deriva de arrays `movimientos` y `cuentasDisponibles`.
- **H. Telemetría:** `actualizarTelemetriaMovimiento` registra fase, resultado y rechazos del alta.

### FASE 01 — Captura de datos de partida
**Funciones reales de la fase:** `recibirDatosMovimiento()`.

- **A. Objetivo (DDD):** Construir un DTO de entrada desde el formulario sin persistir ni validar reglas contables.
- **B. Entrada (Zero-Trust):** Lee fecha, número, referencia, concepto y todas las filas del DOM.
- **C. Validación (Harness IAST):** Normaliza strings y convierte debe/haber inmediatamente a centavos mediante `valorACentavos`.
- **D. Procesamiento:** Mapea cada fila a `{codigo,descripcion,debeCentavos,haberCentavos}` y arma objeto `datos`.
- **E. Decisión:** No descarta líneas aquí; FASE 02 decide cuáles tienen contenido y validez.
- **F. Recuperación:** Entrada vacía se representa con valores vacíos/0 y se rechaza limpiamente en FASE 02.
- **G. Verificación:** Salida contiene siempre metadatos y `lineas` Array.
- **H. Telemetría:** Registra `Datos recibidos`.

### FASE 02 — Validación de formulario y partida
**Funciones reales de la fase:** `validarDatosMovimiento()`.

- **A. Objetivo (DDD):** Rechazar partidas duplicadas, incompletas o descuadradas antes de crear el objeto persistible.
- **B. Entrada (Zero-Trust):** DTO de FASE 01 y estado actual de cuentas/movimientos.
- **C. Validación (Harness IAST):** Fecha válida, número/concepto mínimos, número/referencia no repetidos, >=2 líneas, cuenta seleccionada/auxiliar, importes válidos y suma Debe=Haber.
- **D. Procesamiento:** Filtra líneas con contenido y acumula totales en centavos.
- **E. Decisión:** Primer error retorna mensaje; sin error autoriza construcción.
- **F. Recuperación:** No crea ni persiste movimiento si hay error; UI muestra el mensaje.
- **G. Verificación:** Total debe y haber deben ser iguales y >0 antes de pasar a FASE 03.
- **H. Telemetría:** La validación participa en el resultado del flujo; los rechazos se muestran en formulario.

### FASE 03 — Construcción del movimiento persistible
**Funciones reales de la fase:** `construirNuevoMovimiento()`.

- **A. Objetivo (DDD):** Transformar datos validados en la estructura interna exacta usada por IndexedDB, motor y reportes.
- **B. Entrada (Zero-Trust):** DTO aprobado por FASE 02.
- **C. Validación (Harness IAST):** Asume reglas aprobadas; descarta filas totalmente vacías según el mismo criterio del flujo.
- **D. Procesamiento:** Asigna `id` con `siguienteIdMovimiento`, `creadoEn`, `tipo`, origen y convierte centavos a importes de cada línea.
- **E. Decisión:** Solo líneas con cuenta/importe real forman `partida`.
- **F. Recuperación:** No muta array global ni BD; si construcción falla no queda estado parcial.
- **G. Verificación:** Objeto resultante contiene id, número, fecha y `partida` lista para `validarPartidaDoble`.
- **H. Telemetría:** Registra `Partida construida`.

### FASE 04 — Validación final y persistencia
**Funciones reales de la fase:** `fase4DecidirMovimiento()`.

- **A. Objetivo (DDD):** Aplicar el motor contable inmediatamente antes del commit y guardar una única partida.
- **B. Entrada (Zero-Trust):** Movimiento construido y catálogo disponible.
- **C. Validación (Harness IAST):** Construye Map `cuentasPorCodigo` y llama `validarPartidaDoble` para reconfirmar cuentas/auxiliares/importes/cuadre.
- **D. Procesamiento:** `await guardarMovimientoBD(movimiento)` tras pasar la validación.
- **E. Decisión:** Solo un movimiento contablemente válido llega a persistencia.
- **F. Recuperación:** Error de validación/BD se propaga a `registrarMovimiento`; array global aún no fue modificado.
- **G. Verificación:** El commit de IndexedDB debe finalizar antes de marcar `Partida almacenada`.
- **H. Telemetría:** Registra `4. Decisión / Partida almacenada`.

### FASE 05 — Verificación persistente, evento y consolidación UI
**Funciones reales de la fase:** `fase5VerificarMovimiento()`, `guardarYVerificarMovimiento()`, `registrarMovimiento()`, `iniciarLibroDiario()`.

- **A. Objetivo (DDD):** Confirmar el registro persistido antes de integrarlo en memoria/UI y publicar el hecho contable.
- **B. Entrada (Zero-Trust):** Movimiento persistido de FASE 04.
- **C. Validación (Harness IAST):** `obtenerMovimientoBD(id)` debe coincidir en número, fecha y cantidad de líneas.
- **D. Procesamiento:** Si verifica, publica `PARTIDA_REGISTRADA`; luego `registrarMovimiento` hace `unshift`, resetea filtros y refresca UI. Inicio carga BD/catálogo/movimientos.
- **E. Decisión:** Verificación fallida elimina el movimiento persistido y lanza error; memoria solo se actualiza después de F5.
- **F. Recuperación:** Rollback `eliminarMovimientoBD(id)` ante inconsistencia; catch muestra error y registra recuperación.
- **G. Verificación:** Postcondición: movimiento verificable en BD antes de aparecer en `movimientos` global.
- **H. Telemetría:** Registra `Partida verificada`, `Registro revertido` y errores de recuperación.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `TotalDebe = Σ_i debeCentavos_i`; `TotalHaber = Σ_i haberCentavos_i`.
- `PartidaValida ⇒ TotalDebe = TotalHaber ∧ TotalDebe>0 ∧ nLineas≥2`.
- `id_nuevo = max({Number(m.id)}) + 1`.
- `diferencia = debe - haber`.
- `Persistencia confirmada ⇒ obtenerMovimientoBD(id)` coincide con el movimiento; en caso contrario `eliminarMovimientoBD(id)`.
- `Filtro(m)=coincideTexto(m) ∧ coincideOrigen(m)`.

### Declaraciones y estado de módulo reflejados desde el código

```js
const listaMovimientos = document.getElementById("lista-movimientos");
const buscador = document.getElementById("buscador");
const filtroTipo = document.getElementById("filtro-tipo");
const botonAgregar = document.getElementById("boton-agregar");
const botonImportar = document.getElementById("boton-importar");
const sinResultados = document.getElementById("sin-resultados");
const dialogoMovimiento = document.getElementById("dialogo-movimiento");
const formularioMovimiento = document.getElementById("formulario-movimiento");
const mensajeMovimiento = document.getElementById("mensaje-movimiento");
const cuerpoLineas = document.getElementById("lineas-partida");
const totalDebeFormulario = document.getElementById("total-debe-formulario");
const totalHaberFormulario = document.getElementById("total-haber-formulario");
const diferenciaFormulario = document.getElementById("diferencia-formulario");
const estadoBalance = document.getElementById("estado-balance");
let cuentasDisponibles = [];
let contadorFilas = 0;
const telemetriaMovimientos = {
    procesadas: 0,
    rechazadas: 0,
    fase: "Esperando entrada",
    resultado: "Sin operaciones"
};
FASE 1
A. Objetivo: recibir una partida manual desde el formulario.
B. Entrada (Zero-Trust): encabezado y líneas ingresados por el usuario.
C. Validación: todavía no se aprueba ningún valor.
D. Procesamiento: normalizar texto y convertir importes a centavos.
E. Decisión: enviar una estructura uniforme a la fase 2.
F. Recuperación: sustituir campos ausentes por valores controlados.
G. Verificación: devolver siempre encabezado y colección de líneas.
H. Telemetría: registrar el inicio de la captura.
FASE 2
A. Objetivo: impedir el registro de partidas contables inválidas.
B. Entrada (Zero-Trust): partida normalizada, todavía no confiable.
C. Validación: fecha real, campos, duplicados, cuentas, importes y balance.
D. Procesamiento: filtrar líneas vacías y sumar en centavos.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: mantener formulario, memoria e IndexedDB sin cambios.
G. Verificación: Debe y Haber deben ser positivos e iguales.
H. Telemetría: registrar aprobación o causa de rechazo.
FASE 3
A. Objetivo: construir el objeto contable definitivo.
B. Entrada (Zero-Trust): datos aprobados por la fase 2.
C. Validación: localizar nuevamente cada cuenta auxiliar.
D. Procesamiento: convertir centavos a moneda y formar la partida doble.
E. Decisión: asignar identificador, origen y fecha de creación.
F. Recuperación: la fase 2 evita que una cuenta ausente llegue aquí.
G. Verificación: conservar código, nombre, descripción, Debe y Haber.
H. Telemetría: registrar que el objeto fue construido.
FASE 4
A. Objetivo: decidir si la partida se vuelve permanente.
B. Entrada (Zero-Trust): objeto construido en memoria.
C. Validación: recalcular la igualdad contable en centavos.
D. Procesamiento: insertar la partida mediante IndexedDB.
E. Decisión: persistir solo si Debe y Haber coinciden.
F. Recuperación: propagar el error sin modificar la colección visible.
G. Verificación: esperar la finalización de la transacción.
H. Telemetría: registrar la decisión de persistencia.
FASE 5
A. Objetivo: comprobar que la partida persistida coincide con la original.
B. Entrada (Zero-Trust): identificador de una partida recién guardada.
C. Validación: volver a leer número, fecha y líneas desde IndexedDB.
D. Procesamiento: comparar identidad y estructura mínima.
E. Decisión: confirmar o rechazar el registro.
F. Recuperación: eliminar el registro si la verificación falla.
G. Verificación: lectura independiente mediante obtenerMovimientoBD().
H. Telemetría: actualizar procesadas, rechazadas y resultado.
buscador.addEventListener("input", mostrarMovimientos);
filtroTipo.addEventListener("change", mostrarMovimientos);
botonAgregar.addEventListener("click", abrirFormularioMovimiento);
document.getElementById("cerrar-dialogo").addEventListener("click", cerrarFormularioMovimiento);
document.getElementById("cancelar-movimiento").addEventListener("click", cerrarFormularioMovimiento);
document.getElementById("agregar-linea").addEventListener("click", function() {
    agregarLineaFormulario();
});
formularioMovimiento.addEventListener("submit", registrarMovimiento);
iniciarLibroDiario();
```

### FASE 00 — Estado UI, utilidades y carga auxiliar — espejo técnico

**Firmas reales:** `function actualizarTelemetriaMovimiento(fase, resultado, rechazada)`, `function escaparTexto(texto)`, `function escaparAtributo(texto)`, `function convertirDinero(valor)`, `function centavosADinero(centavos)`, `function valorACentavos(valor)`, `function fechaEsValida(fecha)`, `function mostrarFecha(fecha)`, `function calcularTotal(partida, columna)`, `function siguienteIdMovimiento()`, `function normalizarMovimientoExistente(movimiento)`, `function crearLineasPartida(partida)`, `function crearMovimiento(movimiento)`, `function actualizarResumen()`, `function filtrarMovimientos()`, `function ordenarMovimientos()`, `function mostrarMovimientos()`, `function activarAcordeones()`, `async function eliminarPartida(evento)`, `async function cargarJSON(ruta)`, `async function prepararCuentas()`, `async function prepararMovimientos()`, `function opcionesCuentas(codigoSeleccionado)`, `function agregarLineaFormulario(linea)`, `function numerarFilas()`, `function obtenerTotalesFormulario()`, `function actualizarTotalesFormulario()`, `function fechaLocalActual()`, `function sugerirNumeroPartida()`, `function reiniciarFormularioPartida()`, `function abrirFormularioMovimiento()`, `function cerrarFormularioMovimiento()`, `function mostrarErrorFormulario(mensaje)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** `Map`, `Set`, `Array`, DOM.

**Complejidad dominante:** `O(n log n)` por ordenamiento; las pasadas lineales adicionales no cambian el término dominante.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (rechazada === true) telemetriaMovimientos.rechazadas++;
if (rechazada === false) telemetriaMovimientos.procesadas++;
if (!Number.isFinite(numero)) return 0;
if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
if (!movimiento) return;
if (!confirmada) return;
if (verificacion) throw new Error("La partida continúa almacenada.");
if (posicion !== -1) movimientos.splice(posicion, 1);
if (!respuesta.ok) throw new Error("No se pudo cargar " + ruta);
if (!Array.isArray(cuentasIniciales)) {
if (cuentas.length === 0) {
if (cuentasFaltantes.length > 0) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return elemento.innerHTML;
return escaparTexto(texto).replace(/"/g, "&quot;");
return "$" + Number(valor || 0).toFixed(2);
return convertirDinero(Number(centavos || 0) / 100);
return Math.round(numero * 100);
return fechaUTC.getUTCFullYear() === partes[0] &&
return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : fecha;
return total + valorACentavos(linea[columna]);
```

**Código exacto correspondiente a la fase:**

```js
function actualizarTelemetriaMovimiento(fase, resultado, rechazada) {
    telemetriaMovimientos.fase = fase;
    telemetriaMovimientos.resultado = resultado;
    if (rechazada === true) telemetriaMovimientos.rechazadas++;
    if (rechazada === false) telemetriaMovimientos.procesadas++;
}

function escaparTexto(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = String(texto || "");
    return elemento.innerHTML;
}

function escaparAtributo(texto) {
    return escaparTexto(texto).replace(/"/g, "&quot;");
}

function convertirDinero(valor) {
    return "$" + Number(valor || 0).toFixed(2);
}

function centavosADinero(centavos) {
    return convertirDinero(Number(centavos || 0) / 100);
}

function valorACentavos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 0;
    return Math.round(numero * 100);
}
function fechaEsValida(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const partes = fecha.split("-").map(Number);
    const fechaUTC = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));
    return fechaUTC.getUTCFullYear() === partes[0] &&
        fechaUTC.getUTCMonth() === partes[1] - 1 &&
        fechaUTC.getUTCDate() === partes[2];
}
function mostrarFecha(fecha) {
    const partes = String(fecha || "").split("-");
    return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : fecha;
}

function calcularTotal(partida, columna) {
    const centavos = partida.reduce(function(total, linea) {
        return total + valorACentavos(linea[columna]);
    }, 0);
    return centavos / 100;
}

function siguienteIdMovimiento() {
    return movimientos.reduce(function(idMayor, movimiento) {
        return Math.max(idMayor, Number(movimiento.id) || 0);
    }, 0) + 1;
}

function normalizarMovimientoExistente(movimiento) {
    return {
        ...movimiento,
        numero: movimiento.numero || movimiento.referencia || "JE-" + String(movimiento.id).padStart(4, "0"),
        referencia: movimiento.referencia || "",
        concepto: movimiento.concepto || "Partida contable",
        origen: movimiento.origen || "Demostración",
        partida: (movimiento.partida || []).map(function(linea) {
            return {
                ...linea,
                descripcion: linea.descripcion || ""
            };
        })
    };
}

function crearLineasPartida(partida) {
    return partida.map(function(linea) {
        const descripcion = linea.descripcion
            ? `<small>${escaparTexto(linea.descripcion)}</small>`
            : "";

        return `
            <div class="fila-partida">
                <span class="cuenta-detalle">
                    ${escaparTexto(linea.codigo + " - " + linea.cuenta)}
                    ${descripcion}
                </span>
                <span>${convertirDinero(linea.debe)}</span>
                <span>${convertirDinero(linea.haber)}</span>
            </div>
        `;
    }).join("");
}

function crearMovimiento(movimiento) {
    const totalDebe = calcularTotal(movimiento.partida, "debe");
    const totalHaber = calcularTotal(movimiento.partida, "haber");
    const balanceada = Math.abs(totalDebe - totalHaber) < 0.001;
    const puedeEliminar = movimiento.origen === "Manual" || movimiento.origen === "CSV";
    const acciones = puedeEliminar
        ? `
            <div class="acciones-partida-guardada">
                <button class="eliminar-partida" type="button" data-id="${movimiento.id}">
                    Eliminar partida
                </button>
            </div>
        `
        : "";

    return `
        <article class="movimiento">
            <button class="resumen-movimiento" type="button" data-id="${movimiento.id}">
                <span class="concepto">
                    <small>
                        ${escaparTexto(movimiento.numero)} ·
                        ${mostrarFecha(movimiento.fecha)} ·
                        ${escaparTexto(movimiento.referencia || "Sin referencia")} ·
                        ${escaparTexto(movimiento.origen)}
                    </small>
                    <strong>${escaparTexto(movimiento.concepto)}</strong>
                </span>
                <span class="entrada">${convertirDinero(totalDebe)}</span>
                <span class="salida">${convertirDinero(totalHaber)}</span>
                <span class="flecha">▼</span>
            </button>

            <div class="detalle-partida" id="partida-${movimiento.id}">
                <div class="titulo-partida">
                    <h3>${escaparTexto(movimiento.numero)} · Partida doble</h3>
                    <span>${balanceada ? "✓ Balanceada" : "✕ No balanceada"}</span>
                </div>
                <div class="fila-partida titulos-partida">
                    <span>Cuenta</span><span>Debe</span><span>Haber</span>
                </div>
                ${crearLineasPartida(movimiento.partida)}
                <div class="fila-partida total-partida">
                    <span>Total</span>
                    <span>${convertirDinero(totalDebe)}</span>
                    <span>${convertirDinero(totalHaber)}</span>
                </div>
                ${acciones}
            </div>
        </article>
    `;
}

function actualizarResumen() {
    let totalDebeCentavos = 0;
    let totalHaberCentavos = 0;
    movimientos.forEach(function(movimiento) {
        totalDebeCentavos += valorACentavos(calcularTotal(movimiento.partida, "debe"));
        totalHaberCentavos += valorACentavos(calcularTotal(movimiento.partida, "haber"));
    });
    document.getElementById("resumen-entradas").textContent = centavosADinero(totalDebeCentavos);
    document.getElementById("resumen-salidas").textContent = centavosADinero(totalHaberCentavos);
    document.getElementById("resumen-neto").textContent = movimientos.length;
}

function filtrarMovimientos() {
    const texto = buscador.value.toLowerCase().trim();
    const origen = filtroTipo.value;

    return movimientos.filter(function(movimiento) {
        const contenido = [
            movimiento.numero,
            movimiento.concepto,
            movimiento.referencia,
            movimiento.origen
        ].join(" ").toLowerCase();
        const coincideTexto = contenido.includes(texto);
        const coincideOrigen = origen === "Todos" || movimiento.origen === origen;
        return coincideTexto && coincideOrigen;
    });
}

function ordenarMovimientos() {
    movimientos.sort(function(a, b) {
        return b.fecha.localeCompare(a.fecha) || Number(b.id) - Number(a.id);
    });
}

function mostrarMovimientos() {
    ordenarMovimientos();
    const filtrados = filtrarMovimientos();
    listaMovimientos.innerHTML = filtrados.map(crearMovimiento).join("");
    sinResultados.style.display = filtrados.length === 0 ? "block" : "none";
    actualizarResumen();
    activarAcordeones();
}

function activarAcordeones() {
    document.querySelectorAll(".resumen-movimiento").forEach(function(boton) {
        boton.addEventListener("click", function() {
            const detalle = document.getElementById("partida-" + boton.dataset.id);
            const flecha = boton.querySelector(".flecha");
            detalle.classList.toggle("abierto");
            flecha.textContent = detalle.classList.contains("abierto") ? "▲" : "▼";
        });
    });

    document.querySelectorAll(".eliminar-partida").forEach(function(boton) {
        boton.addEventListener("click", eliminarPartida);
    });
}

async function eliminarPartida(evento) {
    const id = Number(evento.currentTarget.dataset.id);
    const movimiento = movimientos.find(function(item) {
        return Number(item.id) === id;
    });
    if (!movimiento) return;
    const confirmada = window.confirm(
        "¿Eliminar la partida " + movimiento.numero + "?\n\n" +
        "Esta acción retirará la partida del Libro Diario."
    );
    if (!confirmada) return;
    try {
        await eliminarMovimientoBD(id);
        const verificacion = await obtenerMovimientoBD(id);
        if (verificacion) throw new Error("La partida continúa almacenada.");
        await publicarEventoContable(
            TIPOS_EVENTOS.PARTIDA_ELIMINADA,
            "movimiento",
            movimiento.id,
            {
                numero: movimiento.numero,
                fecha: movimiento.fecha
            }
        );
        const posicion = movimientos.findIndex(function(item) {
            return Number(item.id) === id;
        });
        if (posicion !== -1) movimientos.splice(posicion, 1);
        mostrarMovimientos();
    } catch (error) {
        window.alert("No fue posible eliminar la partida: " + error.message);
    }
}

async function cargarJSON(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error("No se pudo cargar " + ruta);
    return respuesta.json();
}

async function prepararCuentas() {
    let cuentas = await obtenerCuentasBD();
    const cuentasIniciales = await cargarJSON("datos/catalogo_cuentas.json");

    if (!Array.isArray(cuentasIniciales)) {
        throw new Error("El catálogo inicial no contiene una lista válida.");
    }
    if (cuentas.length === 0) {
        cuentas = cuentasIniciales;
        await guardarCuentasBD(cuentas);
    } else {
        const codigosGuardados = new Set(cuentas.map(function(cuenta) {
            return cuenta.codigo;
        }));
        const cuentasFaltantes = cuentasIniciales.filter(function(cuenta) {
            return !codigosGuardados.has(cuenta.codigo);
        });

        if (cuentasFaltantes.length > 0) {
            await guardarCuentasBD(cuentasFaltantes);
            cuentas = cuentas.concat(cuentasFaltantes);
        }
    }

    cuentasDisponibles = cuentas
        .filter(function(cuenta) { return cuenta.permiteMovimientos; })
        .sort(function(a, b) { return a.codigo.localeCompare(b.codigo); });
}

async function prepararMovimientos() {
    let guardados = await obtenerMovimientosBD();

    if (guardados.length === 0) {
        guardados = await cargarJSON("datos/movimientos_iniciales.json");
        guardados = guardados.map(normalizarMovimientoExistente);
        await guardarMovimientosBD(guardados);
    } else {
        guardados = guardados.map(normalizarMovimientoExistente);
    }

    sincronizarMovimientos(guardados);
}

function opcionesCuentas(codigoSeleccionado) {
    const opciones = cuentasDisponibles.map(function(cuenta) {
        const seleccionada = cuenta.codigo === codigoSeleccionado ? "selected" : "";
        return `<option value="${cuenta.codigo}" ${seleccionada}>${cuenta.codigo} - ${escaparTexto(cuenta.nombre)}</option>`;
    }).join("");

    return '<option value="">Seleccionar cuenta</option>' + opciones;
}

function agregarLineaFormulario(linea) {
    contadorFilas++;
    const datos = linea || {};
    const fila = document.createElement("tr");
    fila.dataset.fila = contadorFilas;
    fila.innerHTML = `
        <td class="numero-linea"></td>
        <td>
            <select class="linea-cuenta">${opcionesCuentas(datos.codigo || "")}</select>
        </td>
        <td>
            <input class="linea-descripcion" maxlength="100" value="${escaparAtributo(datos.descripcion || "")}" placeholder="Descripción">
        </td>
        <td>
            <input class="linea-debe monto-linea" type="number" min="0" step="0.01" value="${datos.debe || ""}" placeholder="0.00">
        </td>
        <td>
            <input class="linea-haber monto-linea" type="number" min="0" step="0.01" value="${datos.haber || ""}" placeholder="0.00">
        </td>
        <td>
            <button class="eliminar-linea" type="button" title="Eliminar línea">×</button>
        </td>
    `;

    fila.querySelector(".linea-debe").addEventListener("input", function(evento) {
        if (valorACentavos(evento.target.value) > 0) {
            fila.querySelector(".linea-haber").value = "";
        }
        actualizarTotalesFormulario();
    });
    fila.querySelector(".linea-haber").addEventListener("input", function(evento) {
        if (valorACentavos(evento.target.value) > 0) {
            fila.querySelector(".linea-debe").value = "";
        }
        actualizarTotalesFormulario();
    });
    fila.querySelector(".eliminar-linea").addEventListener("click", function() {
        if (cuerpoLineas.querySelectorAll("tr").length <= 2) {
            mostrarErrorFormulario("Una partida debe conservar al menos dos líneas.");
            return;
        }
        fila.remove();
        numerarFilas();
        actualizarTotalesFormulario();
    });

    cuerpoLineas.appendChild(fila);
    numerarFilas();
    actualizarTotalesFormulario();
}

function numerarFilas() {
    cuerpoLineas.querySelectorAll("tr").forEach(function(fila, indice) {
        fila.querySelector(".numero-linea").textContent = indice + 1;
    });
}

function obtenerTotalesFormulario() {
    let debe = 0;
    let haber = 0;

    cuerpoLineas.querySelectorAll("tr").forEach(function(fila) {
        debe += valorACentavos(fila.querySelector(".linea-debe").value);
        haber += valorACentavos(fila.querySelector(".linea-haber").value);
    });

    return { debe: debe, haber: haber, diferencia: debe - haber };
}

function actualizarTotalesFormulario() {
    const totales = obtenerTotalesFormulario();
    totalDebeFormulario.textContent = centavosADinero(totales.debe);
    totalHaberFormulario.textContent = centavosADinero(totales.haber);
    diferenciaFormulario.textContent = centavosADinero(Math.abs(totales.diferencia));

    const balanceada = totales.debe > 0 && totales.diferencia === 0;
    estadoBalance.className = balanceada
        ? "estado-balance balanceada"
        : "estado-balance pendiente";
}

function fechaLocalActual() {
    const ahora = new Date();
    return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
}

function sugerirNumeroPartida() {
    const siguiente = siguienteIdMovimiento();
    return "JE-" + String(siguiente).padStart(4, "0");
}

function reiniciarFormularioPartida() {
    formularioMovimiento.reset();
    cuerpoLineas.innerHTML = "";
    contadorFilas = 0;
    document.getElementById("movimiento-fecha").value = fechaLocalActual();
    document.getElementById("movimiento-numero").value = sugerirNumeroPartida();
    mensajeMovimiento.textContent = "";
    mensajeMovimiento.className = "mensaje-movimiento";
    agregarLineaFormulario();
    agregarLineaFormulario();
}

function abrirFormularioMovimiento() {
    reiniciarFormularioPartida();
    dialogoMovimiento.showModal();
}

function cerrarFormularioMovimiento() {
    dialogoMovimiento.close();
}

function mostrarErrorFormulario(mensaje) {
    mensajeMovimiento.textContent = mensaje;
    mensajeMovimiento.className = "mensaje-movimiento error";
}

/*
FASE 1
A. Objetivo: recibir una partida manual desde el formulario.
B. Entrada (Zero-Trust): encabezado y líneas ingresados por el usuario.
C. Validación: todavía no se aprueba ningún valor.
D. Procesamiento: normalizar texto y convertir importes a centavos.
E. Decisión: enviar una estructura uniforme a la fase 2.
F. Recuperación: sustituir campos ausentes por valores controlados.
G. Verificación: devolver siempre encabezado y colección de líneas.
H. Telemetría: registrar el inicio de la captura.
*/
function recibirDatosMovimiento() {
    actualizarTelemetriaMovimiento("1. Entrada Zero-Trust", "Datos recibidos");
    const lineas = Array.from(cuerpoLineas.querySelectorAll("tr")).map(function(fila) {
        return {
            codigo: String(fila.querySelector(".linea-cuenta").value || "").trim(),
            descripcion: String(fila.querySelector(".linea-descripcion").value || "").trim(),
            debeCentavos: valorACentavos(fila.querySelector(".linea-debe").value),
            haberCentavos: valorACentavos(fila.querySelector(".linea-haber").value)
        };
    });

    return {
        fecha: String(document.getElementById("movimiento-fecha").value || "").trim(),
        numero: String(document.getElementById("movimiento-numero").value || "").trim(),
        referencia: String(document.getElementById("movimiento-referencia").value || "").trim(),
        concepto: String(document.getElementById("movimiento-concepto").value || "").trim(),
        lineas: lineas
    };
}

/*
FASE 2
A. Objetivo: impedir el registro de partidas contables inválidas.
B. Entrada (Zero-Trust): partida normalizada, todavía no confiable.
C. Validación: fecha real, campos, duplicados, cuentas, importes y balance.
D. Procesamiento: filtrar líneas vacías y sumar en centavos.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: mantener formulario, memoria e IndexedDB sin cambios.
G. Verificación: Debe y Haber deben ser positivos e iguales.
H. Telemetría: registrar aprobación o causa de rechazo.
*/
function validarDatosMovimiento(datos) {
    let error = "";
    if (!fechaEsValida(datos.fecha)) {
        error = "Seleccione una fecha válida.";
    } else if (datos.numero.length < 3) {
        error = "Ingrese un número de partida.";
    } else if (datos.concepto.length < 3) {
        error = "El concepto debe contener al menos 3 caracteres.";
    }
    const numeroExiste = movimientos.some(function(movimiento) {
        return movimiento.numero.toLowerCase() === datos.numero.toLowerCase();
    });
    if (!error && numeroExiste) error = "El número de partida ya existe.";
    if (!error && datos.referencia) {
        const referenciaExiste = movimientos.some(function(movimiento) {
            return movimiento.referencia &&
                movimiento.referencia.toLowerCase() === datos.referencia.toLowerCase();
        });
        if (referenciaExiste) error = "La referencia ya fue utilizada.";
    }
    const lineasConContenido = datos.lineas.filter(function(linea) {
        return linea.codigo || linea.descripcion || linea.debeCentavos || linea.haberCentavos;
    });
    if (!error && lineasConContenido.length < 2) {
        error = "La partida debe contener al menos dos líneas.";
    }
    for (let indice = 0; !error && indice < lineasConContenido.length; indice++) {
        const linea = lineasConContenido[indice];
        const cuenta = cuentasDisponibles.find(function(item) {
            return item.codigo === linea.codigo;
        });
        if (!cuenta) {
            error = "Seleccione una cuenta auxiliar válida en la línea " + (indice + 1) + ".";
        }
        if (linea.debeCentavos > 0 && linea.haberCentavos > 0) {
            error = "La línea " + (indice + 1) + " no puede contener Debe y Haber simultáneamente.";
        }
        if (linea.debeCentavos <= 0 && linea.haberCentavos <= 0) {
            error = "Ingrese un valor al Debe o Haber en la línea " + (indice + 1) + ".";
        }
    }
    const totalDebe = lineasConContenido.reduce(function(total, linea) {
        return total + linea.debeCentavos;
    }, 0);
    const totalHaber = lineasConContenido.reduce(function(total, linea) {
        return total + linea.haberCentavos;
    }, 0);

    if (!error && totalDebe !== totalHaber) {
        error = "La partida no está balanceada. La diferencia es " +
            centavosADinero(Math.abs(totalDebe - totalHaber)) + ".";
    }
    actualizarTelemetriaMovimiento(
        "2. Validación",
        error || "Partida aprobada",
        error ? true : undefined
    );
    return error;
}
/*
FASE 3
A. Objetivo: construir el objeto contable definitivo.
B. Entrada (Zero-Trust): datos aprobados por la fase 2.
C. Validación: localizar nuevamente cada cuenta auxiliar.
D. Procesamiento: convertir centavos a moneda y formar la partida doble.
E. Decisión: asignar identificador, origen y fecha de creación.
F. Recuperación: la fase 2 evita que una cuenta ausente llegue aquí.
G. Verificación: conservar código, nombre, descripción, Debe y Haber.
H. Telemetría: registrar que el objeto fue construido.
*/
function construirNuevoMovimiento(datos) {
    const lineas = datos.lineas
        .filter(function(linea) {
            return linea.codigo || linea.descripcion || linea.debeCentavos || linea.haberCentavos;
        })
        .map(function(linea) {
            const cuenta = cuentasDisponibles.find(function(item) {
                return item.codigo === linea.codigo;
            });
            return {
                codigo: cuenta.codigo,
                cuenta: cuenta.nombre,
                descripcion: linea.descripcion,
                debe: linea.debeCentavos / 100,
                haber: linea.haberCentavos / 100
            };
        });

    const movimiento = {
        id: siguienteIdMovimiento(),
        numero: datos.numero,
        fecha: datos.fecha,
        referencia: datos.referencia,
        concepto: datos.concepto,
        origen: "Manual",
        creadoEn: new Date().toISOString(),
        partida: lineas
    };
    actualizarTelemetriaMovimiento("3. Procesamiento", "Partida construida");
    return movimiento;
}
/*
FASE 4
A. Objetivo: decidir si la partida se vuelve permanente.
B. Entrada (Zero-Trust): objeto construido en memoria.
C. Validación: recalcular la igualdad contable en centavos.
D. Procesamiento: insertar la partida mediante IndexedDB.
E. Decisión: persistir solo si Debe y Haber coinciden.
F. Recuperación: propagar el error sin modificar la colección visible.
G. Verificación: esperar la finalización de la transacción.
H. Telemetría: registrar la decisión de persistencia.
*/
async function fase4DecidirMovimiento(movimiento) {
    const cuentasPorCodigo = new Map(cuentasDisponibles.map(function(cuenta) {
        return [cuenta.codigo, cuenta];
    }));
    validarPartidaDoble(movimiento, cuentasPorCodigo);
    await guardarMovimientoBD(movimiento);
    actualizarTelemetriaMovimiento("4. Decisión", "Partida almacenada");
    return true;
}
/*
FASE 5
A. Objetivo: comprobar que la partida persistida coincide con la original.
B. Entrada (Zero-Trust): identificador de una partida recién guardada.
C. Validación: volver a leer número, fecha y líneas desde IndexedDB.
D. Procesamiento: comparar identidad y estructura mínima.
E. Decisión: confirmar o rechazar el registro.
F. Recuperación: eliminar el registro si la verificación falla.
G. Verificación: lectura independiente mediante obtenerMovimientoBD().
H. Telemetría: actualizar procesadas, rechazadas y resultado.
*/
async function fase5VerificarMovimiento(movimiento) {
    const verificado = await obtenerMovimientoBD(movimiento.id);
    const coincide = Boolean(verificado) &&
        verificado.numero === movimiento.numero &&
        verificado.fecha === movimiento.fecha &&
        Array.isArray(verificado.partida) &&
        verificado.partida.length === movimiento.partida.length;
    if (!coincide) {
        await eliminarMovimientoBD(movimiento.id);
        actualizarTelemetriaMovimiento("5. Verificación", "Registro revertido", true);
        throw new Error("La partida no pudo verificarse y fue revertida.");
    }
    actualizarTelemetriaMovimiento("5. Verificación", "Partida verificada", false);
    return true;
}
async function guardarYVerificarMovimiento(movimiento) {
    await fase4DecidirMovimiento(movimiento);
    await fase5VerificarMovimiento(movimiento);
    await publicarEventoContable(
        TIPOS_EVENTOS.PARTIDA_REGISTRADA,
        "movimiento",
        movimiento.id,
        {
            numero: movimiento.numero,
            fecha: movimiento.fecha
        }
    );
    return true;
}

async function registrarMovimiento(evento) {
    evento.preventDefault();
    mensajeMovimiento.textContent = "";
    const datos = recibirDatosMovimiento();
    const error = validarDatosMovimiento(datos);
    if (error) {
        mostrarErrorFormulario(error);
        return;
    }

    try {
        const movimiento = construirNuevoMovimiento(datos);
        await guardarYVerificarMovimiento(movimiento);
        movimientos.unshift(movimiento);
        buscador.value = "";
        filtroTipo.value = "Todos";
        mostrarMovimientos();

        const accion = evento.submitter ? evento.submitter.value : "cerrar";
        if (accion === "nueva") {
            reiniciarFormularioPartida();
            mensajeMovimiento.textContent = "Partida guardada correctamente.";
            mensajeMovimiento.className = "mensaje-movimiento correcto";
        } else {
            cerrarFormularioMovimiento();
        }
    } catch (errorGuardado) {
        actualizarTelemetriaMovimiento("F. Recuperación", errorGuardado.message, true);
        mostrarErrorFormulario(errorGuardado.message);
    }
}

async function iniciarLibroDiario() {
    botonAgregar.disabled = true;
    botonImportar.disabled = true;
    try {
        await abrirBaseDatos();
        await prepararCuentas();
        await prepararMovimientos();
        mostrarMovimientos();
        botonAgregar.disabled = false;
        botonImportar.disabled = false;
    } catch (error) {
        listaMovimientos.innerHTML =
            '<p class="error-carga">No se pudieron cargar los datos. Ejecute el proyecto con Live Server.</p>';
    }
}

buscador.addEventListener("input", mostrarMovimientos);
filtroTipo.addEventListener("change", mostrarMovimientos);
botonAgregar.addEventListener("click", abrirFormularioMovimiento);
document.getElementById("cerrar-dialogo").addEventListener("click", cerrarFormularioMovimiento);
document.getElementById("cancelar-movimiento").addEventListener("click", cerrarFormularioMovimiento);
document.getElementById("agregar-linea").addEventListener("click", function() {
    agregarLineaFormulario();
});
formularioMovimiento.addEventListener("submit", registrarMovimiento);

iniciarLibroDiario();

function convertirDinero(valor) {
    return "$" + Number(valor || 0).toFixed(2);
}

function centavosADinero(centavos) {
    return convertirDinero(Number(centavos || 0) / 100);
}

function valorACentavos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 0;
    return Math.round(numero * 100);
}

function fechaEsValida(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const partes = fecha.split("-").map(Number);
    const fechaUTC = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));
    return fechaUTC.getUTCFullYear() === partes[0] &&
        fechaUTC.getUTCMonth() === partes[1] - 1 &&
        fechaUTC.getUTCDate() === partes[2];
}

function mostrarFecha(fecha) {
    const partes = String(fecha || "").split("-");
    return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : fecha;
}

function calcularTotal(partida, columna) {
    const centavos = partida.reduce(function(total, linea) {
        return total + valorACentavos(linea[columna]);
    }, 0);
    return centavos / 100;
}

function siguienteIdMovimiento() {
    return movimientos.reduce(function(idMayor, movimiento) {
        return Math.max(idMayor, Number(movimiento.id) || 0);
    }, 0) + 1;
}

function normalizarMovimientoExistente(movimiento) {
    return {
        ...movimiento,
        numero: movimiento.numero || movimiento.referencia || "JE-" + String(movimiento.id).padStart(4, "0"),
        referencia: movimiento.referencia || "",
        concepto: movimiento.concepto || "Partida contable",
        origen: movimiento.origen || "Demostración",
        partida: (movimiento.partida || []).map(function(linea) {
            return {
                ...linea,
                descripcion: linea.descripcion || ""
            };
        })
    };
}

function crearLineasPartida(partida) {
    return partida.map(function(linea) {
        const descripcion = linea.descripcion
            ? `<small>${escaparTexto(linea.descripcion)}</small>`
            : "";

        return `
            <div class="fila-partida">
                <span class="cuenta-detalle">
                    ${escaparTexto(linea.codigo + " - " + linea.cuenta)}
                    ${descripcion}
                </span>
                <span>${convertirDinero(linea.debe)}</span>
                <span>${convertirDinero(linea.haber)}</span>
            </div>
        `;
    }).join("");
}

function crearMovimiento(movimiento) {
    const totalDebe = calcularTotal(movimiento.partida, "debe");
    const totalHaber = calcularTotal(movimiento.partida, "haber");
    const balanceada = Math.abs(totalDebe - totalHaber) < 0.001;
    const puedeEliminar = movimiento.origen === "Manual" || movimiento.origen === "CSV";
    const acciones = puedeEliminar
        ? `
            <div class="acciones-partida-guardada">
                <button class="eliminar-partida" type="button" data-id="${movimiento.id}">
                    Eliminar partida
                </button>
            </div>
        `
        : "";

    return `
        <article class="movimiento">
            <button class="resumen-movimiento" type="button" data-id="${movimiento.id}">
                <span class="concepto">
                    <small>
                        ${escaparTexto(movimiento.numero)} ·
                        ${mostrarFecha(movimiento.fecha)} ·
                        ${escaparTexto(movimiento.referencia || "Sin referencia")} ·
                        ${escaparTexto(movimiento.origen)}
                    </small>
                    <strong>${escaparTexto(movimiento.concepto)}</strong>
                </span>
                <span class="entrada">${convertirDinero(totalDebe)}</span>
                <span class="salida">${convertirDinero(totalHaber)}</span>
                <span class="flecha">▼</span>
            </button>

            <div class="detalle-partida" id="partida-${movimiento.id}">
                <div class="titulo-partida">
                    <h3>${escaparTexto(movimiento.numero)} · Partida doble</h3>
                    <span>${balanceada ? "✓ Balanceada" : "✕ No balanceada"}</span>
                </div>
                <div class="fila-partida titulos-partida">
                    <span>Cuenta</span><span>Debe</span><span>Haber</span>
                </div>
                ${crearLineasPartida(movimiento.partida)}
                <div class="fila-partida total-partida">
                    <span>Total</span>
                    <span>${convertirDinero(totalDebe)}</span>
                    <span>${convertirDinero(totalHaber)}</span>
                </div>
                ${acciones}
            </div>
        </article>
    `;
}

function actualizarResumen() {
    let totalDebeCentavos = 0;
    let totalHaberCentavos = 0;
    movimientos.forEach(function(movimiento) {
        totalDebeCentavos += valorACentavos(calcularTotal(movimiento.partida, "debe"));
        totalHaberCentavos += valorACentavos(calcularTotal(movimiento.partida, "haber"));
    });
    document.getElementById("resumen-entradas").textContent = centavosADinero(totalDebeCentavos);
    document.getElementById("resumen-salidas").textContent = centavosADinero(totalHaberCentavos);
    document.getElementById("resumen-neto").textContent = movimientos.length;
}

function filtrarMovimientos() {
    const texto = buscador.value.toLowerCase().trim();
    const origen = filtroTipo.value;

    return movimientos.filter(function(movimiento) {
        const contenido = [
            movimiento.numero,
            movimiento.concepto,
            movimiento.referencia,
            movimiento.origen
        ].join(" ").toLowerCase();
        const coincideTexto = contenido.includes(texto);
        const coincideOrigen = origen === "Todos" || movimiento.origen === origen;
        return coincideTexto && coincideOrigen;
    });
}

function ordenarMovimientos() {
    movimientos.sort(function(a, b) {
        return b.fecha.localeCompare(a.fecha) || Number(b.id) - Number(a.id);
    });
}

function mostrarMovimientos() {
    ordenarMovimientos();
    const filtrados = filtrarMovimientos();
    listaMovimientos.innerHTML = filtrados.map(crearMovimiento).join("");
    sinResultados.style.display = filtrados.length === 0 ? "block" : "none";
    actualizarResumen();
    activarAcordeones();
}

function activarAcordeones() {
    document.querySelectorAll(".resumen-movimiento").forEach(function(boton) {
        boton.addEventListener("click", function() {
            const detalle = document.getElementById("partida-" + boton.dataset.id);
            const flecha = boton.querySelector(".flecha");
            detalle.classList.toggle("abierto");
            flecha.textContent = detalle.classList.contains("abierto") ? "▲" : "▼";
        });
    });

    document.querySelectorAll(".eliminar-partida").forEach(function(boton) {
        boton.addEventListener("click", eliminarPartida);
    });
}

async function eliminarPartida(evento) {
    const id = Number(evento.currentTarget.dataset.id);
    const movimiento = movimientos.find(function(item) {
        return Number(item.id) === id;
    });
    if (!movimiento) return;
    const confirmada = window.confirm(
        "¿Eliminar la partida " + movimiento.numero + "?\n\n" +
        "Esta acción retirará la partida del Libro Diario."
    );
    if (!confirmada) return;
    try {
        await eliminarMovimientoBD(id);
        const verificacion = await obtenerMovimientoBD(id);
        if (verificacion) throw new Error("La partida continúa almacenada.");
        await publicarEventoContable(
            TIPOS_EVENTOS.PARTIDA_ELIMINADA,
            "movimiento",
            movimiento.id,
            {
                numero: movimiento.numero,
                fecha: movimiento.fecha
            }
        );
        const posicion = movimientos.findIndex(function(item) {
            return Number(item.id) === id;
        });
        if (posicion !== -1) movimientos.splice(posicion, 1);
        mostrarMovimientos();
    } catch (error) {
        window.alert("No fue posible eliminar la partida: " + error.message);
    }
}

async function cargarJSON(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error("No se pudo cargar " + ruta);
    return respuesta.json();
}

async function prepararCuentas() {
    let cuentas = await obtenerCuentasBD();
    const cuentasIniciales = await cargarJSON("datos/catalogo_cuentas.json");

    if (!Array.isArray(cuentasIniciales)) {
        throw new Error("El catálogo inicial no contiene una lista válida.");
    }
    if (cuentas.length === 0) {
        cuentas = cuentasIniciales;
        await guardarCuentasBD(cuentas);
    } else {
        const codigosGuardados = new Set(cuentas.map(function(cuenta) {
            return cuenta.codigo;
        }));
        const cuentasFaltantes = cuentasIniciales.filter(function(cuenta) {
            return !codigosGuardados.has(cuenta.codigo);
        });

        if (cuentasFaltantes.length > 0) {
            await guardarCuentasBD(cuentasFaltantes);
            cuentas = cuentas.concat(cuentasFaltantes);
        }
    }

    cuentasDisponibles = cuentas
        .filter(function(cuenta) { return cuenta.permiteMovimientos; })
        .sort(function(a, b) { return a.codigo.localeCompare(b.codigo); });
}

async function prepararMovimientos() {
    let guardados = await obtenerMovimientosBD();

    if (guardados.length === 0) {
        guardados = await cargarJSON("datos/movimientos_iniciales.json");
        guardados = guardados.map(normalizarMovimientoExistente);
        await guardarMovimientosBD(guardados);
    } else {
        guardados = guardados.map(normalizarMovimientoExistente);
    }

    sincronizarMovimientos(guardados);
}

function opcionesCuentas(codigoSeleccionado) {
    const opciones = cuentasDisponibles.map(function(cuenta) {
        const seleccionada = cuenta.codigo === codigoSeleccionado ? "selected" : "";
        return `<option value="${cuenta.codigo}" ${seleccionada}>${cuenta.codigo} - ${escaparTexto(cuenta.nombre)}</option>`;
    }).join("");

    return '<option value="">Seleccionar cuenta</option>' + opciones;
}

function agregarLineaFormulario(linea) {
    contadorFilas++;
    const datos = linea || {};
    const fila = document.createElement("tr");
    fila.dataset.fila = contadorFilas;
    fila.innerHTML = `
        <td class="numero-linea"></td>
        <td>
            <select class="linea-cuenta">${opcionesCuentas(datos.codigo || "")}</select>
        </td>
        <td>
            <input class="linea-descripcion" maxlength="100" value="${escaparAtributo(datos.descripcion || "")}" placeholder="Descripción">
        </td>
        <td>
            <input class="linea-debe monto-linea" type="number" min="0" step="0.01" value="${datos.debe || ""}" placeholder="0.00">
        </td>
        <td>
            <input class="linea-haber monto-linea" type="number" min="0" step="0.01" value="${datos.haber || ""}" placeholder="0.00">
        </td>
        <td>
            <button class="eliminar-linea" type="button" title="Eliminar línea">×</button>
        </td>
    `;

    fila.querySelector(".linea-debe").addEventListener("input", function(evento) {
        if (valorACentavos(evento.target.value) > 0) {
            fila.querySelector(".linea-haber").value = "";
        }
        actualizarTotalesFormulario();
    });
    fila.querySelector(".linea-haber").addEventListener("input", function(evento) {
        if (valorACentavos(evento.target.value) > 0) {
            fila.querySelector(".linea-debe").value = "";
        }
        actualizarTotalesFormulario();
    });
    fila.querySelector(".eliminar-linea").addEventListener("click", function() {
        if (cuerpoLineas.querySelectorAll("tr").length <= 2) {
            mostrarErrorFormulario("Una partida debe conservar al menos dos líneas.");
            return;
        }
        fila.remove();
        numerarFilas();
        actualizarTotalesFormulario();
    });

    cuerpoLineas.appendChild(fila);
    numerarFilas();
    actualizarTotalesFormulario();
}

function numerarFilas() {
    cuerpoLineas.querySelectorAll("tr").forEach(function(fila, indice) {
        fila.querySelector(".numero-linea").textContent = indice + 1;
    });
}

function obtenerTotalesFormulario() {
    let debe = 0;
    let haber = 0;

    cuerpoLineas.querySelectorAll("tr").forEach(function(fila) {
        debe += valorACentavos(fila.querySelector(".linea-debe").value);
        haber += valorACentavos(fila.querySelector(".linea-haber").value);
    });

    return { debe: debe, haber: haber, diferencia: debe - haber };
}

function actualizarTotalesFormulario() {
    const totales = obtenerTotalesFormulario();
    totalDebeFormulario.textContent = centavosADinero(totales.debe);
    totalHaberFormulario.textContent = centavosADinero(totales.haber);
    diferenciaFormulario.textContent = centavosADinero(Math.abs(totales.diferencia));

    const balanceada = totales.debe > 0 && totales.diferencia === 0;
    estadoBalance.className = balanceada
        ? "estado-balance balanceada"
        : "estado-balance pendiente";
}

function fechaLocalActual() {
    const ahora = new Date();
    return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
}

function sugerirNumeroPartida() {
    const siguiente = siguienteIdMovimiento();
    return "JE-" + String(siguiente).padStart(4, "0");
}

function reiniciarFormularioPartida() {
    formularioMovimiento.reset();
    cuerpoLineas.innerHTML = "";
    contadorFilas = 0;
    document.getElementById("movimiento-fecha").value = fechaLocalActual();
    document.getElementById("movimiento-numero").value = sugerirNumeroPartida();
    mensajeMovimiento.textContent = "";
    mensajeMovimiento.className = "mensaje-movimiento";
    agregarLineaFormulario();
    agregarLineaFormulario();
}

function abrirFormularioMovimiento() {
    reiniciarFormularioPartida();
    dialogoMovimiento.showModal();
}

function cerrarFormularioMovimiento() {
    dialogoMovimiento.close();
}

function mostrarErrorFormulario(mensaje) {
    mensajeMovimiento.textContent = mensaje;
    mensajeMovimiento.className = "mensaje-movimiento error";
}

```

### FASE 01 — Captura de datos de partida — espejo técnico

**Firmas reales:** `function recibirDatosMovimiento()`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** DOM.

**Complejidad dominante:** `O(n)` respecto al tamaño de la colección recorrida.

**Postcondiciones/retornos observables extraídos:**

```js
return {
```

**Código exacto correspondiente a la fase:**

```js
function recibirDatosMovimiento() {
    actualizarTelemetriaMovimiento("1. Entrada Zero-Trust", "Datos recibidos");
    const lineas = Array.from(cuerpoLineas.querySelectorAll("tr")).map(function(fila) {
        return {
            codigo: String(fila.querySelector(".linea-cuenta").value || "").trim(),
            descripcion: String(fila.querySelector(".linea-descripcion").value || "").trim(),
            debeCentavos: valorACentavos(fila.querySelector(".linea-debe").value),
            haberCentavos: valorACentavos(fila.querySelector(".linea-haber").value)
        };
    });

    return {
        fecha: String(document.getElementById("movimiento-fecha").value || "").trim(),
        numero: String(document.getElementById("movimiento-numero").value || "").trim(),
        referencia: String(document.getElementById("movimiento-referencia").value || "").trim(),
        concepto: String(document.getElementById("movimiento-concepto").value || "").trim(),
        lineas: lineas
    };
}

```

### FASE 02 — Validación de formulario y partida — espejo técnico

**Firmas reales:** `function validarDatosMovimiento(datos)`.

**Formalización de la fase:** `V = estructuraValida ∧ cuentasValidas ∧ ((debe>0) XOR (haber>0)) ∧ Σdebe=Σhaber`; `¬V ⇒ rechazo`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!fechaEsValida(datos.fecha)) {
if (!error && numeroExiste) error = "El número de partida ya existe.";
if (!error && datos.referencia) {
if (referenciaExiste) error = "La referencia ya fue utilizada.";
if (!error && lineasConContenido.length < 2) {
if (!cuenta) {
if (linea.debeCentavos > 0 && linea.haberCentavos > 0) {
if (linea.debeCentavos <= 0 && linea.haberCentavos <= 0) {
if (!error && totalDebe !== totalHaber) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return movimiento.numero.toLowerCase() === datos.numero.toLowerCase();
return movimiento.referencia &&
return linea.codigo || linea.descripcion || linea.debeCentavos || linea.haberCentavos;
return item.codigo === linea.codigo;
return total + linea.debeCentavos;
return total + linea.haberCentavos;
return error;
```

**Código exacto correspondiente a la fase:**

```js
function validarDatosMovimiento(datos) {
    let error = "";
    if (!fechaEsValida(datos.fecha)) {
        error = "Seleccione una fecha válida.";
    } else if (datos.numero.length < 3) {
        error = "Ingrese un número de partida.";
    } else if (datos.concepto.length < 3) {
        error = "El concepto debe contener al menos 3 caracteres.";
    }
    const numeroExiste = movimientos.some(function(movimiento) {
        return movimiento.numero.toLowerCase() === datos.numero.toLowerCase();
    });
    if (!error && numeroExiste) error = "El número de partida ya existe.";
    if (!error && datos.referencia) {
        const referenciaExiste = movimientos.some(function(movimiento) {
            return movimiento.referencia &&
                movimiento.referencia.toLowerCase() === datos.referencia.toLowerCase();
        });
        if (referenciaExiste) error = "La referencia ya fue utilizada.";
    }
    const lineasConContenido = datos.lineas.filter(function(linea) {
        return linea.codigo || linea.descripcion || linea.debeCentavos || linea.haberCentavos;
    });
    if (!error && lineasConContenido.length < 2) {
        error = "La partida debe contener al menos dos líneas.";
    }
    for (let indice = 0; !error && indice < lineasConContenido.length; indice++) {
        const linea = lineasConContenido[indice];
        const cuenta = cuentasDisponibles.find(function(item) {
            return item.codigo === linea.codigo;
        });
        if (!cuenta) {
            error = "Seleccione una cuenta auxiliar válida en la línea " + (indice + 1) + ".";
        }
        if (linea.debeCentavos > 0 && linea.haberCentavos > 0) {
            error = "La línea " + (indice + 1) + " no puede contener Debe y Haber simultáneamente.";
        }
        if (linea.debeCentavos <= 0 && linea.haberCentavos <= 0) {
            error = "Ingrese un valor al Debe o Haber en la línea " + (indice + 1) + ".";
        }
    }
    const totalDebe = lineasConContenido.reduce(function(total, linea) {
        return total + linea.debeCentavos;
    }, 0);
    const totalHaber = lineasConContenido.reduce(function(total, linea) {
        return total + linea.haberCentavos;
    }, 0);

    if (!error && totalDebe !== totalHaber) {
        error = "La partida no está balanceada. La diferencia es " +
            centavosADinero(Math.abs(totalDebe - totalHaber)) + ".";
    }
    actualizarTelemetriaMovimiento(
        "2. Validación",
        error || "Partida aprobada",
        error ? true : undefined
    );
    return error;
}

```

### FASE 03 — Construcción del movimiento persistible — espejo técnico

**Firmas reales:** `function construirNuevoMovimiento(datos)`.

**Formalización de la fase:** `confirmar=false ⇒ Δpersistencia=0`; éxito exige guardar y después verificar identidad/clave del registro.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Postcondiciones/retornos observables extraídos:**

```js
return linea.codigo || linea.descripcion || linea.debeCentavos || linea.haberCentavos;
return item.codigo === linea.codigo;
return {
return movimiento;
```

**Código exacto correspondiente a la fase:**

```js
function construirNuevoMovimiento(datos) {
    const lineas = datos.lineas
        .filter(function(linea) {
            return linea.codigo || linea.descripcion || linea.debeCentavos || linea.haberCentavos;
        })
        .map(function(linea) {
            const cuenta = cuentasDisponibles.find(function(item) {
                return item.codigo === linea.codigo;
            });
            return {
                codigo: cuenta.codigo,
                cuenta: cuenta.nombre,
                descripcion: linea.descripcion,
                debe: linea.debeCentavos / 100,
                haber: linea.haberCentavos / 100
            };
        });

    const movimiento = {
        id: siguienteIdMovimiento(),
        numero: datos.numero,
        fecha: datos.fecha,
        referencia: datos.referencia,
        concepto: datos.concepto,
        origen: "Manual",
        creadoEn: new Date().toISOString(),
        partida: lineas
    };
    actualizarTelemetriaMovimiento("3. Procesamiento", "Partida construida");
    return movimiento;
}

```

### FASE 04 — Validación final y persistencia — espejo técnico

**Firmas reales:** `async function fase4DecidirMovimiento(movimiento)`.

**Formalización de la fase:** `V = estructuraValida ∧ cuentasValidas ∧ ((debe>0) XOR (haber>0)) ∧ Σdebe=Σhaber`; `¬V ⇒ rechazo`.

**Estructuras/tecnicismos reales:** `Map`.

**Complejidad dominante:** `O(n)` respecto al tamaño de la colección recorrida.

**Postcondiciones/retornos observables extraídos:**

```js
return [cuenta.codigo, cuenta];
return true;
```

**Código exacto correspondiente a la fase:**

```js
async function fase4DecidirMovimiento(movimiento) {
    const cuentasPorCodigo = new Map(cuentasDisponibles.map(function(cuenta) {
        return [cuenta.codigo, cuenta];
    }));
    validarPartidaDoble(movimiento, cuentasPorCodigo);
    await guardarMovimientoBD(movimiento);
    actualizarTelemetriaMovimiento("4. Decisión", "Partida almacenada");
    return true;
}

```

### FASE 05 — Verificación persistente, evento y consolidación UI — espejo técnico

**Firmas reales:** `async function fase5VerificarMovimiento(movimiento)`, `async function guardarYVerificarMovimiento(movimiento)`, `async function registrarMovimiento(evento)`, `async function iniciarLibroDiario()`.

**Formalización de la fase:** `confirmar=false ⇒ Δpersistencia=0`; éxito exige guardar y después verificar identidad/clave del registro.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** Costo CPU local cercano a `O(1)` más latencia de I/O/asíncrona determinada por la API externa o el almacenamiento.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!coincide) {
if (error) {
if (accion === "nueva") {
```

**Postcondiciones/retornos observables extraídos:**

```js
return true;
```

**Código exacto correspondiente a la fase:**

```js
async function fase5VerificarMovimiento(movimiento) {
    const verificado = await obtenerMovimientoBD(movimiento.id);
    const coincide = Boolean(verificado) &&
        verificado.numero === movimiento.numero &&
        verificado.fecha === movimiento.fecha &&
        Array.isArray(verificado.partida) &&
        verificado.partida.length === movimiento.partida.length;
    if (!coincide) {
        await eliminarMovimientoBD(movimiento.id);
        actualizarTelemetriaMovimiento("5. Verificación", "Registro revertido", true);
        throw new Error("La partida no pudo verificarse y fue revertida.");
    }
    actualizarTelemetriaMovimiento("5. Verificación", "Partida verificada", false);
    return true;
}

async function guardarYVerificarMovimiento(movimiento) {
    await fase4DecidirMovimiento(movimiento);
    await fase5VerificarMovimiento(movimiento);
    await publicarEventoContable(
        TIPOS_EVENTOS.PARTIDA_REGISTRADA,
        "movimiento",
        movimiento.id,
        {
            numero: movimiento.numero,
            fecha: movimiento.fecha
        }
    );
    return true;
}

async function registrarMovimiento(evento) {
    evento.preventDefault();
    mensajeMovimiento.textContent = "";
    const datos = recibirDatosMovimiento();
    const error = validarDatosMovimiento(datos);
    if (error) {
        mostrarErrorFormulario(error);
        return;
    }

    try {
        const movimiento = construirNuevoMovimiento(datos);
        await guardarYVerificarMovimiento(movimiento);
        movimientos.unshift(movimiento);
        buscador.value = "";
        filtroTipo.value = "Todos";
        mostrarMovimientos();

        const accion = evento.submitter ? evento.submitter.value : "cerrar";
        if (accion === "nueva") {
            reiniciarFormularioPartida();
            mensajeMovimiento.textContent = "Partida guardada correctamente.";
            mensajeMovimiento.className = "mensaje-movimiento correcto";
        } else {
            cerrarFormularioMovimiento();
        }
    } catch (errorGuardado) {
        actualizarTelemetriaMovimiento("F. Recuperación", errorGuardado.message, true);
        mostrarErrorFormulario(errorGuardado.message);
    }
}

async function iniciarLibroDiario() {
    botonAgregar.disabled = true;
    botonImportar.disabled = true;
    try {
        await abrirBaseDatos();
        await prepararCuentas();
        await prepararMovimientos();
        mostrarMovimientos();
        botonAgregar.disabled = false;
        botonImportar.disabled = false;
    } catch (error) {
        listaMovimientos.innerHTML =
            '<p class="error-carga">No se pudieron cargar los datos. Ejecute el proyecto con Live Server.</p>';
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
- **Preservar:** Dos niveles de validación contable.
- **Preservar:** Persistencia antes de mutar memoria.
- **Preservar:** Rollback si lectura posterior no coincide.
- **Preservar:** Importes manejados en centavos durante formulario.

### Contras y tratamiento
- **Contra:** Controlador contiene bastante lógica de UI.
  **Tratamiento/refutación:** Mantener reglas contables críticas en motor_contable; no migrarlas al DOM.
- **Contra:** Verificación compara campos clave y longitud, no deep-equality.
  **Tratamiento/refutación:** Suficiente para contrato actual; ampliar solo si se define una firma canónica completa del movimiento.

## Sintaxis e instrucciones finales de mantenimiento
- Escapa texto/atributos, convierte importes a centavos y valida fechas antes de uso.
- Normaliza strings y convierte debe/haber inmediatamente a centavos mediante valorACentavos.
- Fecha válida, número/concepto mínimos, número/referencia no repetidos, >=2 líneas, cuenta seleccionada/auxiliar, importes válidos y suma Debe=Haber.
- Asume reglas aprobadas; descarta filas totalmente vacías según el mismo criterio del flujo.
- Construye Map cuentasPorCodigo y llama validarPartidaDoble para reconfirmar cuentas/auxiliares/importes/cuadre.
- obtenerMovimientoBD(id) debe coincidir en número, fecha y cantidad de líneas.
- No renombrar funciones públicas, variables globales compartidas ni contratos entre módulos sin revisar consumidores.
- Mantener comentarios de inicio/fin de fase cortos; la explicación detallada permanece en este `.md`.

## Criterio de cierre P3
El objetivo de “contras al 0%” se interpreta como **cero debilidades identificadas sin tratamiento**: corregir, mitigar, documentar como restricción o convertir en prueba obligatoria. No se declara riesgo técnico cero cuando el código conserva un trade-off real.


## Integración de unidades
La captura manual incorpora `tipoInventario`, `sku` y `cantidadInventario` en líneas `1104`. `prepararMovimientoConInventario()` transforma una salida sin importe en una partida valuada antes de `validarPartidaDoble()` y de la persistencia.

## Actualización — Activos fijos y cuentas auxiliares
`prepararCuentas()` mantiene como seleccionables únicamente cuentas con `permiteMovimientos === true`. Para `1201`–`1204`, la captura añade `fechaDisponibleUso` y `valorResidualCentavos`; la descripción de línea identifica el activo. Antes de persistir, `construirNuevoMovimiento()` ejecuta `prepararMovimientoConDepreciacion()`, por lo que una adquisición inválida no llega a IndexedDB.

Invariante adicional:
```text
CuentaSeleccionable ⇔ permiteMovimientos = true
CuentaPPE ⇒ Debe > 0 ∧ FechaUso >= FechaPartida ∧ 0 <= Residual < Costo
```

## Actualización — edición real de partidas persistidas

La interfaz cargada por `index.html` es `js/diario/libro_diario.js`. La edición se implementa directamente en este controlador, no en la copia raíz del archivo. Las partidas de origen `Manual` y `CSV` muestran `Editar partida`; las de origen automático permanecen protegidas.

### Fases A–H de la edición
- **A. Objetivo:** modificar una partida existente sin crear un nuevo `id`.
- **B. Entrada:** `movimientoEditandoId` identifica la partida y el formulario recibe sus valores actuales.
- **C. Validación:** `validarDatosMovimiento()` excluye el propio `id` al comprobar duplicidad de número y referencia.
- **D. Procesamiento:** `construirNuevoMovimiento()` conserva `id`, `origen`, `creadoEn` y `codigoActivo` cuando corresponde.
- **E. Decisión:** `actualizarYVerificarMovimiento()` usa `actualizarMovimientoBD()` (`put`) en lugar de `guardarMovimientoBD()` (`add`).
- **F. Recuperación:** si falla la verificación o la reconstrucción de inventario, se restaura la versión original.
- **G. Verificación:** se relee el movimiento desde IndexedDB y se comprueba número, fecha y cantidad de líneas.
- **H. Telemetría/EDA:** después del commit verificado se publica `TIPOS_EVENTOS.PARTIDA_EDITADA`.

Código crítico:
```js
await actualizarMovimientoBD(movimiento);
const verificado = await obtenerMovimientoBD(movimiento.id);
...
await publicarEventoContable(TIPOS_EVENTOS.PARTIDA_EDITADA, "movimiento", movimiento.id, {
    numero: movimiento.numero,
    fecha: movimiento.fecha
});
```

Invariante:
```text
Edición válida => id_nuevo = id_original ∧ Debe = Haber ∧ persistencia_verificada
```


## Capa de presentación del dashboard

El rediseño visual reutiliza el motor contable existente y no duplica reglas de negocio. `actualizarDashboardContable()` obtiene la balanza y el estado de resultados ya calculados por `generarBalanzaComprobacion()` y `generarEstadoResultados()` para presentar cuentas bancarias/caja, barras de ingresos y gastos y una distribución visual de gastos de los últimos 30 días.

`fechaDashboardDiasAtras()` solo delimita el rango temporal de presentación y `crearGradienteGastosDashboard()` transforma los saldos ya calculados en segmentos visuales; ninguna de estas funciones escribe en IndexedDB ni modifica partidas.

## Afinación octubre 2026
- Se retiró código de dashboard ajeno a la responsabilidad del módulo.
- El módulo queda dedicado a captura/edición de partidas y actualización de sus proyecciones.
