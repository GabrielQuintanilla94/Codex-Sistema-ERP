# bus_eventos.js — P3 v3

## Qué es este archivo
Bus EDA local que registra suscriptores, valida/despacha eventos, persiste la publicación y replica eventos entre pestañas cuando existe `BroadcastChannel`.


## Propósito técnico
Bus EDA en memoria con soporte opcional BroadcastChannel: registra consumidores, valida/dispacha eventos y publica solo después de persistirlos.

## Dependencias reales
- TIPOS_EVENTOS, validarEventoContable, crearEventoContable
- guardarEventoBD
- BroadcastChannel opcional

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases y funciones reales de este archivo. No se asume DAG, Circuit Breaker, checksum, Epoll, GPU/SIMD o criptografía si el código no los implementa o no los necesita.

### FASE 00 — Registro de manejadores y canal
**Funciones reales de la fase:** configuración/estado declarado directamente en el módulo.

- **A. Objetivo (DDD):** Mantener infraestructura de mensajería desacoplada del dominio que produce/consume eventos.
- **B. Entrada (Zero-Trust):** Inicializa Map de manejadores, telemetría y canal solo si `BroadcastChannel` existe.
- **C. Validación (Harness IAST):** La ausencia de BroadcastChannel se representa como `null`, no como fallo del bus local.
- **D. Procesamiento:** Conserva sets de manejadores por tipo y contadores de publicados/recibidos/fallidos.
- **E. Decisión:** Broadcast entre pestañas es opcional; despacho local siempre permanece disponible.
- **F. Recuperación:** Si la API no existe, se omite comunicación cross-tab sin romper eventos locales.
- **G. Verificación:** `manejadoresEventos` inicia Map vacío y telemetría en cero.
- **H. Telemetría:** `telemetriaEventos` centraliza contadores y último tipo.

### FASE 01 — Suscripción y desuscripción
**Funciones reales de la fase:** `suscribirEventoContable()`.

- **A. Objetivo (DDD):** Registrar consumidores por tipo de evento sin acoplar productores a funciones concretas.
- **B. Entrada (Zero-Trust):** Recibe `tipo` y `manejador` externos al bus.
- **C. Validación (Harness IAST):** Tipo debe pertenecer a `TIPOS_EVENTOS` y manejador ser función.
- **D. Procesamiento:** Crea `Set` por tipo y agrega la función; devuelve closure de desuscripción.
- **E. Decisión:** Suscripción inválida lanza error antes de mutar el Map.
- **F. Recuperación:** La closure permite retirar el manejador y evitar fugas de suscripción cuando el consumidor deja de usarlo.
- **G. Verificación:** Set evita registrar dos veces la misma referencia de función.
- **H. Telemetría:** No incrementa contadores; solo registra relaciones de consumo.

### FASE 02 — Despacho a consumidores
**Funciones reales de la fase:** `despacharEventoContable()`.

- **A. Objetivo (DDD):** Entregar un evento validado a todos los consumidores locales y aislar fallos entre ellos.
- **B. Entrada (Zero-Trust):** Recibe evento potencialmente local o proveniente de BroadcastChannel.
- **C. Validación (Harness IAST):** `validarEventoContable` es gatekeeper; evento inválido incrementa fallidos y aborta.
- **D. Procesamiento:** Copia manejadores del Set y ejecuta todos con `Promise.allSettled`.
- **E. Decisión:** El fallo de un consumidor no cancela los demás; cada rejection se contabiliza/loguea.
- **F. Recuperación:** Aislamiento por `allSettled` evita propagación en cascada entre consumidores independientes.
- **G. Verificación:** Retorna arreglo de resultados settled para conocer el estado de cada manejador.
- **H. Telemetría:** Incrementa recibidos, fallidos por contrato/consumidor y actualiza último tipo.

### FASE 03 — Publicación persistente y cross-tab
**Funciones reales de la fase:** `publicarEventoContable()`.

- **A. Objetivo (DDD):** Crear, persistir y distribuir un evento en un orden determinista.
- **B. Entrada (Zero-Trust):** Recibe tipo, entidad, entidadId y datos del productor.
- **C. Validación (Harness IAST):** `crearEventoContable` aplica el contrato; `guardarEventoBD` debe completar antes del despacho.
- **D. Procesamiento:** Orden: crear → persistir → despachar local → postMessage opcional → actualizar telemetría.
- **E. Decisión:** Si creación o persistencia falla, no se considera publicado y no debe despacharse.
- **F. Recuperación:** Errores de persistencia/despacho se propagan al productor; recepción cross-tab captura/loguea rechazos.
- **G. Verificación:** Evento devuelto es el mismo que se persistió y se despachó.
- **H. Telemetría:** `publicados++` solo después de completar la secuencia de publicación.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `manejadoresEventos : TipoEvento → Set<Function>`.
- `SuscripcionValida = tipo∈TIPOS_EVENTOS ∧ typeof manejador="function"`.
- `Despacho(e)=Promise.allSettled({h(e) | h∈manejadoresEventos[e.tipo]})`.
- `Publicar(e) = validar(e) → guardarEventoBD(e) → despachar(e) → BroadcastChannel.postMessage(e)`.

### Declaraciones y estado de módulo reflejados desde el código

```js
const manejadoresEventos = new Map();
const telemetriaEventos = {
    publicados: 0,
    recibidos: 0,
    fallidos: 0,
    ultimoTipo: "Sin eventos"
};
const canalEventosContables = typeof BroadcastChannel === "function"
    ? new BroadcastChannel("libro-diario-eventos")
    : null;
if (canalEventosContables) {
    canalEventosContables.onmessage = function(mensaje) {
        despacharEventoContable(mensaje.data).catch(function(error) {
            console.error("No fue posible recibir el evento contable:", error.message);
        });
    };
}
```

### FASE 00 — Registro de manejadores y canal — espejo técnico

**Alcance:** constantes/estado de módulo y dependencias previas a la ejecución de funciones.

**Formalización de la fase:** `Dispatch(e)={h(e) | h∈manejadoresEventos[e.tipo]}` y se resuelve con `Promise.allSettled` para aislar fallos entre manejadores.

**Estructuras/tecnicismos reales:** `Map`, `BroadcastChannel`.

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

### FASE 01 — Suscripción y desuscripción — espejo técnico

**Firmas reales:** `function suscribirEventoContable(tipo, manejador)`.

**Formalización de la fase:** `Dispatch(e)={h(e) | h∈manejadoresEventos[e.tipo]}` y se resuelve con `Promise.allSettled` para aislar fallos entre manejadores.

**Estructuras/tecnicismos reales:** `Set`.

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!Object.values(TIPOS_EVENTOS).includes(tipo) || typeof manejador !== "function") {
if (!manejadoresEventos.has(tipo)) manejadoresEventos.set(tipo, new Set());
```

**Postcondiciones/retornos observables extraídos:**

```js
return function() {
```

**Código exacto correspondiente a la fase:**

```js
function suscribirEventoContable(tipo, manejador) {
    if (!Object.values(TIPOS_EVENTOS).includes(tipo) || typeof manejador !== "function") {
        throw new Error("La suscripción al evento no es válida.");
    }
    if (!manejadoresEventos.has(tipo)) manejadoresEventos.set(tipo, new Set());
    manejadoresEventos.get(tipo).add(manejador);
    return function() {
        manejadoresEventos.get(tipo).delete(manejador);
    };
}

```

### FASE 02 — Despacho a consumidores — espejo técnico

**Firmas reales:** `async function despacharEventoContable(evento)`.

**Formalización de la fase:** `Dispatch(e)={h(e) | h∈manejadoresEventos[e.tipo]}` y se resuelve con `Promise.allSettled` para aislar fallos entre manejadores.

**Estructuras/tecnicismos reales:** `Array`, `Promise`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!validarEventoContable(evento)) {
if (resultado.status === "rejected") {
```

**Postcondiciones/retornos observables extraídos:**

```js
return manejador(evento);
return resultados;
```

**Código exacto correspondiente a la fase:**

```js
async function despacharEventoContable(evento) {
    if (!validarEventoContable(evento)) {
        telemetriaEventos.fallidos++;
        throw new Error("Se rechazó un evento que no cumple el contrato EDA.");
    }
    telemetriaEventos.recibidos++;
    telemetriaEventos.ultimoTipo = evento.tipo;
    const manejadores = Array.from(manejadoresEventos.get(evento.tipo) || []);
    const resultados = await Promise.allSettled(manejadores.map(function(manejador) {
        return manejador(evento);
    }));
    resultados.forEach(function(resultado) {
        if (resultado.status === "rejected") {
            telemetriaEventos.fallidos++;
            console.error("Un consumidor EDA no procesó el evento:", resultado.reason);
        }
    });
    return resultados;
}

```

### FASE 03 — Publicación persistente y cross-tab — espejo técnico

**Firmas reales:** `async function publicarEventoContable(tipo, entidad, entidadId, datos)`.

**Formalización de la fase:** `Dispatch(e)={h(e) | h∈manejadoresEventos[e.tipo]}` y se resuelve con `Promise.allSettled` para aislar fallos entre manejadores.

**Estructuras/tecnicismos reales:** mensajería `postMessage`.

**Complejidad dominante:** Costo CPU local cercano a `O(1)` más latencia de I/O/asíncrona determinada por la API externa o el almacenamiento.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (canalEventosContables) canalEventosContables.postMessage(evento);
```

**Postcondiciones/retornos observables extraídos:**

```js
return evento;
```

**Código exacto correspondiente a la fase:**

```js
async function publicarEventoContable(tipo, entidad, entidadId, datos) {
    const evento = crearEventoContable(tipo, entidad, entidadId, datos);
    await guardarEventoBD(evento);
    await despacharEventoContable(evento);
    if (canalEventosContables) canalEventosContables.postMessage(evento);
    telemetriaEventos.publicados++;
    telemetriaEventos.ultimoTipo = evento.tipo;
    return evento;
}

```

### Regla de fidelidad del reflejo

- Las ecuaciones describen únicamente relaciones que ya están codificadas; no sustituyen el comportamiento JavaScript.
- Los nombres `codigo`, `cuenta`, `movimiento`, `partida`, `baseDatos`, stores, eventos y demás símbolos se mantienen exactamente como aparecen en el código.
- Una futura modificación del `.js` exige actualizar esta sección si cambia una firma, condición, estructura, efecto secundario o postcondición.
- No se introducen DAG, criptografía, Circuit Breaker, checksum, GPU/SIMD u otras tecnologías salvo que el propio archivo las implemente.


## Refutación P3 — pros y contras
### Pros a preservar
- **Preservar:** Desacopla productores/consumidores.
- **Preservar:** Persistencia antes de despacho.
- **Preservar:** `Promise.allSettled` aísla consumidores.
- **Preservar:** BroadcastChannel es opcional.

### Contras y tratamiento
- **Contra:** Un consumidor fallido no hace rollback del evento persistido.
  **Tratamiento/refutación:** Es comportamiento EDA intencional; tratarlo mediante reintento idempotente solo si el dominio lo exige.
- **Contra:** No hay cola durable de reintentos.
  **Tratamiento/refutación:** No inventar Circuit Breaker/Retry local; añadir solo con requisitos de entrega garantizada.

## Sintaxis e instrucciones finales de mantenimiento
- La ausencia de BroadcastChannel se representa como null, no como fallo del bus local.
- Tipo debe pertenecer a TIPOS_EVENTOS y manejador ser función.
- validarEventoContable es gatekeeper; evento inválido incrementa fallidos y aborta.
- crearEventoContable aplica el contrato; guardarEventoBD debe completar antes del despacho.
- No renombrar funciones públicas, variables globales compartidas ni contratos entre módulos sin revisar consumidores.
- Mantener comentarios de inicio/fin de fase cortos; la explicación detallada permanece en este `.md`.

## Criterio de cierre P3
El objetivo de “contras al 0%” se interpreta como **cero debilidades identificadas sin tratamiento**: corregir, mitigar, documentar como restricción o convertir en prueba obligatoria. No se declara riesgo técnico cero cuando el código conserva un trade-off real.
