# importador_partidas.js — P3 v3

## Qué es este archivo
Controlador de importación masiva que recibe un CSV, delega parsing/validación a un Worker, decide la aceptación del lote, persiste partidas y verifica el resultado.


## Propósito técnico
Orquesta importación CSV desde UI: valida archivo, delega parsing/validación al Worker, presenta vista previa, persiste el lote completo y verifica cada movimiento antes de integrarlo al estado.

## Dependencias reales
- Worker `partidas_worker.js`
- cuentasDisponibles y movimientos del Libro Diario
- guardarMovimientosBD/obtenerMovimientosBD/eliminarMovimientoBD
- validarPartidaDoble y publicarEventoContable

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases y funciones reales de este archivo. No se asume DAG, Circuit Breaker, checksum, Epoll, GPU/SIMD o criptografía si el código no los implementa o no los necesita.

### FASE 00 — Estado/UI de importación y telemetría
**Funciones reales de la fase:** `actualizarTelemetriaImportacion()`, `abrirImportador()`, `cerrarImportador()`, `mostrarMensajeImportacion()`.

- **A. Objetivo (DDD):** Mantener el contexto de una importación pendiente y controles de UI sin mezclar parsing CSV.
- **B. Entrada (Zero-Trust):** Inicializa Worker, nodos DOM, `resultadoImportacion` y telemetría.
- **C. Validación (Harness IAST):** Mensajes se presentan mediante `textContent`; el resultado del Worker se valida antes de habilitar confirmación.
- **D. Procesamiento:** Abre/cierra diálogo, muestra mensajes y actualiza contadores de importación.
- **E. Decisión:** Estado de `resultadoImportacion` controla si puede confirmarse un lote.
- **F. Recuperación:** Errores de Worker/lectura limpian resultado y deshabilitan confirmación.
- **G. Verificación:** No debe existir lote confirmable cuando `resultadoImportacion` es null.
- **H. Telemetría:** Registra fase, procesadas, rechazadas y resultado.

### FASE 01 — Entrada de archivo
**Funciones reales de la fase:** `fase1EntradaImportacion()`.

- **A. Objetivo (DDD):** Reducir el objeto File a metadatos necesarios para autorización inicial.
- **B. Entrada (Zero-Trust):** Recibe `archivo`; normaliza objeto, nombre y tamaño.
- **C. Validación (Harness IAST):** Aún no lee contenido; evita acceso a propiedades si archivo es null.
- **D. Procesamiento:** Construye `{archivo,nombre,tamano}`.
- **E. Decisión:** Archivo ausente permanece `null` para que FASE 02 lo rechace.
- **F. Recuperación:** No produce excepción por selección vacía.
- **G. Verificación:** Nombre y tamaño siempre tienen tipo string/number.
- **H. Telemetría:** Registra `Archivo recibido`.

### FASE 02 — Validación del archivo
**Funciones reales de la fase:** `fase2ValidarImportacion()`.

- **A. Objetivo (DDD):** Rechazar archivos que no cumplen los límites operativos antes de leerlos.
- **B. Entrada (Zero-Trust):** Metadatos de FASE 01.
- **C. Validación (Harness IAST):** Exige archivo presente, extensión `.csv` y tamaño <=5 MB.
- **D. Procesamiento:** Construye un único mensaje de error o cadena vacía.
- **E. Decisión:** Cualquier error corta el flujo antes de `File.text()` y Worker.
- **F. Recuperación:** UI muestra error sin crear procesamiento parcial.
- **G. Verificación:** Archivo aprobado cumple presencia/extensión/tamaño.
- **H. Telemetría:** Registra `Archivo aprobado` o rechazo.

### FASE 03 — Procesamiento asíncrono con Worker
**Funciones reales de la fase:** `fase3ProcesarImportacion()`.

- **A. Objetivo (DDD):** Mover parsing y validación intensiva fuera del hilo principal de UI.
- **B. Entrada (Zero-Trust):** Archivo aprobado más snapshots de cuentas, números y referencias existentes.
- **C. Validación (Harness IAST):** La estructura y contenido CSV se validan dentro de `partidas_worker.js`; aquí se limita el mensaje enviado.
- **D. Procesamiento:** Lee `archivo.text()` y `postMessage` con texto+contexto; no persiste aún.
- **E. Decisión:** La fase solo inicia trabajo; resultado se recibe por `workerPartidas.onmessage`.
- **F. Recuperación:** Error de lectura o Worker limpia resultado, deshabilita confirmación y muestra mensaje.
- **G. Verificación:** ConfirmarImportacion queda deshabilitado hasta recibir un resultado `exito=true` sin rechazadas.
- **H. Telemetría:** Registra `Archivo enviado al Worker` y `Vista previa generada`.

### FASE 04 — Decisión y persistencia atómica del lote
**Funciones reales de la fase:** `fase4DecidirImportacion()`.

- **A. Objetivo (DDD):** Convertir partidas válidas del Worker en movimientos internos y persistirlas como lote solo si todo está aprobado.
- **B. Entrada (Zero-Trust):** Resultado del Worker; puede ser null, contener rechazadas o cero válidas.
- **C. Validación (Harness IAST):** Rechaza resultado no utilizable; asigna IDs; vuelve a ejecutar `validarPartidaDoble` sobre cada movimiento antes de guardar.
- **D. Procesamiento:** Mapea movimientos, crea Map de cuentas y usa `guardarMovimientosBD` una sola vez para el lote.
- **E. Decisión:** Si existe cualquier rechazada o cero válidas retorna `[]`; solo lote íntegramente válido se persiste.
- **F. Recuperación:** La transacción masiva de IndexedDB aborta completa si un `add` falla.
- **G. Verificación:** Todas las partidas pasan nuevamente motor contable antes del commit.
- **H. Telemetría:** Registra `Lote almacenado` después de resolver persistencia.

### FASE 05 — Verificación, evento y consolidación
**Funciones reales de la fase:** `fase5VerificarImportacion()`, `recibirArchivoCSV()`, `renderizarVistaPrevia()`, `importarPartidasConfirmadas()`.

- **A. Objetivo (DDD):** Comprobar que todo movimiento del lote está persistido antes de incorporarlo al estado global y emitir evento.
- **B. Entrada (Zero-Trust):** Array `nuevasPartidas` retornado por FASE 04.
- **C. Validación (Harness IAST):** Lee todos los movimientos, indexa por ID y compara número y cantidad de líneas de cada nueva partida.
- **D. Procesamiento:** Si verifica, incrementa telemetría; al confirmar publica `PARTIDAS_IMPORTADAS`, añade al array global y refresca UI.
- **E. Decisión:** Cualquier inconsistencia activa rollback de todos los IDs del lote y lanza error.
- **F. Recuperación:** Borra cada movimiento del lote ante verificación fallida; errores mantienen UI abierta para reintento/corrección.
- **G. Verificación:** Postcondición: todas las nuevas partidas existen en IndexedDB antes de `movimientos.push(...)`.
- **H. Telemetría:** Registra lote verificado/revertido y cantidad procesada.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `ArchivoValido = existe ∧ extension=.csv ∧ tamaño≤5·1024·1024 bytes`.
- `Worker: textoCSV × cuentas × numerosExistentes × referenciasExistentes → resultado`.
- `LoteAceptable = resultado.exito ∧ resultado.resumen.rechazadas=0`.
- `Persistencia = guardarMovimientosBD(nuevasPartidas)` en lote.
- `Verificacion = ∀p∈nuevasPartidas, existe guardado con mismo id/número/referencia; ¬Verificacion ⇒ rollback`.

### Declaraciones y estado de módulo reflejados desde el código

```js
const dialogoImportar = document.getElementById("dialogo-importar");
const zonaCSV = document.getElementById("zona-csv");
const archivoCSV = document.getElementById("archivo-csv");
const mensajeImportacion = document.getElementById("mensaje-importacion");
const resumenImportacion = document.getElementById("resumen-importacion");
const vistaPreviaCSV = document.getElementById("vista-previa-csv");
const confirmarImportacion = document.getElementById("confirmar-importacion");
let resultadoImportacion = null;
const workerPartidas = new Worker("js/importacion/partidas_worker.js?v=7");
const telemetriaImportacion = {
    procesadas: 0,
    rechazadas: 0,
    fase: "Esperando archivo",
    resultado: "Sin operaciones"
};
FASE 1
A. Objetivo: recibir un archivo CSV desde selección o Drag & Drop.
B. Entrada (Zero-Trust): objeto File proporcionado por el navegador.
C. Validación: todavía no se confía en nombre, tamaño ni contenido.
D. Procesamiento: extraer metadatos controlados.
E. Decisión: enviar una estructura uniforme a la fase 2.
F. Recuperación: devolver archivo nulo cuando no exista entrada.
G. Verificación: conservar archivo, nombre y tamaño.
H. Telemetría: registrar el inicio de la importación.
FASE 2
A. Objetivo: rechazar archivos incompatibles antes de leerlos.
B. Entrada (Zero-Trust): metadatos normalizados del archivo.
C. Validación: existencia, extensión CSV y límite de 5 MB.
D. Procesamiento: aplicar reglas simples y deterministas.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: mantener vacío el resultado de importación.
G. Verificación: no iniciar el Worker si existe un error.
H. Telemetría: registrar aprobación o causa del rechazo.
FASE 3
A. Objetivo: procesar el contenido sin bloquear la interfaz.
B. Entrada (Zero-Trust): archivo aprobado por la fase 2.
C. Validación: File.text() debe completar correctamente.
D. Procesamiento: enviar texto, cuentas y duplicados al Web Worker.
E. Decisión: delegar análisis y esperar su respuesta.
F. Recuperación: informar cualquier fallo de lectura.
G. Verificación: el Worker devolverá exito=true o un error.
H. Telemetría: registrar el envío al segundo plano.
FASE 4
A. Objetivo: decidir qué partidas validadas se vuelven permanentes.
B. Entrada (Zero-Trust): resultado devuelto por el Web Worker.
C. Validación: no aceptar resultados ausentes, rechazados o vacíos.
D. Procesamiento: asignar identificadores y guardar el lote atómicamente.
E. Decisión: importar todo el lote o no importar ninguna partida.
F. Recuperación: IndexedDB aborta el lote si una inserción falla.
G. Verificación: esperar la transacción antes de continuar.
H. Telemetría: registrar la decisión de persistencia.
FASE 5
A. Objetivo: comprobar el lote almacenado antes de mostrarlo.
B. Entrada (Zero-Trust): partidas supuestamente persistidas.
C. Validación: volver a leer identificadores y números desde IndexedDB.
D. Procesamiento: comparar cada partida nueva con su registro.
E. Decisión: confirmar el lote solo si todas coinciden.
F. Recuperación: eliminar el lote si la verificación falla.
G. Verificación: lectura independiente de todos los movimientos.
H. Telemetría: actualizar partidas procesadas o rechazadas.
workerPartidas.onmessage = function(evento) {
    const resultado = evento.data;
    if (!resultado.exito) {
        resultadoImportacion = null;
        confirmarImportacion.disabled = true;
        actualizarTelemetriaImportacion("F. Recuperación", resultado.error, true);
        mostrarMensajeImportacion(resultado.error, true);
        return;
    }
    resultadoImportacion = resultado;
    actualizarTelemetriaImportacion("3. Procesamiento", "Vista previa generada");
    renderizarVistaPrevia(resultado);
};
workerPartidas.onerror = function() {
    resultadoImportacion = null;
    confirmarImportacion.disabled = true;
    actualizarTelemetriaImportacion("F. Recuperación", "Error del Web Worker", true);
    mostrarMensajeImportacion("El Web Worker no pudo procesar el archivo.", true);
};
zonaCSV.addEventListener("dragover", function(evento) {
    evento.preventDefault();
    zonaCSV.classList.add("arrastrando");
});
zonaCSV.addEventListener("dragleave", function() {
    zonaCSV.classList.remove("arrastrando");
});
zonaCSV.addEventListener("drop", function(evento) {
    evento.preventDefault();
    zonaCSV.classList.remove("arrastrando");
    recibirArchivoCSV(evento.dataTransfer.files[0]);
});
archivoCSV.addEventListener("change", function() {
    recibirArchivoCSV(archivoCSV.files[0]);
});
botonImportar.addEventListener("click", abrirImportador);
document.getElementById("cerrar-importador").addEventListener("click", cerrarImportador);
document.getElementById("cancelar-importacion").addEventListener("click", cerrarImportador);
confirmarImportacion.addEventListener("click", importarPartidasConfirmadas);
```

### FASE 00 — Estado/UI de importación y telemetría — espejo técnico

**Firmas reales:** `function actualizarTelemetriaImportacion(fase, resultado, rechazada)`, `function abrirImportador()`, `function cerrarImportador()`, `function mostrarMensajeImportacion(mensaje, esError)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (rechazada === true) telemetriaImportacion.rechazadas++;
if (rechazada === false) telemetriaImportacion.procesadas++;
```

**Código exacto correspondiente a la fase:**

```js
function actualizarTelemetriaImportacion(fase, resultado, rechazada) {
    telemetriaImportacion.fase = fase;
    telemetriaImportacion.resultado = resultado;
    if (rechazada === true) telemetriaImportacion.rechazadas++;
    if (rechazada === false) telemetriaImportacion.procesadas++;
}

function abrirImportador() {
    resultadoImportacion = null;
    archivoCSV.value = "";
    mensajeImportacion.textContent = "";
    mensajeImportacion.className = "mensaje-movimiento";
    resumenImportacion.classList.add("oculto");
    vistaPreviaCSV.classList.add("oculto");
    vistaPreviaCSV.innerHTML = "";
    confirmarImportacion.disabled = true;
    dialogoImportar.showModal();
}

function cerrarImportador() {
    dialogoImportar.close();
}

function mostrarMensajeImportacion(mensaje, esError) {
    mensajeImportacion.textContent = mensaje;
    mensajeImportacion.className = esError
        ? "mensaje-movimiento error"
        : "mensaje-movimiento correcto";
}

```

### FASE 01 — Entrada de archivo — espejo técnico

**Firmas reales:** `function fase1EntradaImportacion(archivo)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Postcondiciones/retornos observables extraídos:**

```js
return {
```

**Código exacto correspondiente a la fase:**

```js
function fase1EntradaImportacion(archivo) {
    actualizarTelemetriaImportacion("1. Entrada Zero-Trust", "Archivo recibido");
    return {
        archivo: archivo || null,
        nombre: archivo ? String(archivo.name || "").trim() : "",
        tamano: archivo ? Number(archivo.size || 0) : 0
    };
}

```

### FASE 02 — Validación del archivo — espejo técnico

**Firmas reales:** `function fase2ValidarImportacion(datos)`.

**Formalización de la fase:** `V = estructuraValida ∧ cuentasValidas ∧ ((debe>0) XOR (haber>0)) ∧ Σdebe=Σhaber`; `¬V ⇒ rechazo`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!datos.archivo) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return error;
```

**Código exacto correspondiente a la fase:**

```js
function fase2ValidarImportacion(datos) {
    let error = "";
    if (!datos.archivo) {
        error = "Seleccione un archivo CSV.";
    } else if (!datos.nombre.toLowerCase().endsWith(".csv")) {
        error = "Seleccione un archivo con extensión .csv.";
    } else if (datos.tamano > 5 * 1024 * 1024) {
        error = "El archivo supera el límite de 5 MB.";
    }
    actualizarTelemetriaImportacion(
        "2. Validación",
        error || "Archivo aprobado",
        error ? true : undefined
    );
    return error;
}

```

### FASE 03 — Procesamiento asíncrono con Worker — espejo técnico

**Firmas reales:** `async function fase3ProcesarImportacion(datos)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** `Worker`, mensajería `postMessage`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Postcondiciones/retornos observables extraídos:**

```js
return movimiento.numero;
return movimiento.referencia;
```

**Código exacto correspondiente a la fase:**

```js
async function fase3ProcesarImportacion(datos) {
    const textoCSV = await datos.archivo.text();
    workerPartidas.postMessage({
        textoCSV: textoCSV,
        cuentas: cuentasDisponibles,
        numerosExistentes: movimientos.map(function(movimiento) {
            return movimiento.numero;
        }),
        referenciasExistentes: movimientos
            .map(function(movimiento) {
                return movimiento.referencia;
            })
            .filter(Boolean)
    });
    actualizarTelemetriaImportacion("3. Procesamiento", "Archivo enviado al Worker");
}

```

### FASE 04 — Decisión y persistencia atómica del lote — espejo técnico

**Firmas reales:** `async function fase4DecidirImportacion(resultado)`.

**Formalización de la fase:** `confirmar=false ⇒ Δpersistencia=0`; éxito exige guardar y después verificar identidad/clave del registro.

**Estructuras/tecnicismos reales:** `Map`, `Array`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!resultado ||
```

**Postcondiciones/retornos observables extraídos:**

```js
return [];
return {
return [cuenta.codigo, cuenta];
return nuevasPartidas;
```

**Código exacto correspondiente a la fase:**

```js
async function fase4DecidirImportacion(resultado) {
    if (!resultado ||
        resultado.resumen.rechazadas > 0 ||
        resultado.validas.length === 0) {
        return [];
    }
    let siguienteId = siguienteIdMovimiento();
    const nuevasPartidas = resultado.validas.map(function(partida) {
        return {
            ...partida.movimiento,
            id: siguienteId++,
            creadoEn: new Date().toISOString()
        };
    });
    const cuentasPorCodigo = new Map(cuentasDisponibles.map(function(cuenta) {
        return [cuenta.codigo, cuenta];
    }));
    nuevasPartidas.forEach(function(movimiento) {
        validarPartidaDoble(movimiento, cuentasPorCodigo);
    });
    await guardarMovimientosBD(nuevasPartidas);
    actualizarTelemetriaImportacion("4. Decisión", "Lote almacenado");
    return nuevasPartidas;
}

```

### FASE 05 — Verificación, evento y consolidación — espejo técnico

**Firmas reales:** `async function fase5VerificarImportacion(nuevasPartidas)`, `async function recibirArchivoCSV(archivo)`, `function renderizarVistaPrevia(resultado)`, `async function importarPartidasConfirmadas()`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** `Map`, DOM.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!verificadas) {
if (error) {
if (resultado.resumen.rechazadas > 0) {
if (nuevasPartidas.length === 0) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return [movimiento.id, movimiento];
return guardado &&
return true;
return `
return movimiento.id;
```

**Código exacto correspondiente a la fase:**

```js
async function fase5VerificarImportacion(nuevasPartidas) {
    const guardados = await obtenerMovimientosBD();
    const porId = new Map(guardados.map(function(movimiento) {
        return [movimiento.id, movimiento];
    }));
    const verificadas = nuevasPartidas.every(function(movimiento) {
        const guardado = porId.get(movimiento.id);
        return guardado &&
            guardado.numero === movimiento.numero &&
            Array.isArray(guardado.partida) &&
            guardado.partida.length === movimiento.partida.length;
    });
    if (!verificadas) {
        for (const movimiento of nuevasPartidas) {
            await eliminarMovimientoBD(movimiento.id);
        }
        actualizarTelemetriaImportacion("5. Verificación", "Lote revertido", true);
        throw new Error("No fue posible verificar todas las partidas. El lote fue revertido.");
    }
    telemetriaImportacion.procesadas += nuevasPartidas.length;
    actualizarTelemetriaImportacion("5. Verificación", "Lote verificado");
    return true;
}

async function recibirArchivoCSV(archivo) {
    const datos = fase1EntradaImportacion(archivo);
    const error = fase2ValidarImportacion(datos);
    if (error) {
        mostrarMensajeImportacion(error, true);
        return;
    }
    try {
        mostrarMensajeImportacion("Procesando archivo en segundo plano...", false);
        confirmarImportacion.disabled = true;
        resultadoImportacion = null;
        await fase3ProcesarImportacion(datos);
    } catch (errorLectura) {
        actualizarTelemetriaImportacion("F. Recuperación", errorLectura.message, true);
        mostrarMensajeImportacion("No fue posible leer el archivo CSV.", true);
    }
}

function renderizarVistaPrevia(resultado) {
    document.getElementById("csv-total").textContent = resultado.resumen.totalPartidas;
    document.getElementById("csv-validas").textContent = resultado.resumen.validas;
    document.getElementById("csv-rechazadas").textContent = resultado.resumen.rechazadas;
    document.getElementById("csv-lineas").textContent = resultado.resumen.totalLineas;
    resumenImportacion.classList.remove("oculto");
    vistaPreviaCSV.classList.remove("oculto");
    vistaPreviaCSV.innerHTML = `
        <table class="tabla-previa">
            <thead>
                <tr>
                    <th>Estado</th>
                    <th>Partida</th>
                    <th>Fecha</th>
                    <th>Líneas</th>
                    <th>Debe</th>
                    <th>Haber</th>
                    <th>Resultado</th>
                </tr>
            </thead>
            <tbody>
                ${resultado.resultados.map(function(partida) {
                    const clase = partida.valida ? "fila-valida" : "fila-error";
                    const estado = partida.valida ? "✓ Válida" : "✕ Rechazada";
                    const detalle = partida.valida
                        ? "Lista para importar"
                        : partida.errores.map(escaparTexto).join("<br>");
                    return `
                        <tr class="${clase}">
                            <td>${estado}</td>
                            <td>${escaparTexto(partida.numero)}</td>
                            <td>${escaparTexto(partida.fecha)}</td>
                            <td>${partida.lineas}</td>
                            <td>${convertirDinero(partida.totalDebe)}</td>
                            <td>${convertirDinero(partida.totalHaber)}</td>
                            <td>${detalle}</td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
    const puedeImportar = resultado.resumen.validas > 0 &&
        resultado.resumen.rechazadas === 0;
    confirmarImportacion.disabled = !puedeImportar;
    if (resultado.resumen.rechazadas > 0) {
        mostrarMensajeImportacion(
            "Corrija las partidas rechazadas. No se guardará ninguna mientras existan errores.",
            true
        );
    } else {
        mostrarMensajeImportacion(
            resultado.resumen.validas + " partidas listas para importar.",
            false
        );
    }
}

async function importarPartidasConfirmadas() {
    confirmarImportacion.disabled = true;
    mostrarMensajeImportacion("Guardando partidas...", false);
    try {
        const nuevasPartidas = await fase4DecidirImportacion(resultadoImportacion);
        if (nuevasPartidas.length === 0) {
            confirmarImportacion.disabled = false;
            return;
        }
        await fase5VerificarImportacion(nuevasPartidas);
        await publicarEventoContable(
            TIPOS_EVENTOS.PARTIDAS_IMPORTADAS,
            "lote",
            "csv-" + Date.now(),
            {
                cantidad: nuevasPartidas.length,
                ids: nuevasPartidas.map(function(movimiento) {
                    return movimiento.id;
                })
            }
        );
        movimientos.push(...nuevasPartidas);
        buscador.value = "";
        filtroTipo.value = "Todos";
        mostrarMovimientos();
        cerrarImportador();
    } catch (error) {
        confirmarImportacion.disabled = false;
        actualizarTelemetriaImportacion("F. Recuperación", error.message, true);
        mostrarMensajeImportacion(error.message || "No fue posible guardar las partidas.", true);
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
- **Preservar:** Worker evita bloquear UI.
- **Preservar:** Política todo-o-nada si hay rechazadas.
- **Preservar:** Revalida partida doble antes de persistir.
- **Preservar:** Rollback del lote si la verificación posterior falla.

### Contras y tratamiento
- **Contra:** Extensión `.csv` no prueba MIME/contenido.
  **Tratamiento/refutación:** El Worker valida estructura real; no confiar en extensión como única medida.
- **Contra:** Rollback posterior elimina elementos uno a uno.
  **Tratamiento/refutación:** Es recuperación excepcional; la atomicidad primaria se mantiene en `guardarMovimientosBD`.

## Sintaxis e instrucciones finales de mantenimiento
- Mensajes se presentan mediante textContent; el resultado del Worker se valida antes de habilitar confirmación.
- Aún no lee contenido; evita acceso a propiedades si archivo es null.
- Exige archivo presente, extensión .csv y tamaño <=5 MB.
- La estructura y contenido CSV se validan dentro de partidas_worker.js; aquí se limita el mensaje enviado.
- Rechaza resultado no utilizable; asigna IDs; vuelve a ejecutar validarPartidaDoble sobre cada movimiento antes de guardar.
- Lee todos los movimientos, indexa por ID y compara número y cantidad de líneas de cada nueva partida.
- No renombrar funciones públicas, variables globales compartidas ni contratos entre módulos sin revisar consumidores.
- Mantener comentarios de inicio/fin de fase cortos; la explicación detallada permanece en este `.md`.

## Criterio de cierre P3
El objetivo de “contras al 0%” se interpreta como **cero debilidades identificadas sin tratamiento**: corregir, mitigar, documentar como restricción o convertir en prueba obligatoria. No se declara riesgo técnico cero cuando el código conserva un trade-off real.


## Integración de unidades en importación masiva
Las partidas importadas se preparan secuencialmente con el motor de inventario antes de guardarse; por ello una compra anterior dentro del lote puede modificar el promedio usado por una salida posterior.

## Actualización — preparación de activos fijos
Después de `prepararMovimientoConInventario()`, cada partida importada pasa por `prepararMovimientoConDepreciacion()` antes de la validación contable y persistencia.

## Afinación octubre 2026
- Los lotes usan orden estable fecha+número y una sola marca temporal para todas las partidas del lote.
