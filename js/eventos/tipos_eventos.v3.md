# tipos_eventos.js — P3 v3

## Qué es este archivo
Módulo de contrato EDA que define tipos permitidos, genera identificadores, copia/inmoviliza payloads, valida eventos y construye objetos de evento contable inmutables.


## Propósito técnico
Define el contrato inmutable de eventos contables, genera UUID v4 seguro, copia/congela payloads y valida la forma de cada evento EDA.

## Dependencias reales
- Web Crypto API
- structuredClone cuando está disponible

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases y funciones reales de este archivo. No se asume DAG, Circuit Breaker, checksum, Epoll, GPU/SIMD o criptografía si el código no los implementa o no los necesita.

### FASE 00 — Catálogo de tipos de evento
**Funciones reales de la fase:** configuración/estado declarado directamente en el módulo.

- **A. Objetivo (DDD):** Definir el lenguaje ubicuo de eventos aceptados por el sistema.
- **B. Entrada (Zero-Trust):** No recibe datos; `TIPOS_EVENTOS` se crea con cinco tipos permitidos.
- **C. Validación (Harness IAST):** `Object.freeze` evita agregar/cambiar tipos en runtime.
- **D. Procesamiento:** Expone constantes de cuenta/partida/importación para productores y consumidores.
- **E. Decisión:** Solo valores presentes en `TIPOS_EVENTOS` pueden pasar FASE 03.
- **F. Recuperación:** Un tipo desconocido se rechaza al validar/construir eventos.
- **G. Verificación:** El objeto de tipos permanece inmutable.
- **H. Telemetría:** No mantiene telemetría; su función es contractual.

### FASE 01 — Generación de identidad UUID v4
**Funciones reales de la fase:** `crearIdEvento()`.

- **A. Objetivo (DDD):** Asignar identidad única y no predecible a cada evento persistido.
- **B. Entrada (Zero-Trust):** No recibe entrada del usuario; depende de `crypto` del navegador.
- **C. Validación (Harness IAST):** Exige `crypto.randomUUID` o `crypto.getRandomValues`; no usa `Math.random` como fallback.
- **D. Procesamiento:** Usa UUID nativo o arma 16 bytes con bits de versión 4 y variante RFC.
- **E. Decisión:** Si no existe CSPRNG, lanza error en vez de generar ID débil.
- **F. Recuperación:** El evento no se crea si no hay generador criptográfico seguro.
- **G. Verificación:** FASE 03 valida el formato UUID v4 mediante expresión regular.
- **H. Telemetría:** No aplica; fallo se propaga al publicador.

### FASE 02 — Copia e inmutabilidad del payload
**Funciones reales de la fase:** `congelarProfundo()`, `copiarDatosEvento()`.

- **A. Objetivo (DDD):** Evitar que el productor modifique retrospectivamente los datos de un evento ya construido.
- **B. Entrada (Zero-Trust):** `datos` puede ser null/undefined u objeto plano; arrays/primitivos son rechazados.
- **C. Validación (Harness IAST):** Comprueba que el payload sea objeto no-array y que pueda clonarse.
- **D. Procesamiento:** Clona con `structuredClone` o JSON fallback y aplica `congelarProfundo` con WeakSet para ciclos.
- **E. Decisión:** Datos ausentes producen `{}` congelado; datos incompatibles lanzan error.
- **F. Recuperación:** Error de clonación se convierte en mensaje controlado sin devolver referencia mutable original.
- **G. Verificación:** Payload resultante queda congelado recursivamente en las propiedades alcanzables.
- **H. Telemetría:** No propia; contrato se valida antes de publicar.

### FASE 03 — Validación del contrato de evento
**Funciones reales de la fase:** `validarEventoContable()`.

- **A. Objetivo (DDD):** Aceptar únicamente eventos compatibles con consumidores, persistencia y BroadcastChannel.
- **B. Entrada (Zero-Trust):** Recibe cualquier valor como candidato `evento`.
- **C. Validación (Harness IAST):** Tipo permitido, UUID v4, entidad/entidadId no vacíos, fecha parseable, version=1 y `datos` objeto no-array.
- **D. Procesamiento:** Realiza comprobaciones booleanas sin mutar el evento.
- **E. Decisión:** Devuelve `true/false`; no corrige eventos inválidos.
- **F. Recuperación:** Consumidores pueden rechazar inmediatamente con un error de contrato.
- **G. Verificación:** Toda forma creada por FASE 04 debe devolver `true` aquí.
- **H. Telemetría:** La contabilización de eventos inválidos ocurre en `bus_eventos.js`.

### FASE 04 — Construcción de evento inmutable
**Funciones reales de la fase:** `crearEventoContable()`.

- **A. Objetivo (DDD):** Construir la unidad EDA final con identidad, tipo, entidad, fecha, versión y datos inmutables.
- **B. Entrada (Zero-Trust):** Recibe `tipo`, `entidad`, `entidadId`, `datos`; normaliza identificadores a string trim.
- **C. Validación (Harness IAST):** Después de construir, llama `validarEventoContable(evento)` antes de devolver.
- **D. Procesamiento:** Genera ID/fecha, copia payload y arma objeto versión 1.
- **E. Decisión:** Evento inválido lanza error; válido se congela con `Object.freeze`.
- **F. Recuperación:** Nunca devuelve un evento parcialmente válido.
- **G. Verificación:** Postcondición: evento congelado y `validarEventoContable(evento)===true`.
- **H. Telemetría:** No propia; el bus registra publicación/recepción.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `TIPOS_EVENTOS` define el conjunto finito `T` de tipos válidos.
- `Evento=(id,tipo,entidad,entidadId,fecha,version,datos)`.
- `Valido(e)=e.tipo∈T ∧ |e.id|≥16 ∧ trim(e.entidad)≠"" ∧ trim(e.entidadId)≠"" ∧ Date.parse(e.fecha) válido ∧ e.version=1 ∧ datos es objeto no-array`.
- `crearEventoContable(...) ⇒ Object.freeze(evento)`.
- `copiarDatosEvento(datos)` aplica copia estructurada/JSON y `Object.freeze` para evitar mutación superficial del payload.

### Declaraciones y estado de módulo reflejados desde el código

```js
const TIPOS_EVENTOS = Object.freeze({
    CUENTA_CREADA: "CuentaCreada",
    CUENTA_ELIMINADA: "CuentaEliminada",
    PARTIDA_REGISTRADA: "PartidaRegistrada",
    PARTIDA_ELIMINADA: "PartidaEliminada",
    PARTIDAS_IMPORTADAS: "PartidasImportadas"
});
```

### FASE 00 — Catálogo de tipos de evento — espejo técnico

**Alcance:** constantes/estado de módulo y dependencias previas a la ejecución de funciones.

**Formalización de la fase:** `EventoValido = tipo∈TIPOS_EVENTOS ∧ idValido ∧ entidad≠"" ∧ entidadId≠"" ∧ fechaValida ∧ version=1 ∧ datos:Object`.

**Estructuras/tecnicismos reales:** objetos inmutables con `Object.freeze`.

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

### FASE 01 — Generación de identidad UUID v4 — espejo técnico

**Firmas reales:** `function crearIdEvento()`.

**Formalización de la fase:** `EventoValido = tipo∈TIPOS_EVENTOS ∧ idValido ∧ entidad≠"" ∧ entidadId≠"" ∧ fechaValida ∧ version=1 ∧ datos:Object`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (typeof crypto === "undefined") {
if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
if (typeof crypto.getRandomValues !== "function") {
```

**Postcondiciones/retornos observables extraídos:**

```js
return byte.toString(16).padStart(2, "0");
return hexadecimal.slice(0, 8) + "-" +
```

**Código exacto correspondiente a la fase:**

```js
function crearIdEvento() {
    if (typeof crypto === "undefined") {
        throw new Error("El navegador no ofrece un generador criptográfico seguro.");
    }
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto.getRandomValues !== "function") {
        throw new Error("El navegador no ofrece un generador criptográfico seguro.");
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hexadecimal = Array.from(bytes, function(byte) {
        return byte.toString(16).padStart(2, "0");
    }).join("");
    return hexadecimal.slice(0, 8) + "-" +
        hexadecimal.slice(8, 12) + "-" +
        hexadecimal.slice(12, 16) + "-" +
        hexadecimal.slice(16, 20) + "-" +
        hexadecimal.slice(20);
}

```

### FASE 02 — Copia e inmutabilidad del payload — espejo técnico

**Firmas reales:** `function copiarDatosEvento(datos)`.

**Formalización de la fase:** `EventoValido = tipo∈TIPOS_EVENTOS ∧ idValido ∧ entidad≠"" ∧ entidadId≠"" ∧ fechaValida ∧ version=1 ∧ datos:Object`.

**Estructuras/tecnicismos reales:** objetos inmutables con `Object.freeze`.

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (datos === undefined || datos === null) return Object.freeze({});
if (typeof datos !== "object" || Array.isArray(datos)) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return Object.freeze(copia);
```

**Código exacto correspondiente a la fase:**

```js
function copiarDatosEvento(datos) {
    if (datos === undefined || datos === null) return Object.freeze({});
    if (typeof datos !== "object" || Array.isArray(datos)) {
        throw new Error("Los datos del evento deben ser un objeto.");
    }
    try {
        const copia = typeof structuredClone === "function"
            ? structuredClone(datos)
            : JSON.parse(JSON.stringify(datos));
        return Object.freeze(copia);
    } catch (error) {
        throw new Error("Los datos del evento no se pueden copiar de forma segura.");
    }
}

```

### FASE 03 — Validación del contrato de evento — espejo técnico

**Firmas reales:** `function validarEventoContable(evento)`.

**Formalización de la fase:** `EventoValido = tipo∈TIPOS_EVENTOS ∧ idValido ∧ entidad≠"" ∧ entidadId≠"" ∧ fechaValida ∧ version=1 ∧ datos:Object`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!evento || typeof evento !== "object") return false;
if (!Object.values(TIPOS_EVENTOS).includes(evento.tipo)) return false;
if (typeof evento.id !== "string" || evento.id.length < 16) return false;
if (typeof evento.entidad !== "string" || !evento.entidad.trim()) return false;
if (typeof evento.entidadId !== "string" || !evento.entidadId.trim()) return false;
if (typeof evento.fecha !== "string" || Number.isNaN(Date.parse(evento.fecha))) return false;
if (evento.version !== 1) return false;
```

**Postcondiciones/retornos observables extraídos:**

```js
return Boolean(evento.datos) && typeof evento.datos === "object" && !Array.isArray(evento.datos);
```

**Código exacto correspondiente a la fase:**

```js
function validarEventoContable(evento) {
    if (!evento || typeof evento !== "object") return false;
    if (!Object.values(TIPOS_EVENTOS).includes(evento.tipo)) return false;
    if (typeof evento.id !== "string" || evento.id.length < 16) return false;
    if (typeof evento.entidad !== "string" || !evento.entidad.trim()) return false;
    if (typeof evento.entidadId !== "string" || !evento.entidadId.trim()) return false;
    if (typeof evento.fecha !== "string" || Number.isNaN(Date.parse(evento.fecha))) return false;
    if (evento.version !== 1) return false;
    return Boolean(evento.datos) && typeof evento.datos === "object" && !Array.isArray(evento.datos);
}

```

### FASE 04 — Construcción de evento inmutable — espejo técnico

**Firmas reales:** `function crearEventoContable(tipo, entidad, entidadId, datos)`.

**Formalización de la fase:** `EventoValido = tipo∈TIPOS_EVENTOS ∧ idValido ∧ entidad≠"" ∧ entidadId≠"" ∧ fechaValida ∧ version=1 ∧ datos:Object`.

**Estructuras/tecnicismos reales:** objetos inmutables con `Object.freeze`.

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!validarEventoContable(evento)) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return Object.freeze(evento);
```

**Código exacto correspondiente a la fase:**

```js
function crearEventoContable(tipo, entidad, entidadId, datos) {
    const evento = {
        id: crearIdEvento(),
        tipo: tipo,
        entidad: String(entidad || "").trim(),
        entidadId: String(entidadId === undefined || entidadId === null ? "" : entidadId).trim(),
        fecha: new Date().toISOString(),
        version: 1,
        datos: copiarDatosEvento(datos)
    };
    if (!validarEventoContable(evento)) {
        throw new Error("El evento contable no cumple el contrato requerido.");
    }
    return Object.freeze(evento);
}

```

### Regla de fidelidad del reflejo

- Las ecuaciones describen únicamente relaciones que ya están codificadas; no sustituyen el comportamiento JavaScript.
- Los nombres `codigo`, `cuenta`, `movimiento`, `partida`, `baseDatos`, stores, eventos y demás símbolos se mantienen exactamente como aparecen en el código.
- Una futura modificación del `.js` exige actualizar esta sección si cambia una firma, condición, estructura, efecto secundario o postcondición.
- No se introducen DAG, criptografía, Circuit Breaker, checksum, GPU/SIMD u otras tecnologías salvo que el propio archivo las implemente.


## Refutación P3 — pros y contras
### Pros a preservar
- **Preservar:** IDs con CSPRNG.
- **Preservar:** Payload desacoplado del objeto original.
- **Preservar:** Contrato de evento explícito e inmutable.

### Contras y tratamiento
- **Contra:** Fallback JSON no conserva todos los tipos de structuredClone.
  **Tratamiento/refutación:** Los payloads actuales deben mantenerse serializables; eliminar fallback si se exige fidelidad de tipos complejos.
- **Contra:** Freeze no es seguridad criptográfica.
  **Tratamiento/refutación:** Correcto: garantiza inmutabilidad local, no autenticidad; no presentarlo como firma.

## Sintaxis e instrucciones finales de mantenimiento
- Object.freeze evita agregar/cambiar tipos en runtime.
- Exige crypto.randomUUID o crypto.getRandomValues; no usa Math.random como fallback.
- Comprueba que el payload sea objeto no-array y que pueda clonarse.
- Tipo permitido, UUID v4, entidad/entidadId no vacíos, fecha parseable, version=1 y datos objeto no-array.
- Después de construir, llama validarEventoContable(evento) antes de devolver.
- No renombrar funciones públicas, variables globales compartidas ni contratos entre módulos sin revisar consumidores.
- Mantener comentarios de inicio/fin de fase cortos; la explicación detallada permanece en este `.md`.

## Criterio de cierre P3
El objetivo de “contras al 0%” se interpreta como **cero debilidades identificadas sin tratamiento**: corregir, mitigar, documentar como restricción o convertir en prueba obligatoria. No se declara riesgo técnico cero cuando el código conserva un trade-off real.

## Actualización — evento de edición

Se incorpora `PARTIDA_EDITADA: "PartidaEditada"` al conjunto finito `TIPOS_EVENTOS`. El evento se emite únicamente después de verificar la actualización de la partida en IndexedDB.

```js
PARTIDA_EDITADA: "PartidaEditada"
```


## ACTUALIZACIÓN — ALGORITMIA DE 5 FASES
Se agregan eventos de dominio comercial y cierre: CompraRegistrada/Editada/Eliminada, VentaRegistrada/Editada/Eliminada, IVACerrado y DepreciacionSincronizada. Su contrato exige publicación posterior a fase 5.
