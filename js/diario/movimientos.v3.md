# movimientos.js — P3 v3

## Qué es este archivo
Módulo de estado de movimientos que normaliza, valida, copia, reemplaza y verifica la colección compartida de movimientos contables en memoria.


## Propósito técnico
Mantiene el estado global de movimientos en memoria y lo sincroniza mediante un pipeline de entrada, validación, copia, reemplazo y verificación.

## Dependencias reales
- Array global `movimientos`
- telemetriaEstadoMovimientos

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases y funciones reales de este archivo. No se asume DAG, Circuit Breaker, checksum, Epoll, GPU/SIMD o criptografía si el código no los implementa o no los necesita.

### FASE 00 — Estado y telemetría de movimientos
**Funciones reales de la fase:** configuración/estado declarado directamente en el módulo.

- **A. Objetivo (DDD):** Definir el repositorio en memoria consumido por Libro Diario, importación y reportes.
- **B. Entrada (Zero-Trust):** No recibe datos externos; inicializa colección y contadores.
- **C. Validación (Harness IAST):** No aplica a datos todavía; conserva una colección Array como contrato.
- **D. Procesamiento:** Mantiene contadores de recibidos/almacenados y resultado.
- **E. Decisión:** No decide validez de movimientos en esta fase.
- **F. Recuperación:** Estado inicial vacío permite carga posterior desde IndexedDB/JSON.
- **G. Verificación:** `movimientos` debe permanecer Array.
- **H. Telemetría:** `telemetriaEstadoMovimientos` observa cada sincronización.

### FASE 01 — Entrada de colección
**Funciones reales de la fase:** `fase1EntradaMovimientos()`.

- **A. Objetivo (DDD):** Normalizar el valor recibido antes de reemplazar estado global.
- **B. Entrada (Zero-Trust):** Recibe `listaMovimientos`; solo Array se acepta, otro valor se convierte en `[]`.
- **C. Validación (Harness IAST):** Solo valida tipo de colección; la estructura interna se revisa en FASE 02.
- **D. Procesamiento:** Conserva la lista y registra cantidad recibida.
- **E. Decisión:** Array => continúa; no-array => colección vacía.
- **F. Recuperación:** Evita excepciones por métodos de array en entradas inválidas.
- **G. Verificación:** Salida siempre Array.
- **H. Telemetría:** Registra `Entrada recibida`.

### FASE 02 — Validación mínima de movimiento
**Funciones reales de la fase:** `fase2ValidarMovimientos()`.

- **A. Objetivo (DDD):** Rechazar colecciones que contengan objetos incompatibles con el estado del diario.
- **B. Entrada (Zero-Trust):** Array proveniente de FASE 01.
- **C. Validación (Harness IAST):** Cada movimiento debe existir, tener `id`, `numero` y `partida` Array.
- **D. Procesamiento:** Usa `find` para detenerse en el primer elemento inválido.
- **E. Decisión:** Devuelve mensaje de error si encuentra inválido; `""` si toda la colección pasa.
- **F. Recuperación:** No cambia el array global al detectar error.
- **G. Verificación:** La colección aceptada cumple la forma mínima necesaria por Libro Diario.
- **H. Telemetría:** Registra `Estructura validada` o mensaje de rechazo.

### FASE 03 — Copia de colección
**Funciones reales de la fase:** `fase3ProcesarMovimientos()`.

- **A. Objetivo (DDD):** Separar la colección recibida del contenedor que sustituirá el estado global.
- **B. Entrada (Zero-Trust):** Lista ya validada.
- **C. Validación (Harness IAST):** Asume forma mínima aprobada.
- **D. Procesamiento:** `slice()` crea una copia superficial del arreglo; los objetos de movimiento conservan identidad.
- **E. Decisión:** No modifica aún `movimientos`.
- **F. Recuperación:** Al no mutar estado global, una excepción previa deja el estado anterior intacto.
- **G. Verificación:** Longitud de procesados debe igualar longitud de entrada.
- **H. Telemetría:** Registra `Estado procesado`.

### FASE 04 — Reemplazo atómico del contenedor en memoria
**Funciones reales de la fase:** `fase4DecidirMovimientos()`.

- **A. Objetivo (DDD):** Actualizar el contenido de `movimientos` manteniendo la misma referencia global para consumidores existentes.
- **B. Entrada (Zero-Trust):** Debe recibir Array procesado.
- **C. Validación (Harness IAST):** Si no es Array lanza `No se puede reemplazar el estado de movimientos.`
- **D. Procesamiento:** `splice(0, movimientos.length, ...lista)` reemplaza contenido sin reasignar la constante.
- **E. Decisión:** Solo después de validar el tipo se sustituye el estado.
- **F. Recuperación:** Una entrada inválida falla antes del `splice`.
- **G. Verificación:** `telemetriaEstadoMovimientos.almacenados` se iguala a `movimientos.length`.
- **H. Telemetría:** Registra `Estado reemplazado` y cantidad almacenada.

### FASE 05 — Verificación y orquestación
**Funciones reales de la fase:** `fase5VerificarMovimientos()`, `sincronizarMovimientos()`.

- **A. Objetivo (DDD):** Comprobar que la sincronización produjo la cardinalidad y estructura esperadas.
- **B. Entrada (Zero-Trust):** Recibe `cantidadEsperada`; `sincronizarMovimientos` recibe la colección original.
- **C. Validación (Harness IAST):** Comprueba longitud y que toda `partida` siga siendo Array.
- **D. Procesamiento:** El orquestador ejecuta F1→F2→F3→F4→F5 y devuelve la referencia global `movimientos`.
- **E. Decisión:** Verificación falsa lanza excepción; verdadera retorna `true`.
- **F. Recuperación:** El diseño actual no conserva snapshot previo después del `splice`; por eso F2 debe impedir estructuras inválidas antes de F4.
- **G. Verificación:** Postcondición: `movimientos.length === cantidadEsperada` y todas las partidas son arrays.
- **H. Telemetría:** Registra `Estado verificado` o `Estado no verificado`.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `Entrada = Array.isArray(lista) ? lista : []`.
- `Valida(m)=m es objeto ∧ Array.isArray(m.partida)`.
- `procesados = lista.map(copia)`; la colección se reemplaza solo después de validarse.
- `Verificado ⇔ movimientos.length=procesados.length ∧ ∀m∈movimientos:Array.isArray(m.partida)`.

### Declaraciones y estado de módulo reflejados desde el código

```js
const movimientos = [];
const telemetriaEstadoMovimientos = {
    recibidos: 0,
    almacenados: 0,
    resultado: "Sin operaciones"
};
FASE 1
A. Objetivo: recibir una colección para el estado del Libro Diario.
B. Entrada (Zero-Trust): cualquier valor obtenido desde IndexedDB o JSON.
C. Validación: todavía no se acepta su contenido.
D. Procesamiento: asegurar que la entrada sea una lista.
E. Decisión: continuar con el arreglo o utilizar uno vacío.
F. Recuperación: impedir errores de iteración ante valores nulos.
G. Verificación: devolver siempre una colección.
H. Telemetría: contar los elementos recibidos.
FASE 2
A. Objetivo: validar la estructura mínima de cada movimiento.
B. Entrada (Zero-Trust): lista normalizada, todavía no confiable.
C. Validación: objeto, identificador, número y líneas de partida.
D. Procesamiento: revisar todos los elementos sin modificar el estado.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: conservar la colección actual cuando exista un error.
G. Verificación: toda partida debe contener una lista de líneas.
H. Telemetría: registrar aprobación o rechazo estructural.
FASE 3
A. Objetivo: preparar una copia controlada del estado recibido.
B. Entrada (Zero-Trust): lista aprobada por la fase 2.
C. Validación: no reutilizar la referencia externa del arreglo.
D. Procesamiento: crear una copia superficial de la colección.
E. Decisión: entregar la copia a la fase de reemplazo.
F. Recuperación: la colección original permanece disponible.
G. Verificación: la copia debe conservar la misma cantidad.
H. Telemetría: registrar el número de elementos procesados.
FASE 4
A. Objetivo: decidir si el estado compartido debe reemplazarse.
B. Entrada (Zero-Trust): colección procesada y validada.
C. Validación: confirmar que continúa siendo un arreglo.
D. Procesamiento: vaciar y repoblar la colección compartida.
E. Decisión: reemplazar únicamente una entrada válida.
F. Recuperación: lanzar un error antes de alterar el estado.
G. Verificación: movimientos conserva su identidad como constante.
H. Telemetría: registrar cuántos registros se almacenaron.
FASE 5
A. Objetivo: verificar que el estado coincide con la entrada aprobada.
B. Entrada (Zero-Trust): cantidad esperada tras el reemplazo.
C. Validación: comparar cantidades y estructura mínima.
D. Procesamiento: revisar la colección compartida.
E. Decisión: confirmar o lanzar una inconsistencia.
F. Recuperación: permitir que el iniciador muestre el error de carga.
G. Verificación: cada elemento debe conservar una partida.
H. Telemetría: registrar el resultado final de sincronización.
```

### FASE 00 — Estado y telemetría de movimientos — espejo técnico

**Alcance:** constantes/estado de módulo y dependencias previas a la ejecución de funciones.

**Formalización de la fase:** `EstadoNuevo = copia(Entrada)` solamente si la validación es satisfactoria; verificación final exige colección `Array` y `partida` tipo `Array` por movimiento.

**Estructuras/tecnicismos reales:** `Array`.

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

### FASE 01 — Entrada de colección — espejo técnico

**Firmas reales:** `function fase1EntradaMovimientos(listaMovimientos)`.

**Formalización de la fase:** `EstadoNuevo = copia(Entrada)` solamente si la validación es satisfactoria; verificación final exige colección `Array` y `partida` tipo `Array` por movimiento.

**Estructuras/tecnicismos reales:** `Array`.

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Postcondiciones/retornos observables extraídos:**

```js
return entrada;
```

**Código exacto correspondiente a la fase:**

```js
function fase1EntradaMovimientos(listaMovimientos) {
    const entrada = Array.isArray(listaMovimientos) ? listaMovimientos : [];
    telemetriaEstadoMovimientos.recibidos = entrada.length;
    telemetriaEstadoMovimientos.resultado = "Entrada recibida";
    return entrada;
}

```

### FASE 02 — Validación mínima de movimiento — espejo técnico

**Firmas reales:** `function fase2ValidarMovimientos(listaMovimientos)`.

**Formalización de la fase:** `EstadoNuevo = copia(Entrada)` solamente si la validación es satisfactoria; verificación final exige colección `Array` y `partida` tipo `Array` por movimiento.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Postcondiciones/retornos observables extraídos:**

```js
return !movimiento ||
return error;
```

**Código exacto correspondiente a la fase:**

```js
function fase2ValidarMovimientos(listaMovimientos) {
    const invalido = listaMovimientos.find(function(movimiento) {
        return !movimiento ||
            movimiento.id === undefined ||
            !movimiento.numero ||
            !Array.isArray(movimiento.partida);
    });
    const error = invalido ? "Existe un movimiento con estructura inválida." : "";
    telemetriaEstadoMovimientos.resultado = error || "Estructura validada";
    return error;
}

```

### FASE 03 — Copia de colección — espejo técnico

**Firmas reales:** `function fase3ProcesarMovimientos(listaMovimientos)`.

**Formalización de la fase:** `EstadoNuevo = copia(Entrada)` solamente si la validación es satisfactoria; verificación final exige colección `Array` y `partida` tipo `Array` por movimiento.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Postcondiciones/retornos observables extraídos:**

```js
return procesados;
```

**Código exacto correspondiente a la fase:**

```js
function fase3ProcesarMovimientos(listaMovimientos) {
    const procesados = listaMovimientos.slice();
    telemetriaEstadoMovimientos.resultado = "Estado procesado";
    return procesados;
}

```

### FASE 04 — Reemplazo atómico del contenedor en memoria — espejo técnico

**Firmas reales:** `function fase4DecidirMovimientos(listaMovimientos)`.

**Formalización de la fase:** `EstadoNuevo = copia(Entrada)` solamente si la validación es satisfactoria; verificación final exige colección `Array` y `partida` tipo `Array` por movimiento.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!Array.isArray(listaMovimientos)) {
```

**Código exacto correspondiente a la fase:**

```js
function fase4DecidirMovimientos(listaMovimientos) {
    if (!Array.isArray(listaMovimientos)) {
        throw new Error("No se puede reemplazar el estado de movimientos.");
    }
    movimientos.splice(0, movimientos.length, ...listaMovimientos);
    telemetriaEstadoMovimientos.almacenados = movimientos.length;
    telemetriaEstadoMovimientos.resultado = "Estado reemplazado";
}

```

### FASE 05 — Verificación y orquestación — espejo técnico

**Firmas reales:** `function fase5VerificarMovimientos(cantidadEsperada)`, `function sincronizarMovimientos(listaMovimientos)`.

**Formalización de la fase:** `EstadoNuevo = copia(Entrada)` solamente si la validación es satisfactoria; verificación final exige colección `Array` y `partida` tipo `Array` por movimiento.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!verificado) throw new Error("El estado de movimientos no pudo verificarse.");
if (error) throw new Error(error);
```

**Postcondiciones/retornos observables extraídos:**

```js
return Array.isArray(movimiento.partida);
return true;
return movimientos;
```

**Código exacto correspondiente a la fase:**

```js
function fase5VerificarMovimientos(cantidadEsperada) {
    const verificado = movimientos.length === cantidadEsperada &&
        movimientos.every(function(movimiento) {
            return Array.isArray(movimiento.partida);
        });
    telemetriaEstadoMovimientos.resultado = verificado
        ? "Estado verificado"
        : "Estado no verificado";
    if (!verificado) throw new Error("El estado de movimientos no pudo verificarse.");
    return true;
}

function sincronizarMovimientos(listaMovimientos) {
    const entrada = fase1EntradaMovimientos(listaMovimientos);
    const error = fase2ValidarMovimientos(entrada);
    if (error) throw new Error(error);
    const procesados = fase3ProcesarMovimientos(entrada);
    fase4DecidirMovimientos(procesados);
    fase5VerificarMovimientos(procesados.length);
    return movimientos;
}

```

### Regla de fidelidad del reflejo

- Las ecuaciones describen únicamente relaciones que ya están codificadas; no sustituyen el comportamiento JavaScript.
- Los nombres `codigo`, `cuenta`, `movimiento`, `partida`, `baseDatos`, stores, eventos y demás símbolos se mantienen exactamente como aparecen en el código.
- Una futura modificación del `.js` exige actualizar esta sección si cambia una firma, condición, estructura, efecto secundario o postcondición.
- No se introducen DAG, criptografía, Circuit Breaker, checksum, GPU/SIMD u otras tecnologías salvo que el propio archivo las implemente.


## Refutación P3 — pros y contras
### Pros a preservar
- **Preservar:** Mantiene referencia estable de `movimientos`.
- **Preservar:** Validación antes de mutar estado.
- **Preservar:** Pipeline pequeño y determinista.

### Contras y tratamiento
- **Contra:** Copia superficial no aísla objetos internos.
  **Tratamiento/refutación:** No mutar objetos recibidos después de sincronizar; usar copia profunda solo si el contrato futuro exige aislamiento.
- **Contra:** FASE 05 no restaura snapshot si fallara tras el splice.
  **Tratamiento/refutación:** Fortalecer con snapshot únicamente si se amplían verificaciones que puedan fallar después de F4.

## Sintaxis e instrucciones finales de mantenimiento
- No aplica a datos todavía; conserva una colección Array como contrato.
- Solo valida tipo de colección; la estructura interna se revisa en FASE 02.
- Cada movimiento debe existir, tener id, numero y partida Array.
- Asume forma mínima aprobada.
- Si no es Array lanza No se puede reemplazar el estado de movimientos.
- Comprueba longitud y que toda partida siga siendo Array.
- No renombrar funciones públicas, variables globales compartidas ni contratos entre módulos sin revisar consumidores.
- Mantener comentarios de inicio/fin de fase cortos; la explicación detallada permanece en este `.md`.

## Criterio de cierre P3
El objetivo de “contras al 0%” se interpreta como **cero debilidades identificadas sin tratamiento**: corregir, mitigar, documentar como restricción o convertir en prueba obligatoria. No se declara riesgo técnico cero cuando el código conserva un trade-off real.
