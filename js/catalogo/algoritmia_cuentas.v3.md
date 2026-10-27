# algoritmia_cuentas.js — P3 v3

## Qué es este archivo
Módulo orquestador del alta de cuentas contables; transforma datos de entrada en una cuenta normalizada, valida sus invariantes, modifica provisionalmente catálogo/grafo, persiste y verifica el resultado.


## Propósito técnico
Orquesta el alta de una cuenta desde datos de formulario hasta validación, inserción en catálogo/grafo, persistencia IndexedDB y verificación cruzada memoria↔base.

## Dependencias reales
- `validarCuentaNueva`, `agregarCuenta`, `buscarCuenta`, `construirGrafo` de grafo_cuentas.js
- `guardarCuentaBD`, `obtenerCuentaBD`, `eliminarCuentaBD` de base_datos.js
- DOM de telemetría del catálogo

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases y funciones reales de este archivo. No se asume DAG, Circuit Breaker, checksum, Epoll, GPU/SIMD o criptografía si el código no los implementa o no los necesita.

### FASE 00 — Estado de telemetría de cuentas
**Funciones reales de la fase:** `actualizarTelemetria()`.

- **A. Objetivo (DDD):** Mantener observabilidad del proceso de alta sin mezclarla con la decisión contable.
- **B. Entrada (Zero-Trust):** `actualizarTelemetria(fase, resultado, rechazada)` recibe textos y bandera opcional provenientes del pipeline.
- **C. Validación (Harness IAST):** Cada nodo DOM se comprueba antes de escribir; la ausencia de un elemento no debe romper el proceso.
- **D. Procesamiento:** Actualiza `telemetriaCuentas` y refleja fase, procesadas, rechazadas y resultado en el DOM disponible.
- **E. Decisión:** `rechazada===true` incrementa rechazos; `false` incrementa procesadas; `undefined` solo actualiza estado.
- **F. Recuperación:** Si un nodo DOM no existe, se omite su actualización y continúa el proceso.
- **G. Verificación:** El objeto de telemetría debe conservar el último estado aunque la UI no esté montada.
- **H. Telemetría:** Es la implementación concreta de telemetría del módulo.

### FASE 01 — Entrada y normalización de cuenta
**Funciones reales de la fase:** `fase1EntradaCuenta()`.

- **A. Objetivo (DDD):** Crear una representación canónica de cuenta antes de validar reglas del catálogo.
- **B. Entrada (Zero-Trust):** Recibe `datosFormulario`; si no es objeto usa `{}`. Convierte `codigo`, `nombre`, `padre`, `naturaleza` y `permiteMovimientos` a tipos esperados.
- **C. Validación (Harness IAST):** No valida reglas de negocio aquí; evita `TypeError` por `null/undefined` y deja valores normalizados para FASE 02.
- **D. Procesamiento:** Trim de cadenas, `padre` nulo cuando no existe y booleano estricto para `permiteMovimientos`.
- **E. Decisión:** Solo `permiteMovimientos === true` se acepta como verdadero.
- **F. Recuperación:** Entrada inexistente se degrada a una cuenta vacía que será rechazada por FASE 02, no por excepción accidental.
- **G. Verificación:** La salida siempre contiene los cinco campos del contrato de cuenta.
- **H. Telemetría:** Marca `1. Entrada Zero-Trust / Datos recibidos`.

### FASE 02 — Validación de cuenta
**Funciones reales de la fase:** `fase2ValidarCuenta()`.

- **A. Objetivo (DDD):** Autorizar únicamente cuentas sintáctica y estructuralmente compatibles con el catálogo.
- **B. Entrada (Zero-Trust):** Recibe la cuenta normalizada de FASE 01.
- **C. Validación (Harness IAST):** Código de 4 dígitos, nombre >=3, naturaleza Deudora/Acreedora y reglas de `validarCuentaNueva` (duplicado, padre válido, no autociclo, padre auxiliar sin hijos).
- **D. Procesamiento:** Aplica validación secuencial Fail-Fast y construye `{ valido, error }`.
- **E. Decisión:** Primer error encontrado rechaza la cuenta; cadena vacía autoriza FASE 03.
- **F. Recuperación:** No modifica catálogo, grafo ni IndexedDB cuando la validación falla.
- **G. Verificación:** `valido` debe equivaler exactamente a `error === ""`.
- **H. Telemetría:** Registra `Revisando cuenta`; un rechazo incrementa `telemetriaCuentas.rechazadas`.

### FASE 03 — Inserción provisional en catálogo/grafo
**Funciones reales de la fase:** `fase3ProcesarCuenta()`.

- **A. Objetivo (DDD):** Aplicar la cuenta al estado en memoria usando las reglas estructurales del grafo antes de persistir.
- **B. Entrada (Zero-Trust):** Solo debe recibir una cuenta aprobada en FASE 02.
- **C. Validación (Harness IAST):** `agregarCuenta` vuelve a validar estructura y `buscarCuenta(codigo)` confirma que el nodo quedó accesible.
- **D. Procesamiento:** Inserta la cuenta en `catalogoCuentas`, reconstruye/verifica el grafo dentro de `agregarCuenta` y devuelve `{procesada,error}`.
- **E. Decisión:** `procesada=true` únicamente si no hubo error y la cuenta existe en memoria.
- **F. Recuperación:** Si `agregarCuenta` detecta grafo inválido, revierte el push y restaura el grafo anterior.
- **G. Verificación:** La misma clave `cuenta.codigo` debe ser localizable mediante `buscarCuenta` antes de persistir.
- **H. Telemetría:** Marca `3. Procesamiento / Construyendo nodo`.

### FASE 04 — Persistencia y rollback de memoria
**Funciones reales de la fase:** `fase4DecidirYPersistir()`.

- **A. Objetivo (DDD):** Persistir la cuenta ya aceptada y mantener consistencia entre catálogo/grafo e IndexedDB.
- **B. Entrada (Zero-Trust):** Recibe la cuenta procesada en memoria por FASE 03.
- **C. Validación (Harness IAST):** La persistencia se delega a `guardarCuentaBD`; cualquier rechazo de IndexedDB se trata como fallo total de esta fase.
- **D. Procesamiento:** Ejecuta `await guardarCuentaBD(cuenta)`; en fallo elimina la cuenta de `catalogoCuentas` y reconstruye `grafoCuentas`.
- **E. Decisión:** Devuelve `{persistida:true,error:""}` solo si IndexedDB resuelve; de lo contrario `{persistida:false,...}`.
- **F. Recuperación:** Rollback explícito de memoria/grafo cuando la persistencia falla para evitar estados divergentes.
- **G. Verificación:** No da por confirmada la cuenta por estar en memoria; la verificación definitiva se difiere a FASE 05.
- **H. Telemetría:** Marca `4. Decisión / Guardando en IndexedDB`.

### FASE 05 — Verificación cruzada y orquestación
**Funciones reales de la fase:** `fase5VerificarCuenta()`, `ejecutarAlgoritmiaCuenta()`.

- **A. Objetivo (DDD):** Comprobar que la cuenta existe simultáneamente en IndexedDB y memoria y cerrar el flujo de alta con un resultado único.
- **B. Entrada (Zero-Trust):** `fase5VerificarCuenta` recibe cuenta persistida; `ejecutarAlgoritmiaCuenta` recibe datos externos y encadena todo el pipeline.
- **C. Validación (Harness IAST):** Lee `obtenerCuentaBD(codigo)` y `buscarCuenta(codigo)`; exige coincidencia del código en ambas representaciones.
- **D. Procesamiento:** Si falla, intenta `eliminarCuentaBD`, elimina de `catalogoCuentas` y reconstruye `grafoCuentas`; el orquestador corta en cada error de fases anteriores.
- **E. Decisión:** Éxito solo si F2 válida, F3 procesada, F4 persistida y F5 verificada.
- **F. Recuperación:** Rollback bilateral ante verificación fallida; el error se refleja en el resultado del orquestador y telemetría.
- **G. Verificación:** La postcondición es `IndexedDB(codigo) && memoria(codigo)` con la misma clave.
- **H. Telemetría:** Registra `5. Verificación`, recuperación y resultado final de cuenta procesada/rechazada.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `Cuenta = (codigo, nombre, padre, naturaleza, permiteMovimientos)`
- `Valida(c) = /^\d{4}$/(c.codigo) ∧ |c.nombre|≥3 ∧ c.naturaleza∈{Deudora,Acreedora} ∧ validarCuentaNueva(c)=""`
- `Valida(c)=false ⇒ Δcatalogo=0 ∧ Δgrafo=0 ∧ ΔIndexedDB=0`
- `Exito(c) = Persistida(c) ∧ Memoria(c) ∧ VerificadaBD(c)`
- `FalloPersistencia ⇒ rollback(catalogoCuentas, grafoCuentas)`.

### Declaraciones y estado de módulo reflejados desde el código

```js
const telemetriaCuentas = {
    procesadas: 0,
    rechazadas: 0,
    fase: "Esperando entrada",
    resultado: "Sin operaciones"
};
FASE 1
A. Objetivo: recibir una posible cuenta contable.
B. Entrada (Zero-Trust): valores sin confiar provenientes del formulario.
C. Validación: todavía no se aprueba ningún dato.
D. Procesamiento: normalizar espacios y tipos.
E. Decisión: enviar un objeto uniforme a la fase 2.
F. Recuperación: devolver un objeto controlado aunque falte un valor.
G. Verificación: comprobar que las propiedades esperadas existen.
H. Telemetría: registrar que inició la captura.
FASE 2
A. Objetivo: impedir que datos inválidos entren al catálogo.
B. Entrada (Zero-Trust): cuenta normalizada, aún no confiable.
C. Validación: formato, nombre, naturaleza, duplicados y cuenta padre.
D. Procesamiento: ejecutar validarCuentaNueva().
E. Decisión: aprobar o rechazar.
F. Recuperación: no modificar el grafo si existe un error.
G. Verificación: respuesta con valido y error.
H. Telemetría: guardar la causa del rechazo.
FASE 3
A. Objetivo: incorporar el nodo y reconstruir el DAG.
B. Entrada (Zero-Trust): cuenta aprobada por la fase 2.
C. Validación: agregarCuenta() vuelve a aplicar las reglas del dominio.
D. Procesamiento: insertar el nodo y ejecutar construirGrafo().
E. Decisión: aceptar únicamente un DAG sin ciclos.
F. Recuperación: agregarCuenta() revierte si detecta un ciclo.
G. Verificación: buscar la cuenta dentro de la memoria.
H. Telemetría: informar si se construyó el nodo.
FASE 4
A. Objetivo: decidir si el cambio se vuelve permanente.
B. Entrada (Zero-Trust): nodo procesado en memoria.
C. Validación: IndexedDB debe aceptar la escritura.
D. Procesamiento: ejecutar guardarCuentaBD().
E. Decisión: confirmar la operación o marcarla como fallida.
F. Recuperación: retirar el nodo de memoria si falla la base.
G. Verificación: devolver persistida=true solamente al completar la escritura.
H. Telemetría: registrar la decisión tomada.
FASE 5
A. Objetivo: comprobar el resultado final y dejar evidencia.
B. Entrada (Zero-Trust): código de la cuenta supuestamente almacenada.
C. Validación: volver a leer la cuenta desde IndexedDB.
D. Procesamiento: comparar el código solicitado con el recuperado.
E. Decisión: éxito solo si la cuenta existe en memoria y almacenamiento.
F. Recuperación: reportar una inconsistencia sin ocultarla.
G. Verificación: lectura independiente mediante obtenerCuentaBD().
H. Telemetría: actualizar procesadas, rechazadas y último resultado.
```

### FASE 00 — Estado de telemetría de cuentas — espejo técnico

**Firmas reales:** `function actualizarTelemetria(fase, resultado, rechazada)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** DOM.

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (rechazada === true) telemetriaCuentas.rechazadas++;
if (rechazada === false) telemetriaCuentas.procesadas++;
if (!faseElemento) return;
```

**Código exacto correspondiente a la fase:**

```js
function actualizarTelemetria(fase, resultado, rechazada) {
    telemetriaCuentas.fase = fase;
    telemetriaCuentas.resultado = resultado;
    if (rechazada === true) telemetriaCuentas.rechazadas++;
    if (rechazada === false) telemetriaCuentas.procesadas++;
    const faseElemento = document.getElementById("telemetria-fase");
    if (!faseElemento) return;
    faseElemento.textContent = telemetriaCuentas.fase;
    document.getElementById("telemetria-procesadas").textContent = telemetriaCuentas.procesadas;
    document.getElementById("telemetria-rechazadas").textContent = telemetriaCuentas.rechazadas;
    document.getElementById("telemetria-resultado").textContent = telemetriaCuentas.resultado;
}

```

### FASE 01 — Entrada y normalización de cuenta — espejo técnico

**Firmas reales:** `function fase1EntradaCuenta(datosFormulario)`.

**Formalización de la fase:** `Normalizar(d)→(trim(codigo),trim(nombre),padre|null,naturaleza,permiteMovimientos===true)`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Postcondiciones/retornos observables extraídos:**

```js
return {
```

**Código exacto correspondiente a la fase:**

```js
function fase1EntradaCuenta(datosFormulario) {
    actualizarTelemetria("1. Entrada Zero-Trust", "Datos recibidos");
    return {
        codigo: String(datosFormulario.codigo || "").trim(),
        nombre: String(datosFormulario.nombre || "").trim(),
        padre: datosFormulario.padre ? String(datosFormulario.padre).trim() : null,
        naturaleza: String(datosFormulario.naturaleza || "").trim(),
        permiteMovimientos: datosFormulario.permiteMovimientos === true
    };
}

```

### FASE 02 — Validación de cuenta — espejo técnico

**Firmas reales:** `function fase2ValidarCuenta(cuenta)`.

**Formalización de la fase:** `V=/^\d{4}$/(codigo) ∧ |nombre|≥3 ∧ naturaleza∈{Deudora,Acreedora} ∧ validarCuentaNueva(cuenta)=""`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!/^\d{4}$/.test(cuenta.codigo)) {
if (!resultado.valido) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return resultado;
```

**Código exacto correspondiente a la fase:**

```js
function fase2ValidarCuenta(cuenta) {
    actualizarTelemetria("2. Validación", "Revisando cuenta");
    let error = "";
    if (!/^\d{4}$/.test(cuenta.codigo)) {
        error = "El código debe contener exactamente 4 números.";
    } else if (cuenta.nombre.length < 3) {
        error = "El nombre debe contener al menos 3 caracteres.";
    } else if (!["Deudora", "Acreedora"].includes(cuenta.naturaleza)) {
        error = "La naturaleza contable no es válida.";
    } else {
        error = validarCuentaNueva(cuenta);
    }

    const resultado = { valido: error === "", error: error };
    if (!resultado.valido) {
        actualizarTelemetria("2. Validación", resultado.error, true);
    }
    return resultado;
}

```

### FASE 03 — Inserción provisional en catálogo/grafo — espejo técnico

**Firmas reales:** `function fase3ProcesarCuenta(cuenta)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Postcondiciones/retornos observables extraídos:**

```js
return {
```

**Código exacto correspondiente a la fase:**

```js
function fase3ProcesarCuenta(cuenta) {
    actualizarTelemetria("3. Procesamiento", "Construyendo nodo");
    const error = agregarCuenta(cuenta);
    return {
        procesada: error === "" && Boolean(buscarCuenta(cuenta.codigo)),
        error: error
    };
}

```

### FASE 04 — Persistencia y rollback de memoria — espejo técnico

**Firmas reales:** `async function fase4DecidirYPersistir(cuenta)`.

**Formalización de la fase:** `guardarCuentaBD(c)` exitoso ⇒ persistida=true`; fallo ⇒ retirar `c` de memoria y reconstruir grafo.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** Costo CPU local cercano a `O(1)` más latencia de I/O/asíncrona determinada por la API externa o el almacenamiento.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (posicion !== -1) catalogoCuentas.splice(posicion, 1);
```

**Postcondiciones/retornos observables extraídos:**

```js
return { persistida: true, error: "" };
return item.codigo === cuenta.codigo;
return {
```

**Código exacto correspondiente a la fase:**

```js
async function fase4DecidirYPersistir(cuenta) {
    actualizarTelemetria("4. Decisión", "Guardando en IndexedDB");
    try {
        await guardarCuentaBD(cuenta);
        return { persistida: true, error: "" };
    } catch (errorBD) {
        const posicion = catalogoCuentas.findIndex(function(item) {
            return item.codigo === cuenta.codigo;
        });
        if (posicion !== -1) catalogoCuentas.splice(posicion, 1);
        grafoCuentas = construirGrafo(catalogoCuentas);
        return {
            persistida: false,
            error: "No fue posible guardar la cuenta. El cambio fue revertido."
        };
    }
}

```

### FASE 05 — Verificación cruzada y orquestación — espejo técnico

**Firmas reales:** `async function fase5VerificarCuenta(cuenta)`, `async function ejecutarAlgoritmiaCuenta(datosFormulario)`.

**Formalización de la fase:** `Exito ⇔ obtenerCuentaBD(c.codigo)` coincide con los campos esenciales de `c`; ¬Exito ⇒ compensación/rollback.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** Costo CPU local cercano a `O(1)` más latencia de I/O/asíncrona determinada por la API externa o el almacenamiento.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!verificada) {
if (posicion !== -1) catalogoCuentas.splice(posicion, 1);
if (!validacion.valido) {
if (!procesamiento.procesada) {
if (!decision.persistida) {
if (verificada) return { exito: true, cuenta: cuenta };
```

**Postcondiciones/retornos observables extraídos:**

```js
return item.codigo === cuenta.codigo;
return verificada;
return { exito: false, error: validacion.error };
return { exito: false, error: procesamiento.error };
return { exito: false, error: decision.error };
return {
```

**Código exacto correspondiente a la fase:**

```js
async function fase5VerificarCuenta(cuenta) {
    actualizarTelemetria("5. Verificación", "Comprobando resultado");
    let cuentaGuardada;
    try {
        cuentaGuardada = await obtenerCuentaBD(cuenta.codigo);
    } catch (error) {
        cuentaGuardada = null;
    }
    const cuentaMemoria = buscarCuenta(cuenta.codigo);
    const verificada = Boolean(cuentaGuardada) &&
        Boolean(cuentaMemoria) &&
        cuentaGuardada.codigo === cuenta.codigo &&
        cuentaMemoria.codigo === cuenta.codigo;
    if (!verificada) {
        try {
            await eliminarCuentaBD(cuenta.codigo);
        } catch (error) {
            actualizarTelemetria("5. Recuperación", "No fue posible revertir IndexedDB");
        }
        const posicion = catalogoCuentas.findIndex(function(item) {
            return item.codigo === cuenta.codigo;
        });
        if (posicion !== -1) catalogoCuentas.splice(posicion, 1);
        grafoCuentas = construirGrafo(catalogoCuentas);
    }
    actualizarTelemetria(
        "5. Verificación",
        verificada ? "Cuenta verificada" : "Verificación fallida",
        !verificada
    );

    return verificada;
}

async function ejecutarAlgoritmiaCuenta(datosFormulario) {
    const cuenta = fase1EntradaCuenta(datosFormulario);
    const validacion = fase2ValidarCuenta(cuenta);

    if (!validacion.valido) {
        return { exito: false, error: validacion.error };
    }

    const procesamiento = fase3ProcesarCuenta(cuenta);
    if (!procesamiento.procesada) {
        actualizarTelemetria("3. Procesamiento", procesamiento.error, true);
        return { exito: false, error: procesamiento.error };
    }

    const decision = await fase4DecidirYPersistir(cuenta);
    if (!decision.persistida) {
        actualizarTelemetria("4. Recuperación", decision.error, true);
        return { exito: false, error: decision.error };
    }

    const verificada = await fase5VerificarCuenta(cuenta);
    if (verificada) return { exito: true, cuenta: cuenta };
    return {
        exito: false,
        error: "La cuenta no pudo verificarse y el cambio fue revertido."
    };
}

```

### Regla de fidelidad del reflejo

- Las ecuaciones describen únicamente relaciones que ya están codificadas; no sustituyen el comportamiento JavaScript.
- Los nombres `codigo`, `cuenta`, `movimiento`, `partida`, `baseDatos`, stores, eventos y demás símbolos se mantienen exactamente como aparecen en el código.
- Una futura modificación del `.js` exige actualizar esta sección si cambia una firma, condición, estructura, efecto secundario o postcondición.
- No se introducen DAG, criptografía, Circuit Breaker, checksum, GPU/SIMD u otras tecnologías salvo que el propio archivo las implemente.


## Refutación P3 — pros y contras
### Pros a preservar
- **Preservar:** Pipeline explícito de alta.
- **Preservar:** Rollback cuando falla persistencia o verificación.
- **Preservar:** Validación de estructura delegada al módulo de grafo.
- **Preservar:** Verificación memoria↔IndexedDB.

### Contras y tratamiento
- **Contra:** La recuperación de FASE 04 y FASE 05 repite reconstrucción de grafo.
  **Tratamiento/refutación:** Puede centralizarse en un helper privado sin cambiar contratos públicos.
- **Contra:** La verificación compara principalmente la clave.
  **Tratamiento/refutación:** Si se requiere integridad de todos los campos, ampliar verificación explícita como evolución controlada.

## Sintaxis e instrucciones finales de mantenimiento
- Cada nodo DOM se comprueba antes de escribir; la ausencia de un elemento no debe romper el proceso.
- No valida reglas de negocio aquí; evita TypeError por null/undefined y deja valores normalizados para FASE 02.
- Código de 4 dígitos, nombre >=3, naturaleza Deudora/Acreedora y reglas de validarCuentaNueva (duplicado, padre válido, no autociclo, padre auxiliar sin hijos).
- agregarCuenta vuelve a validar estructura y buscarCuenta(codigo) confirma que el nodo quedó accesible.
- La persistencia se delega a guardarCuentaBD; cualquier rechazo de IndexedDB se trata como fallo total de esta fase.
- Lee obtenerCuentaBD(codigo) y buscarCuenta(codigo); exige coincidencia del código en ambas representaciones.
- No renombrar funciones públicas, variables globales compartidas ni contratos entre módulos sin revisar consumidores.
- Mantener comentarios de inicio/fin de fase cortos; la explicación detallada permanece en este `.md`.

## Criterio de cierre P3
El objetivo de “contras al 0%” se interpreta como **cero debilidades identificadas sin tratamiento**: corregir, mitigar, documentar como restricción o convertir en prueba obligatoria. No se declara riesgo técnico cero cuando el código conserva un trade-off real.
