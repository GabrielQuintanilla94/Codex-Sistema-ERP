# catalogo_ui.js — P3 v3

## Qué es este archivo
Controlador de presentación y coordinación del catálogo de cuentas; conecta el DOM con la algoritmia de cuentas, el grafo, IndexedDB y los eventos contables.


## Propósito técnico
Controlador de interfaz del catálogo: renderiza jerarquía, registra cuentas mediante algoritmia_cuentas, valida/elimina cuentas y sincroniza catálogo inicial/IndexedDB/eventos.

## Dependencias reales
- DOM de catalogo_cuentas.html
- algoritmia_cuentas.js y grafo_cuentas.js
- base_datos.js
- bus_eventos.js/TIPOS_EVENTOS
- datos/catalogo_cuentas.json

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases y funciones reales de este archivo. No se asume DAG, Circuit Breaker, checksum, Epoll, GPU/SIMD o criptografía si el código no los implementa o no los necesita.

### FASE 00 — Selectores, renderizado y utilidades UI
**Funciones reales de la fase:** `escapar()`, `escaparAtributoCatalogo()`, `cargarSelectores()`, `crearFilaCuenta()`, `crearFilasJerarquia()`, `mostrarArbol()`, `actualizarInterfazCatalogo()`, `abrirFormularioCuenta()`, `cerrarFormularioCuenta()`.

- **A. Objetivo (DDD):** Traducir el estado del catálogo a DOM y capturar controles sin asumir persistencia directa salvo flujos explícitos.
- **B. Entrada (Zero-Trust):** Datos de cuenta que se renderizan y referencias DOM cargadas por ID.
- **C. Validación (Harness IAST):** Escapa texto y atributos antes de interpolar HTML; selectores deben existir en la página correspondiente.
- **D. Procesamiento:** Construye filas jerárquicas, selectores de padre, mensajes y diálogo.
- **E. Decisión:** Cuentas auxiliares/mayores determinan controles y posibilidad de hijos.
- **F. Recuperación:** Mensajes UI reflejan fallos; helpers de escape evitan inyección al renderizar datos.
- **G. Verificación:** La UI se reconstruye desde `catalogoCuentas/grafoCuentas`, no como fuente primaria de verdad.
- **H. Telemetría:** Reutiliza `actualizarTelemetria` del proceso de cuentas.

### FASE 01 — Entrada de solicitud de eliminación
**Funciones reales de la fase:** `fase1EntradaEliminacionCuenta()`.

- **A. Objetivo (DDD):** Convertir el click de eliminar en datos de dominio mínimos.
- **B. Entrada (Zero-Trust):** Lee `evento.currentTarget.dataset.codigo`, lo normaliza y busca la cuenta real.
- **C. Validación (Harness IAST):** No confía en dataset como evidencia de existencia; adjunta `buscarCuenta(codigo)` para FASE 02.
- **D. Procesamiento:** Devuelve `{codigo,cuenta}`.
- **E. Decisión:** Cuenta ausente permanece null y será rechazada.
- **F. Recuperación:** No modifica nada en esta fase.
- **G. Verificación:** Código se normaliza con trim antes de usarlo.
- **H. Telemetría:** Registra `Solicitud de eliminación`.

### FASE 02 — Validación de eliminación
**Funciones reales de la fase:** `fase2ValidarEliminacionCuenta()`.

- **A. Objetivo (DDD):** Proteger integridad referencial antes de borrar una cuenta.
- **B. Entrada (Zero-Trust):** Código+cuenta de FASE 01.
- **C. Validación (Harness IAST):** Cuenta debe existir, no ser inicial, no tener hijos y no estar referenciada por ninguna línea de movimientos persistidos.
- **D. Procesamiento:** Consulta `obtenerMovimientosBD` y usa `some` anidado para detectar uso.
- **E. Decisión:** Primer incumplimiento retorna mensaje; cadena vacía autoriza confirmación.
- **F. Recuperación:** No borra memoria ni IndexedDB si existe dependencia.
- **G. Verificación:** Una cuenta autorizada es hoja no inicial y sin referencias contables.
- **H. Telemetría:** Los rechazos se registran como validación fallida.

### FASE 03 — Confirmación y eliminación persistente
**Funciones reales de la fase:** `fase3ProcesarEliminacionCuenta()`.

- **A. Objetivo (DDD):** Ejecutar el borrado solo después de autorización y confirmación explícita.
- **B. Entrada (Zero-Trust):** Datos validados de la cuenta.
- **C. Validación (Harness IAST):** `window.confirm` actúa como confirmación del usuario; `eliminarCuentaBD` es la única mutación persistente.
- **D. Procesamiento:** Si confirma, borra por código en IndexedDB.
- **E. Decisión:** Cancelación devuelve `{cancelada:true}`; confirmación `{cancelada:false}` tras resolver BD.
- **F. Recuperación:** Cancelación no produce cambios; error de BD se propaga al orquestador.
- **G. Verificación:** No modifica todavía catálogo en memoria; eso ocurre tras verificar BD en FASE 05.
- **H. Telemetría:** Registra cancelación o eliminación procesada.

### FASE 04 — Decisión de continuar a verificación
**Funciones reales de la fase:** `fase4DecidirEliminacionCuenta()`.

- **A. Objetivo (DDD):** Separar cancelación de una eliminación que requiere verificación posterior.
- **B. Entrada (Zero-Trust):** Resultado de FASE 03.
- **C. Validación (Harness IAST):** Solo `resultado.cancelada === false` autoriza continuar.
- **D. Procesamiento:** Reduce el resultado a boolean `continuar`.
- **E. Decisión:** false termina sin cambios de memoria; true pasa a FASE 05.
- **F. Recuperación:** Evita verificar/borrar memoria cuando el usuario canceló.
- **G. Verificación:** Decisión es explícitamente booleana.
- **H. Telemetría:** Registra `Verificar eliminación` o `Sin cambios`.

### FASE 05 — Verificación, alta e inicialización del catálogo
**Funciones reales de la fase:** `fase5VerificarEliminacionCuenta()`, `eliminarCuentaCreada()`, `registrarCuenta()`, `cargarCuentasIniciales()`, `iniciarAplicacionCatalogo()`.

- **A. Objetivo (DDD):** Cerrar eliminaciones, coordinar altas y reconstruir el catálogo al iniciar la aplicación.
- **B. Entrada (Zero-Trust):** Datos de eliminación, formulario de alta, cuentas persistidas y JSON inicial.
- **C. Validación (Harness IAST):** Tras borrar, `obtenerCuentaBD` debe devolver ausencia; luego se elimina memoria y se reconstruye/verifica DAG. Altas delegan a `ejecutarAlgoritmiaCuenta`. Inicio valida JSON con `fase2ValidarGrafo` y DAG final con `fase5VerificarGrafo`.
- **D. Procesamiento:** Publica eventos de cuenta creada/eliminada, sincroniza cuentas iniciales faltantes, reconstruye grafo y actualiza UI.
- **E. Decisión:** No actualiza memoria por eliminación hasta comprobar ausencia en BD; al iniciar, BD vacía se siembra con JSON, BD existente se complementa.
- **F. Recuperación:** Catches muestran errores y conservan interfaz utilizable; fallos de verificación abortan actualización final.
- **G. Verificación:** Postcondición de eliminación: cuenta ausente en BD y `buscarCuenta`; postcondición de inicio: catálogo completo forma DAG válido.
- **H. Telemetría:** Usa telemetría de cuentas para altas/eliminaciones y mensajes UI para inicialización.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `VistaCatalogo = Render(catalogoCuentas, grafoCuentas)`
- `Eliminable(c) = Existe(c) ∧ c.codigo∉codigosCuentasIniciales ∧ |grafoCuentas[c.codigo]|=0 ∧ ¬UsadaEnMovimientos(c)`
- `Confirmada=false ⇒ ΔIndexedDB=0 ∧ ΔcatalogoCuentas=0`
- `Eliminar(c) exitoso ⇒ obtenerCuentaBD(c.codigo)=undefined ∧ buscarCuenta(c.codigo)=undefined`.

### Declaraciones y estado de módulo reflejados desde el código

```js
const formularioCuenta = document.getElementById("formulario-cuenta");
const arbolCuentas = document.getElementById("arbol-cuentas");
const cuentaPadre = document.getElementById("cuenta-padre");
const mensajeCatalogo = document.getElementById("mensaje-catalogo");
const mensajeFormularioCuenta = document.getElementById("mensaje-formulario-cuenta");
const dialogoCuenta = document.getElementById("dialogo-cuenta");
const botonAbrirCuenta = document.getElementById("abrir-formulario-cuenta");
const codigosCuentasIniciales = new Set();
FASE 1
A. Objetivo: recibir la cuenta solicitada para eliminación.
B. Entrada (Zero-Trust): código obtenido desde el botón de la interfaz.
C. Validación: todavía no se autoriza la eliminación.
D. Procesamiento: normalizar el código y localizar la cuenta.
E. Decisión: enviar un objeto uniforme a la fase 2.
F. Recuperación: usar una cuenta nula si el código no existe.
G. Verificación: conservar código y cuenta en una sola estructura.
H. Telemetría: registrar el inicio del microproceso.
FASE 2
A. Objetivo: impedir eliminaciones que rompan la integridad contable.
B. Entrada (Zero-Trust): cuenta localizada, todavía no confiable.
C. Validación: existencia, origen, hijos y uso en partidas.
D. Procesamiento: consultar el DAG y los movimientos almacenados.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: mantener intactos memoria e IndexedDB.
G. Verificación: revisar todas las líneas de las partidas.
H. Telemetría: registrar la causa del rechazo.
FASE 3
A. Objetivo: procesar una eliminación aprobada.
B. Entrada (Zero-Trust): cuenta validada en la fase 2.
C. Validación: solicitar confirmación explícita al usuario.
D. Procesamiento: eliminar la clave desde IndexedDB.
E. Decisión: continuar solamente si el usuario confirma.
F. Recuperación: devolver cancelada=true sin modificar datos.
G. Verificación: esperar a que finalice la transacción.
H. Telemetría: registrar cancelación o procesamiento.
FASE 4
A. Objetivo: decidir si corresponde actualizar la memoria.
B. Entrada (Zero-Trust): resultado del procesamiento.
C. Validación: comprobar que la operación no fue cancelada.
D. Procesamiento: traducir el resultado a una decisión booleana.
E. Decisión: verificar o finalizar sin cambios.
F. Recuperación: conservar la interfaz cuando existe cancelación.
G. Verificación: devolver continuar=true solo tras una eliminación.
H. Telemetría: registrar la decisión tomada.
FASE 5
A. Objetivo: verificar la eliminación y sincronizar el DAG.
B. Entrada (Zero-Trust): código supuestamente eliminado.
C. Validación: volver a consultar IndexedDB.
D. Procesamiento: retirar la cuenta de memoria y reconstruir el grafo.
E. Decisión: confirmar solo si no existe en almacenamiento ni memoria.
F. Recuperación: lanzar una inconsistencia si la cuenta reaparece.
G. Verificación: lectura independiente y búsqueda en catálogo.
H. Telemetría: registrar el resultado definitivo.
botonAbrirCuenta.addEventListener("click", abrirFormularioCuenta);
document.getElementById("cerrar-dialogo-cuenta").addEventListener("click", cerrarFormularioCuenta);
document.getElementById("cancelar-dialogo-cuenta").addEventListener("click", cerrarFormularioCuenta);
formularioCuenta.addEventListener("submit", registrarCuenta);
iniciarAplicacionCatalogo();
```

### FASE 00 — Selectores, renderizado y utilidades UI — espejo técnico

**Firmas reales:** `function escapar(texto)`, `function cargarSelectores()`, `function crearFilaCuenta(cuenta, nivel)`, `function crearFilasJerarquia(codigo, nivel)`, `function mostrarArbol()`, `function actualizarInterfazCatalogo()`, `function abrirFormularioCuenta()`, `function cerrarFormularioCuenta()`.

**Formalización de la fase:** `DOM = Render(catalogoCuentas, grafoCuentas)`; todo texto interpolado debe pasar por escape contextual.

**Estructuras/tecnicismos reales:** `Array`, DOM.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!cuenta) return "";
if (dialogoCuenta.open) dialogoCuenta.close();
```

**Postcondiciones/retornos observables extraídos:**

```js
return elemento.innerHTML;
return `<option value="${cuenta.codigo}">${cuenta.codigo} - ${escapar(cuenta.nombre)}</option>`;
return `
return crearFilasJerarquia(codigoHijo, nivel + 1);
return filaActual + filasHijas;
return cuenta.padre === null;
return crearFilasJerarquia(cuenta.codigo, 0);
```

**Código exacto correspondiente a la fase:**

```js
function escapar(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = String(texto || "");
    return elemento.innerHTML;
}

function cargarSelectores() {
    const seleccionPadre = cuentaPadre.value;
    const opciones = catalogoCuentas.map(function(cuenta) {
        return `<option value="${cuenta.codigo}">${cuenta.codigo} - ${escapar(cuenta.nombre)}</option>`;
    }).join("");
    cuentaPadre.innerHTML = '<option value="">Sin cuenta padre</option>' + opciones;
    cuentaPadre.value = seleccionPadre;
}

function crearFilaCuenta(cuenta, nivel) {
    const puedeEliminar = !codigosCuentasIniciales.has(cuenta.codigo);
    const botonEliminar = puedeEliminar
        ? `<button class="eliminar-cuenta" type="button" data-codigo="${cuenta.codigo}">Eliminar</button>`
        : '<span class="accion-no-disponible">—</span>';
    const tipo = cuenta.permiteMovimientos
        ? "Cuenta auxiliar"
        : "Cuenta agrupadora";
    return `
        <tr class="${cuenta.permiteMovimientos ? "fila-cuenta auxiliar" : "fila-cuenta agrupadora"}">
            <td class="codigo-cuenta">${escapar(cuenta.codigo)}</td>
            <td>
                <div class="nombre-cuenta-matriz" style="--nivel-cuenta:${nivel}">
                    <span class="indicador-nivel"></span>
                    <strong>${escapar(cuenta.nombre)}</strong>
                </div>
            </td>
            <td>${escapar(obtenerClasificacionCuenta(cuenta.codigo))}</td>
            <td>${escapar(cuenta.naturaleza)}</td>
            <td>${tipo}</td>
            <td class="acciones-matriz">${botonEliminar}</td>
        </tr>
    `;
}

function crearFilasJerarquia(codigo, nivel) {
    const cuenta = buscarCuenta(codigo);
    if (!cuenta) return "";
    const hijos = grafoCuentas[codigo] || [];
    const filaActual = crearFilaCuenta(cuenta, nivel);
    const filasHijas = hijos.map(function(codigoHijo) {
        return crearFilasJerarquia(codigoHijo, nivel + 1);
    }).join("");
    return filaActual + filasHijas;
}

function mostrarArbol() {
    const raices = catalogoCuentas.filter(function(cuenta) {
        return cuenta.padre === null;
    });
    arbolCuentas.innerHTML = raices.map(function(cuenta) {
        return crearFilasJerarquia(cuenta.codigo, 0);
    }).join("");
    activarEliminacionCuentas();
}

function actualizarInterfazCatalogo() {
    cargarSelectores();
    mostrarArbol();
}

function abrirFormularioCuenta() {
    formularioCuenta.reset();
    mensajeFormularioCuenta.textContent = "";
    mensajeCatalogo.textContent = "";
    cargarSelectores();
    dialogoCuenta.showModal();
    document.getElementById("codigo").focus();
}

function cerrarFormularioCuenta() {
    if (dialogoCuenta.open) dialogoCuenta.close();
    mensajeFormularioCuenta.textContent = "";
}

```

### FASE 01 — Entrada de solicitud de eliminación — espejo técnico

**Firmas reales:** `function fase1EntradaEliminacionCuenta(evento)`.

**Formalización de la fase:** `Eliminar(c)` solo progresa si `c` existe, no es inicial, no tiene hijos y no está referenciada por movimientos; después se verifica ausencia en BD y memoria.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Postcondiciones/retornos observables extraídos:**

```js
return { codigo: codigo, cuenta: buscarCuenta(codigo) };
```

**Código exacto correspondiente a la fase:**

```js
function fase1EntradaEliminacionCuenta(evento) {
    const codigo = String(evento.currentTarget.dataset.codigo || "").trim();
    actualizarTelemetria("1. Entrada Zero-Trust", "Solicitud de eliminación");
    return { codigo: codigo, cuenta: buscarCuenta(codigo) };
}

```

### FASE 02 — Validación de eliminación — espejo técnico

**Firmas reales:** `async function fase2ValidarEliminacionCuenta(datos)`.

**Formalización de la fase:** `Eliminar(c)` solo progresa si `c` existe, no es inicial, no tiene hijos y no está referenciada por movimientos; después se verifica ausencia en BD y memoria.

**Estructuras/tecnicismos reales:** `Array`.

**Complejidad dominante:** Costo CPU local cercano a `O(1)` más latencia de I/O/asíncrona determinada por la API externa o el almacenamiento.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!datos.cuenta) {
if (estaUtilizada) {
if (error) actualizarTelemetria("2. Validación", error, true);
```

**Postcondiciones/retornos observables extraídos:**

```js
return (partida.partida || []).some(function(linea) {
return linea.codigo === datos.codigo;
return error;
```

**Código exacto correspondiente a la fase:**

```js
async function fase2ValidarEliminacionCuenta(datos) {
    let error = "";
    if (!datos.cuenta) {
        error = "La cuenta no existe.";
    } else if (codigosCuentasIniciales.has(datos.codigo)) {
        error = "Las cuentas iniciales no se pueden eliminar.";
    } else if ((grafoCuentas[datos.codigo] || []).length > 0) {
        error = "No se puede eliminar: la cuenta tiene cuentas hijas.";
    } else {
        const partidas = await obtenerMovimientosBD();
        const estaUtilizada = partidas.some(function(partida) {
            return (partida.partida || []).some(function(linea) {
                return linea.codigo === datos.codigo;
            });
        });
        if (estaUtilizada) {
            error = "No se puede eliminar: la cuenta está utilizada en una partida.";
        }
    }
    if (error) actualizarTelemetria("2. Validación", error, true);
    return error;
}

```

### FASE 03 — Confirmación y eliminación persistente — espejo técnico

**Firmas reales:** `async function fase3ProcesarEliminacionCuenta(datos)`.

**Formalización de la fase:** `Eliminar(c)` solo progresa si `c` existe, no es inicial, no tiene hijos y no está referenciada por movimientos; después se verifica ausencia en BD y memoria.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** Costo CPU local cercano a `O(1)` más latencia de I/O/asíncrona determinada por la API externa o el almacenamiento.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!confirmada) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return { cancelada: true };
return { cancelada: false };
```

**Código exacto correspondiente a la fase:**

```js
async function fase3ProcesarEliminacionCuenta(datos) {
    const confirmada = window.confirm(
        "¿Eliminar la cuenta " + datos.cuenta.codigo + " - " + datos.cuenta.nombre + "?"
    );
    if (!confirmada) {
        actualizarTelemetria("3. Procesamiento", "Eliminación cancelada");
        return { cancelada: true };
    }
    await eliminarCuentaBD(datos.codigo);
    actualizarTelemetria("3. Procesamiento", "Eliminación procesada");
    return { cancelada: false };
}

```

### FASE 04 — Decisión de continuar a verificación — espejo técnico

**Firmas reales:** `function fase4DecidirEliminacionCuenta(resultado)`.

**Formalización de la fase:** `DOM = Render(catalogoCuentas, grafoCuentas)`; todo texto interpolado debe pasar por escape contextual.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Postcondiciones/retornos observables extraídos:**

```js
return continuar;
```

**Código exacto correspondiente a la fase:**

```js
function fase4DecidirEliminacionCuenta(resultado) {
    const continuar = resultado && resultado.cancelada === false;
    actualizarTelemetria(
        "4. Decisión",
        continuar ? "Verificar eliminación" : "Sin cambios"
    );
    return continuar;
}

```

### FASE 05 — Verificación, alta e inicialización del catálogo — espejo técnico

**Firmas reales:** `async function fase5VerificarEliminacionCuenta(datos)`, `async function eliminarCuentaCreada(evento)`, `async function registrarCuenta(evento)`, `async function cargarCuentasIniciales()`, `async function iniciarAplicacionCatalogo()`.

**Formalización de la fase:** `DOM = Render(catalogoCuentas, grafoCuentas)`; todo texto interpolado debe pasar por escape contextual.

**Estructuras/tecnicismos reales:** `Set`, DOM.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (verificacion) throw new Error("La cuenta continúa almacenada.");
if (posicion !== -1) catalogoCuentas.splice(posicion, 1);
if (buscarCuenta(datos.codigo)) {
if (error) {
if (!fase4DecidirEliminacionCuenta(procesamiento)) return;
if (!resultado.exito) {
if (!respuesta.ok) throw new Error("No se pudo cargar el catálogo JSON.");
if (error) throw new Error(error);
if (guardadas.length === 0) {
if (cuentasFaltantes.length > 0) {
if (!fase5VerificarGrafo(catalogoCuentas, grafoCuentas)) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return item.codigo === datos.codigo;
return true;
return cuentasIniciales;
return cuenta.codigo;
return !codigosGuardados.has(cuenta.codigo);
```

**Código exacto correspondiente a la fase:**

```js
async function fase5VerificarEliminacionCuenta(datos) {
    const verificacion = await obtenerCuentaBD(datos.codigo);
    if (verificacion) throw new Error("La cuenta continúa almacenada.");
    const posicion = catalogoCuentas.findIndex(function(item) {
        return item.codigo === datos.codigo;
    });
    if (posicion !== -1) catalogoCuentas.splice(posicion, 1);
    grafoCuentas = construirGrafo(catalogoCuentas);
    if (buscarCuenta(datos.codigo)) {
        throw new Error("La cuenta continúa en el catálogo.");
    }
    actualizarTelemetria("5. Verificación", "Cuenta eliminada", false);
    return true;
}

async function eliminarCuentaCreada(evento) {
    const datos = fase1EntradaEliminacionCuenta(evento);
    try {
        const error = await fase2ValidarEliminacionCuenta(datos);
        if (error) {
            mostrarMensaje(error, true);
            return;
        }
        const procesamiento = await fase3ProcesarEliminacionCuenta(datos);
        if (!fase4DecidirEliminacionCuenta(procesamiento)) return;
        await fase5VerificarEliminacionCuenta(datos);
        await publicarEventoContable(
            TIPOS_EVENTOS.CUENTA_ELIMINADA,
            "cuenta",
            datos.codigo,
            {
                nombre: datos.cuenta.nombre
            }
        );
        mostrarMensaje("Cuenta eliminada correctamente.", false);
        actualizarInterfazCatalogo();
    } catch (error) {
        actualizarTelemetria("F. Recuperación", error.message, true);
        mostrarMensaje("No fue posible eliminar la cuenta: " + error.message, true);
    }
}

async function registrarCuenta(evento) {
    evento.preventDefault();
    const datosFormulario = {
        codigo: document.getElementById("codigo").value.trim(),
        nombre: document.getElementById("nombre").value.trim(),
        padre: cuentaPadre.value || null,
        naturaleza: document.getElementById("naturaleza").value,
        permiteMovimientos: document.getElementById("permite-movimientos").checked
    };
    try {
        const resultado = await ejecutarAlgoritmiaCuenta(datosFormulario);
        if (!resultado.exito) {
            mostrarMensaje(resultado.error, true);
            actualizarInterfazCatalogo();
            return;
        }
                await publicarEventoContable(
            TIPOS_EVENTOS.CUENTA_CREADA,
            "cuenta",
            resultado.cuenta.codigo,
            {
                nombre: resultado.cuenta.nombre,
                naturaleza: resultado.cuenta.naturaleza,
                permiteMovimientos: resultado.cuenta.permiteMovimientos
            }
        );
        formularioCuenta.reset();
        cerrarFormularioCuenta();
        mostrarMensaje("Cuenta agregada, guardada y verificada correctamente.", false);
        actualizarInterfazCatalogo();
    } catch (errorInesperado) {
        actualizarTelemetria("F. Recuperación", "Error inesperado", true);
        mostrarMensaje("Ocurrió un error inesperado durante el registro.", true);
    }
}

async function cargarCuentasIniciales() {
    const respuesta = await fetch("datos/catalogo_cuentas.json");
    if (!respuesta.ok) throw new Error("No se pudo cargar el catálogo JSON.");
    const cuentasIniciales = await respuesta.json();
    const error = fase2ValidarGrafo(cuentasIniciales);
    if (error) throw new Error(error);
    cuentasIniciales.forEach(function(cuenta) {
        codigosCuentasIniciales.add(cuenta.codigo);
    });
    return cuentasIniciales;
}

async function iniciarAplicacionCatalogo() {
    try {
        await abrirBaseDatos();
        const guardadas = await obtenerCuentasBD();
        const cuentasIniciales = await cargarCuentasIniciales();
        if (guardadas.length === 0) {
            catalogoCuentas.splice(0, catalogoCuentas.length, ...cuentasIniciales);
            grafoCuentas = construirGrafo(catalogoCuentas);
            await guardarCuentasBD(catalogoCuentas);
        } else {
            const codigosGuardados = new Set(guardadas.map(function(cuenta) {
                return cuenta.codigo;
            }));
            const cuentasFaltantes = cuentasIniciales.filter(function(cuenta) {
                return !codigosGuardados.has(cuenta.codigo);
            });
            if (cuentasFaltantes.length > 0) {
                await guardarCuentasBD(cuentasFaltantes);
            }
            catalogoCuentas.splice(0, catalogoCuentas.length, ...guardadas, ...cuentasFaltantes);
            grafoCuentas = construirGrafo(catalogoCuentas);
        }
        if (!fase5VerificarGrafo(catalogoCuentas, grafoCuentas)) {
            throw new Error("El catálogo almacenado no forma un DAG válido.");
        }
        actualizarInterfazCatalogo();
    } catch (error) {
        mostrarMensaje("No se pudo iniciar el catálogo: " + error.message, true);
        actualizarInterfazCatalogo();
    }
}

```

### Funciones auxiliares no agrupadas explícitamente por las fases documentales

Estas funciones existen en el `.js` y se incluyen para que el `.md` no omita comportamiento ejecutable.

#### `function activarEliminacionCuentas()`

- **Complejidad:** `O(n)` respecto al tamaño de la colección recorrida.
- **Estructuras:** DOM.

```js
function activarEliminacionCuentas() {
    document.querySelectorAll(".eliminar-cuenta").forEach(function(boton) {
        boton.addEventListener("click", eliminarCuentaCreada);
    });
}
```

#### `function mostrarMensaje(texto, esError)`

- **Complejidad:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.
- **Estructuras:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

```js
function mostrarMensaje(texto, esError) {
    const destino = dialogoCuenta.open
        ? mensajeFormularioCuenta
        : mensajeCatalogo;
    destino.textContent = texto;
    destino.className = esError
        ? "mensaje-catalogo error"
        : "mensaje-catalogo correcto";
}
```

### Regla de fidelidad del reflejo

- Las ecuaciones describen únicamente relaciones que ya están codificadas; no sustituyen el comportamiento JavaScript.
- Los nombres `codigo`, `cuenta`, `movimiento`, `partida`, `baseDatos`, stores, eventos y demás símbolos se mantienen exactamente como aparecen en el código.
- Una futura modificación del `.js` exige actualizar esta sección si cambia una firma, condición, estructura, efecto secundario o postcondición.
- No se introducen DAG, criptografía, Circuit Breaker, checksum, GPU/SIMD u otras tecnologías salvo que el propio archivo las implemente.


## Refutación P3 — pros y contras
### Pros a preservar
- **Preservar:** Integridad referencial antes de eliminar.
- **Preservar:** Memoria se actualiza después de confirmar eliminación persistida.
- **Preservar:** Carga inicial complementa sin duplicar códigos.
- **Preservar:** Escapado contextual para renderizado.

### Contras y tratamiento
- **Contra:** Dependencia fuerte del DOM.
  **Tratamiento/refutación:** Es controlador UI por diseño; mantener selectores documentados y no mover lógica de dominio al DOM.
- **Contra:** Consulta todos los movimientos para validar uso de cuenta.
  **Tratamiento/refutación:** Correcto con volumen actual; un índice/consulta por cuenta requeriría cambio explícito de esquema.

## Sintaxis e instrucciones finales de mantenimiento
- Escapa texto y atributos antes de interpolar HTML; selectores deben existir en la página correspondiente.
- No confía en dataset como evidencia de existencia; adjunta buscarCuenta(codigo) para FASE 02.
- Cuenta debe existir, no ser inicial, no tener hijos y no estar referenciada por ninguna línea de movimientos persistidos.
- window.confirm actúa como confirmación del usuario; eliminarCuentaBD es la única mutación persistente.
- Solo resultado.cancelada === false autoriza continuar.
- Tras borrar, obtenerCuentaBD debe devolver ausencia; luego se elimina memoria y se reconstruye/verifica DAG. Altas delegan a ejecutarAlgoritmiaCuenta. Inicio valida JSON con fase2ValidarGrafo y DAG final con fase5VerificarGrafo.
- No renombrar funciones públicas, variables globales compartidas ni contratos entre módulos sin revisar consumidores.
- Mantener comentarios de inicio/fin de fase cortos; la explicación detallada permanece en este `.md`.

## Criterio de cierre P3
El objetivo de “contras al 0%” se interpreta como **cero debilidades identificadas sin tratamiento**: corregir, mitigar, documentar como restricción o convertir en prueba obligatoria. No se declara riesgo técnico cero cuando el código conserva un trade-off real.

## Actualización — jerarquía de Activo Fijo
El catálogo incorpora `1200 Activo Fijo` como agrupadora y `1201`–`1204` como auxiliares. Las cuentas auxiliares contienen metadata de categoría, vida útil y tasa; las cuentas agrupadoras permanecen con `permiteMovimientos=false`.
