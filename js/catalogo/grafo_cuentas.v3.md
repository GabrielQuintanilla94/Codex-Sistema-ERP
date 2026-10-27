# grafo_cuentas.js — P3 v3

## Qué es este archivo
Módulo estructural que representa el catálogo como relaciones padre→hijo, valida integridad jerárquica, detecta ciclos y ofrece búsquedas/recorridos sobre las cuentas.


## Propósito técnico
Mantiene el catálogo en memoria y su representación dirigida padre→hijos, valida estructura acíclica, recorre por BFS y controla altas de cuentas sin romper la jerarquía.

## Dependencias reales
- `catalogoCuentas` como colección canónica en memoria
- `grafoCuentas` como adjacency list
- Set/cola para detección de ciclos y BFS

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases y funciones reales de este archivo. No se asume DAG, Circuit Breaker, checksum, Epoll, GPU/SIMD o criptografía si el código no los implementa o no los necesita.

### FASE 00 — Estado del catálogo, grafo y telemetría
**Funciones reales de la fase:** `actualizarTelemetriaGrafo()`.

- **A. Objetivo (DDD):** Definir el bounded context de estructura jerárquica de cuentas en memoria.
- **B. Entrada (Zero-Trust):** No recibe entrada externa; inicializa `catalogoCuentas=[]`, `grafoCuentas={}` y telemetría.
- **C. Validación (Harness IAST):** La telemetría normaliza `nodosProcesados` a número.
- **D. Procesamiento:** `actualizarTelemetriaGrafo` registra resultado y cantidad de nodos.
- **E. Decisión:** No toma decisiones de dominio; solo mantiene estado observable.
- **F. Recuperación:** Estado inicial vacío permite reconstrucción posterior desde catálogo persistido/JSON.
- **G. Verificación:** Catálogo y grafo empiezan vacíos y coherentes.
- **H. Telemetría:** Mantiene nodos procesados, recorridos, ciclos y último resultado.

### FASE 01 — Normalización de colección de cuentas
**Funciones reales de la fase:** `fase1EntradaGrafo()`.

- **A. Objetivo (DDD):** Proveer una colección segura para construir el grafo.
- **B. Entrada (Zero-Trust):** Recibe `cuentas`; si no es array usa `[]`.
- **C. Validación (Harness IAST):** Solo valida tipo de colección; la estructura de cada cuenta se delega a FASE 02.
- **D. Procesamiento:** Devuelve la misma lista válida y registra cantidad.
- **E. Decisión:** Array válido continúa; cualquier otro tipo se convierte en colección vacía.
- **F. Recuperación:** Evita excepciones por iterar entradas no-array.
- **G. Verificación:** Salida siempre iterable como Array.
- **H. Telemetría:** Registra `Entrada recibida` y longitud.

### FASE 02 — Validación estructural padre/código
**Funciones reales de la fase:** `fase2ValidarGrafo()`.

- **A. Objetivo (DDD):** Garantizar unicidad de códigos y existencia de toda referencia `padre` antes de construir aristas.
- **B. Entrada (Zero-Trust):** Colección normalizada de FASE 01.
- **C. Validación (Harness IAST):** Rechaza cuenta nula/sin código, códigos duplicados y padres que no existen en el mismo catálogo.
- **D. Procesamiento:** Usa `Set` para detectar duplicados en O(n) y una segunda pasada para padres.
- **E. Decisión:** Devuelve el primer mensaje de error o `""` si toda la colección es estructuralmente válida.
- **F. Recuperación:** No muta `grafoCuentas` durante validación; un error impide construcción.
- **G. Verificación:** Cada padre no nulo debe pertenecer al conjunto de códigos.
- **H. Telemetría:** Registra `Catálogo validado` cuando pasa.

### FASE 03 — Construcción adjacency list
**Funciones reales de la fase:** `fase3ProcesarGrafo()`.

- **A. Objetivo (DDD):** Materializar la relación padre→hijos para recorridos y restricciones jerárquicas.
- **B. Entrada (Zero-Trust):** Colección aprobada por FASE 02.
- **C. Validación (Harness IAST):** Asume códigos/padres válidos; solo agrega hijo si existe la entrada del padre.
- **D. Procesamiento:** Primera pasada crea `grafo[codigo]=[]`; segunda agrega cada código al arreglo de su padre.
- **E. Decisión:** Cuentas raíz quedan sin arista entrante; padres acumulan sus hijos directos.
- **F. Recuperación:** Construye un objeto nuevo; no corrompe el grafo global hasta que el llamador lo acepte.
- **G. Verificación:** Cantidad de claves del grafo debe corresponder al número de cuentas.
- **H. Telemetría:** Registra `Grafo construido` y cantidad de nodos.

### FASE 04 — Detección de ciclos
**Funciones reales de la fase:** `detectarCiclo()`, `visitar()`.

- **A. Objetivo (DDD):** Garantizar que la jerarquía permanezca como DAG y no contenga ciclos.
- **B. Entrada (Zero-Trust):** Recibe adjacency list propuesta.
- **C. Validación (Harness IAST):** DFS usa `visitados` y `enRecorrido`; reentrada en `enRecorrido` identifica un ciclo.
- **D. Procesamiento:** Recorre cada nodo y sus hijos recursivamente hasta confirmar DAG o encontrar ciclo.
- **E. Decisión:** Devuelve `true` si hay ciclo; `false` si la topología es acíclica.
- **F. Recuperación:** No muta catálogo ni grafo durante detección; el llamador decide si descarta la propuesta.
- **G. Verificación:** Un nodo ya cerrado en `visitados` no se procesa de nuevo; `enRecorrido` se limpia al retroceder.
- **H. Telemetría:** Incrementa `ciclosDetectados` y registra `Ciclo detectado` o `DAG válido`.

### FASE 05 — Verificación, BFS y alta de cuenta
**Funciones reales de la fase:** `fase5VerificarGrafo()`, `construirGrafo()`, `buscarCuenta()`, `recorrerBFS()`, `validarCuentaNueva()`, `agregarCuenta()`, `obtenerCuentasAuxiliares()`.

- **A. Objetivo (DDD):** Cerrar la consistencia del grafo y exponer operaciones de consulta/alta sin romper la jerarquía.
- **B. Entrada (Zero-Trust):** `fase5VerificarGrafo` recibe catálogo+grafo; `agregarCuenta` recibe una cuenta candidata; BFS recibe código inicial.
- **C. Validación (Harness IAST):** Verifica cardinalidad+cero ciclos; `validarCuentaNueva` controla duplicado, padre inexistente, auto-padre y padre auxiliar.
- **D. Procesamiento:** `agregarCuenta` guarda grafo anterior, agrega cuenta, reconstruye, verifica y solo entonces sustituye `grafoCuentas`; BFS usa cola+Set.
- **E. Decisión:** Si el grafo propuesto falla, elimina la cuenta y restaura estado anterior; si pasa, confirma el nuevo grafo.
- **F. Recuperación:** Rollback explícito con `catalogoCuentas.pop()` y restauración de `grafoAnterior`.
- **G. Verificación:** Alta exitosa implica cuenta presente, grafo con misma cardinalidad y ausencia de ciclos.
- **H. Telemetría:** Registra verificación, recorridos BFS y resultado de operaciones estructurales.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `G=(V,E)` donde `V={codigo de cuenta}` y `E={(padre,hijo) | cuenta.padre=padre}`.
- `DAG(G) ⇔ ¬∃ ciclo dirigido`.
- `CuentaNueva válida ⇒ codigo∉V ∧ (padre=null ∨ padre∈V) ∧ padre≠codigo`.
- `padre.permiteMovimientos=true ⇒ no puede recibir hijos`.
- `BFS(G,s)` usa `visitados:Set` y una cola; complejidad `O(|V|+|E|)`.

### Declaraciones y estado de módulo reflejados desde el código

```js
const catalogoCuentas = [];
let grafoCuentas = {};
const telemetriaGrafo = {
    nodosProcesados: 0,
    recorridos: 0,
    ciclosDetectados: 0,
    ultimoResultado: "Sin operaciones"
};
FASE 1
A. Objetivo: recibir una colección de cuentas para construir el DAG.
B. Entrada (Zero-Trust): cualquier valor recibido como catálogo.
C. Validación: todavía no se acepta su estructura interna.
D. Procesamiento: asegurar una colección iterable.
E. Decisión: continuar con un arreglo o usar uno vacío.
F. Recuperación: evitar fallos cuando el catálogo no sea un arreglo.
G. Verificación: devolver siempre una colección.
H. Telemetría: registrar cuántos nodos se recibieron.
FASE 2
A. Objetivo: validar códigos y relaciones padre-hijo.
B. Entrada (Zero-Trust): catálogo normalizado, todavía no confiable.
C. Validación: códigos únicos y padres existentes.
D. Procesamiento: construir un índice de códigos.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: no modificar el grafo si existe un error.
G. Verificación: revisar cada cuenta una sola vez.
H. Telemetría: registrar el resultado de la validación.
FASE 3
A. Objetivo: transformar las cuentas en una lista de adyacencia.
B. Entrada (Zero-Trust): catálogo aprobado por la fase 2.
C. Validación: aceptar únicamente relaciones con padre registrado.
D. Procesamiento: crear nodos y conectar sus hijos.
E. Decisión: conservar solo relaciones válidas.
F. Recuperación: representar nodos sin hijos con una lista vacía.
G. Verificación: cada código debe existir como clave del grafo.
H. Telemetría: registrar la cantidad de nodos construidos.
FASE 4
A. Objetivo: decidir si la estructura puede aceptarse como DAG.
B. Entrada (Zero-Trust): lista de adyacencia recién construida.
C. Validación: búsqueda en profundidad con conjunto de recorrido.
D. Procesamiento: visitar cada nodo y sus descendientes.
E. Decisión: rechazar al encontrar un nodo activo repetido.
F. Recuperación: permitir que el llamador restaure el grafo anterior.
G. Verificación: revisar todos los componentes del grafo.
H. Telemetría: contar los ciclos detectados.
    const tieneCiclo = Object.keys(grafo).some(visitar);
    if (tieneCiclo) telemetriaGrafo.ciclosDetectados++;
    actualizarTelemetriaGrafo(
        tieneCiclo ? "Ciclo detectado" : "DAG válido",
        Object.keys(grafo).length
    );
    return tieneCiclo;
}
FASE 5
A. Objetivo: verificar y exponer un DAG utilizable.
B. Entrada (Zero-Trust): catálogo y grafo procesados.
C. Validación: confirmar cantidad de nodos y ausencia de ciclos.
D. Procesamiento: comparar claves del grafo con cuentas del catálogo.
E. Decisión: devolver verdadero solo si ambas estructuras coinciden.
F. Recuperación: conservar el grafo previo cuando falle la verificación.
G. Verificación: igualdad de tamaños y prueba final de ciclos.
H. Telemetría: registrar el resultado final.
grafoCuentas = construirGrafo(catalogoCuentas);
```

### FASE 00 — Estado del catálogo, grafo y telemetría — espejo técnico

**Firmas reales:** `function actualizarTelemetriaGrafo(resultado, nodosProcesados)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Código exacto correspondiente a la fase:**

```js
function actualizarTelemetriaGrafo(resultado, nodosProcesados) {
    telemetriaGrafo.ultimoResultado = resultado;
    telemetriaGrafo.nodosProcesados = Number(nodosProcesados || 0);
}

```

### FASE 01 — Normalización de colección de cuentas — espejo técnico

**Firmas reales:** `function fase1EntradaGrafo(cuentas)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** `Array`.

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Postcondiciones/retornos observables extraídos:**

```js
return entrada;
```

**Código exacto correspondiente a la fase:**

```js
function fase1EntradaGrafo(cuentas) {
    const entrada = Array.isArray(cuentas) ? cuentas : [];
    actualizarTelemetriaGrafo("Entrada recibida", entrada.length);
    return entrada;
}

```

### FASE 02 — Validación estructural padre/código — espejo técnico

**Firmas reales:** `function fase2ValidarGrafo(cuentas)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** `Set`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!cuenta || !cuenta.codigo) return "Existe una cuenta sin código.";
if (codigos.has(cuenta.codigo)) return "El código " + cuenta.codigo + " está duplicado.";
if (cuenta.padre && !codigos.has(cuenta.padre)) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return "La cuenta padre " + cuenta.padre + " no existe.";
return "";
```

**Código exacto correspondiente a la fase:**

```js
function fase2ValidarGrafo(cuentas) {
    const codigos = new Set();
    for (const cuenta of cuentas) {
        if (!cuenta || !cuenta.codigo) return "Existe una cuenta sin código.";
        if (codigos.has(cuenta.codigo)) return "El código " + cuenta.codigo + " está duplicado.";
        codigos.add(cuenta.codigo);
    }
    for (const cuenta of cuentas) {
        if (cuenta.padre && !codigos.has(cuenta.padre)) {
            return "La cuenta padre " + cuenta.padre + " no existe.";
        }
    }
    actualizarTelemetriaGrafo("Catálogo validado", cuentas.length);
    return "";
}

```

### FASE 03 — Construcción adjacency list — espejo técnico

**Firmas reales:** `function fase3ProcesarGrafo(cuentas)`.

**Formalización de la fase:** `Adj[u]={v | (u,v)∈E}`; se inicializa una lista para cada `codigo` y se añade cada hijo a su padre.

**Estructuras/tecnicismos reales:** `Array`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (cuenta.padre && grafo[cuenta.padre]) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return grafo;
```

**Código exacto correspondiente a la fase:**

```js
function fase3ProcesarGrafo(cuentas) {
    const grafo = {};
    cuentas.forEach(function(cuenta) {
        grafo[cuenta.codigo] = [];
    });
    cuentas.forEach(function(cuenta) {
        if (cuenta.padre && grafo[cuenta.padre]) {
            grafo[cuenta.padre].push(cuenta.codigo);
        }
    });
    actualizarTelemetriaGrafo("Grafo construido", Object.keys(grafo).length);
    return grafo;
}

```

### FASE 04 — Detección de ciclos — espejo técnico

**Firmas reales:** `function detectarCiclo(grafo)`, `function visitar(nodo)`.

**Formalización de la fase:** `ciclo ⇔ ∃v: v∈enRecorrido durante DFS`; al salir de `v`, `enRecorrido.delete(v)`.

**Estructuras/tecnicismos reales:** `Set`, `Array`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (enRecorrido.has(nodo)) return true;
if (visitados.has(nodo)) return false;
if (visitar(hijo)) return true;
if (tieneCiclo) telemetriaGrafo.ciclosDetectados++;
```

**Postcondiciones/retornos observables extraídos:**

```js
return false;
return tieneCiclo;
```

**Código exacto correspondiente a la fase:**

```js
function detectarCiclo(grafo) {
    const visitados = new Set();
    const enRecorrido = new Set();
    function visitar(nodo) {
        if (enRecorrido.has(nodo)) return true;
        if (visitados.has(nodo)) return false;
        visitados.add(nodo);
        enRecorrido.add(nodo);
        const hijos = grafo[nodo] || [];
        for (const hijo of hijos) {
            if (visitar(hijo)) return true;
        }
        enRecorrido.delete(nodo);
        return false;
    }
    const tieneCiclo = Object.keys(grafo).some(visitar);
    if (tieneCiclo) telemetriaGrafo.ciclosDetectados++;
    actualizarTelemetriaGrafo(
        tieneCiclo ? "Ciclo detectado" : "DAG válido",
        Object.keys(grafo).length
    );
    return tieneCiclo;
}

function visitar(nodo) {
        if (enRecorrido.has(nodo)) return true;
        if (visitados.has(nodo)) return false;
        visitados.add(nodo);
        enRecorrido.add(nodo);
        const hijos = grafo[nodo] || [];
        for (const hijo of hijos) {
            if (visitar(hijo)) return true;
        }
        enRecorrido.delete(nodo);
        return false;
    }

```

### FASE 05 — Verificación, BFS y alta de cuenta — espejo técnico

**Firmas reales:** `function fase5VerificarGrafo(cuentas, grafo)`, `function construirGrafo(cuentas)`, `function buscarCuenta(codigo)`, `function recorrerBFS(codigoInicial)`, `function validarCuentaNueva(cuenta)`, `function agregarCuenta(cuenta)`, `function obtenerCuentasAuxiliares()`.

**Formalización de la fase:** `BFS(s)` visita cada nodo alcanzable una vez: `O(|V|+|E|)`.

**Estructuras/tecnicismos reales:** `Set`, `Array`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (error) {
if (!grafoCuentas[codigoInicial]) return [];
if (visitados.has(codigo)) continue;
if (cuenta) resultado.push(cuenta);
if (buscarCuenta(cuenta.codigo)) return "El código ya existe.";
if (cuenta.padre && !buscarCuenta(cuenta.padre)) return "La cuenta padre no existe.";
if (cuenta.padre === cuenta.codigo) return "Una cuenta no puede ser su propio padre.";
if (padre && padre.permiteMovimientos) {
if (error) return error;
if (!fase5VerificarGrafo(catalogoCuentas, grafoPropuesto)) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return verificado;
return {};
return fase3ProcesarGrafo(entrada);
return catalogoCuentas.find(function(cuenta) {
return cuenta.codigo === codigo;
return resultado;
return "Una cuenta auxiliar no puede recibir cuentas hijas.";
return "";
```

**Código exacto correspondiente a la fase:**

```js
function fase5VerificarGrafo(cuentas, grafo) {
    const verificado = Object.keys(grafo).length === cuentas.length && !detectarCiclo(grafo);
    actualizarTelemetriaGrafo(
        verificado ? "Grafo verificado" : "Grafo no verificado",
        cuentas.length
    );
    return verificado;
}

function construirGrafo(cuentas) {
    const entrada = fase1EntradaGrafo(cuentas);
    const error = fase2ValidarGrafo(entrada);
    if (error) {
        actualizarTelemetriaGrafo(error, entrada.length);
        return {};
    }
    return fase3ProcesarGrafo(entrada);
}

function buscarCuenta(codigo) {
    return catalogoCuentas.find(function(cuenta) {
        return cuenta.codigo === codigo;
    });
}

function recorrerBFS(codigoInicial) {
    if (!grafoCuentas[codigoInicial]) return [];
    const cola = [codigoInicial];
    const visitados = new Set();
    const resultado = [];
    let posicion = 0;
    while (posicion < cola.length) {
        const codigo = cola[posicion++];
        if (visitados.has(codigo)) continue;
        visitados.add(codigo);
        const cuenta = buscarCuenta(codigo);
        if (cuenta) resultado.push(cuenta);
        cola.push(...(grafoCuentas[codigo] || []));
    }
    telemetriaGrafo.recorridos++;
    actualizarTelemetriaGrafo("Recorrido BFS completado", resultado.length);
    return resultado;
}

function validarCuentaNueva(cuenta) {
    if (buscarCuenta(cuenta.codigo)) return "El código ya existe.";
    if (cuenta.padre && !buscarCuenta(cuenta.padre)) return "La cuenta padre no existe.";
    if (cuenta.padre === cuenta.codigo) return "Una cuenta no puede ser su propio padre.";
    const padre = cuenta.padre ? buscarCuenta(cuenta.padre) : null;
    if (padre && padre.permiteMovimientos) {
        return "Una cuenta auxiliar no puede recibir cuentas hijas.";
    }
    return "";
}

function agregarCuenta(cuenta) {
    const error = validarCuentaNueva(cuenta);
    if (error) return error;
    const grafoAnterior = grafoCuentas;
    catalogoCuentas.push(cuenta);
    const grafoPropuesto = construirGrafo(catalogoCuentas);
    if (!fase5VerificarGrafo(catalogoCuentas, grafoPropuesto)) {
        catalogoCuentas.pop();
        grafoCuentas = grafoAnterior;
        return "La relación produciría un grafo inválido.";
    }
    grafoCuentas = grafoPropuesto;
    return "";
}

function obtenerCuentasAuxiliares() {
    return catalogoCuentas.filter(function(cuenta) {
        return cuenta.permiteMovimientos;
    });
}

```

### Regla de fidelidad del reflejo

- Las ecuaciones describen únicamente relaciones que ya están codificadas; no sustituyen el comportamiento JavaScript.
- Los nombres `codigo`, `cuenta`, `movimiento`, `partida`, `baseDatos`, stores, eventos y demás símbolos se mantienen exactamente como aparecen en el código.
- Una futura modificación del `.js` exige actualizar esta sección si cambia una firma, condición, estructura, efecto secundario o postcondición.
- No se introducen DAG, criptografía, Circuit Breaker, checksum, GPU/SIMD u otras tecnologías salvo que el propio archivo las implemente.


## Refutación P3 — pros y contras
### Pros a preservar
- **Preservar:** Detección explícita de ciclos.
- **Preservar:** Rollback antes de confirmar un grafo inválido.
- **Preservar:** Set/Map implícito mediante objetos para búsquedas estructurales.
- **Preservar:** BFS iterativo evita recursión en recorridos normales.

### Contras y tratamiento
- **Contra:** `buscarCuenta` usa `Array.find` O(n).
  **Tratamiento/refutación:** Aceptable para catálogo pequeño; migrar a Map solo si se cambia de forma coordinada el estado canónico.
- **Contra:** DFS de ciclos es recursivo.
  **Tratamiento/refutación:** Para catálogos extremadamente profundos podría usarse pila iterativa; no es necesario para el alcance actual.

## Sintaxis e instrucciones finales de mantenimiento
- La telemetría normaliza nodosProcesados a número.
- Solo valida tipo de colección; la estructura de cada cuenta se delega a FASE 02.
- Rechaza cuenta nula/sin código, códigos duplicados y padres que no existen en el mismo catálogo.
- Asume códigos/padres válidos; solo agrega hijo si existe la entrada del padre.
- DFS usa visitados y enRecorrido; reentrada en enRecorrido identifica un ciclo.
- Verifica cardinalidad+cero ciclos; validarCuentaNueva controla duplicado, padre inexistente, auto-padre y padre auxiliar.
- No renombrar funciones públicas, variables globales compartidas ni contratos entre módulos sin revisar consumidores.
- Mantener comentarios de inicio/fin de fase cortos; la explicación detallada permanece en este `.md`.

## Criterio de cierre P3
El objetivo de “contras al 0%” se interpreta como **cero debilidades identificadas sin tratamiento**: corregir, mitigar, documentar como restricción o convertir en prueba obligatoria. No se declara riesgo técnico cero cuando el código conserva un trade-off real.
