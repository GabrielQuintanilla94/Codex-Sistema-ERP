# base_datos.js — P3 v3

## Qué es este archivo
Módulo adaptador de persistencia local que encapsula IndexedDB y actúa como frontera entre la aplicación y los stores `cuentas`, `movimientos`, `eventos`, `proyecciones` e `inventario`.

## Propósito técnico
Abrir y versionar `LibroDiarioDAG_v3`, ejecutar transacciones mediante un pipeline común y exponer CRUD para cuentas, movimientos, eventos, proyecciones e inventario. No contiene reglas de partida doble, valuación de inventario ni lógica de interfaz.

## Dependencias reales
- API nativa IndexedDB.
- `NOMBRE_BASE_DATOS = "LibroDiarioDAG_v3"`.
- `VERSION_BASE_DATOS = 6`.
- Stores `cuentas`, `movimientos`, `eventos`, `proyecciones`, `inventario`.

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases reales. El módulo valida solicitudes de almacenamiento, ejecuta transacciones, espera commit y centraliza telemetría. No se asumen DAG, criptografía, Circuit Breaker o lógica contable dentro de esta capa.

### FASE 00 — Configuración, estado y telemetría
**Función real:** `registrarTelemetriaBD()`.

- **A. Objetivo (DDD):** definir nombres, versión, stores y estado de conexión de la capa de persistencia.
- **B. Entrada (Zero-Trust):** la telemetría recibe nombre de operación y bandera de error.
- **C. Validación:** la configuración debe conservar contratos de store/keyPath; un cambio requiere migración de versión.
- **D. Procesamiento:** actualiza `ultimaOperacion` y uno de los contadores.
- **E. Decisión:** `esError` decide entre `errores++` y `operaciones++`.
- **F. Recuperación:** la telemetría no sustituye la excepción original.
- **G. Verificación:** solo un contador debe incrementarse por llamada.
- **H. Telemetría:** `operaciones`, `errores`, `ultimaOperacion`.

### FASE 01 — Normalización de operación
**Función real:** `fase1EntradaBD()`.

- **A. Objetivo:** convertir los parámetros CRUD a una operación uniforme.
- **B. Entrada:** `almacen`, `modo`, `nombre`, `ejecutar`.
- **C. Validación:** se aplaza a FASE 02.
- **D. Procesamiento:** normaliza texto con `String(...)`.
- **E. Decisión:** nombre falsy usa `"Operación desconocida"`.
- **F. Recuperación:** evita `null/undefined` en cadenas, sin inventar stores o modos.
- **G. Verificación:** salida con cuatro campos.
- **H. Telemetría:** conserva el nombre para fases posteriores.

### FASE 02 — Validación Fail-Fast
**Función real:** `fase2ValidarBD()`.

- **A. Objetivo:** impedir transacciones inválidas.
- **B. Entrada:** operación normalizada.
- **C. Validación:** base abierta, store existente, modo permitido y callback ejecutable.
- **D. Procesamiento:** solo consulta estado/configuración; no escribe.
- **E. Decisión:** devuelve `""` o el primer mensaje de error.
- **F. Recuperación:** rechazo antes de crear la transacción.
- **G. Verificación:** usa `objectStoreNames.contains`.
- **H. Telemetría:** el orquestador registra el rechazo.

### FASE 03 — Ejecución transaccional
**Función real:** `fase3ProcesarBD()`.

- **A. Objetivo:** ejecutar una operación dentro de una transacción IndexedDB.
- **B. Entrada:** operación aprobada.
- **C. Validación:** IndexedDB aplica restricciones del store y keyPath.
- **D. Procesamiento:** abre transacción, obtiene store y ejecuta el callback.
- **E. Decisión:** `resolve` solo en `transaccion.oncomplete`; errores/abortos rechazan.
- **F. Recuperación:** excepción síncrona ejecuta `abort()`.
- **G. Verificación:** request exitosa no equivale a commit; se espera `oncomplete`.
- **H. Telemetría:** la FASE 04 contabiliza el resultado.

### FASE 04 — Resolución y telemetría
**Función real:** `fase4DecidirBD()`.

- **A. Objetivo:** devolver el resultado confirmado o propagar el error.
- **B. Entrada:** promesa transaccional y nombre.
- **C. Validación:** `await` dentro de `try/catch`.
- **D. Procesamiento:** no transforma el resultado.
- **E. Decisión:** éxito/error según resolución de la promesa.
- **F. Recuperación:** relanza la causa recibida.
- **G. Verificación:** éxito solo después del commit.
- **H. Telemetría:** registra una operación o un error.

### FASE 05 — Verificación, esquema y CRUD
**Funciones reales:** `fase5VerificarBD()`, `ejecutarOperacionBD()`, `abrirBaseDatos()` y todos los métodos `guardar/obtener/eliminar`.

- **A. Objetivo:** cerrar el pipeline, crear/migrar el esquema y exponer operaciones de persistencia.
- **B. Entrada:** resultados, verificadores y objetos de dominio de cada store.
- **C. Validación:** listados `getAll()` usan `Array.isArray`; `abrirBaseDatos` crea stores que no existan.
- **D. Procesamiento:** F1→F2→F3→F4→F5; CRUD traduce cada operación a `put`, `add`, `get`, `getAll` o `delete`.
- **E. Decisión:** cuentas/proyecciones/inventario usan `put`; movimientos/eventos usan `add`.
- **F. Recuperación:** errores se propagan; `onversionchange` cierra la conexión.
- **G. Verificación:** stores y claves: `cuentas(codigo)`, `movimientos(id)`, `eventos(id)`, `proyecciones(id)`, `inventario(sku)`.
- **H. Telemetría:** apertura, bloqueo y todas las operaciones pasan por el mismo registro.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

### Modelo formal global

`O = (almacen, modo, nombre, ejecutar)`

`Valida(O) = (baseDatos ≠ null) ∧ contains(objectStoreNames, almacen) ∧ (modo ∈ {"readonly","readwrite"}) ∧ callable(ejecutar)`

`¬Valida(O) ⇒ transacción = ∅ ∧ throw Error`

`Commit(O) ⇔ transaction.oncomplete`

`Stores = {cuentas, movimientos, eventos, proyecciones, inventario}`

Mapeo de clave primaria:

`K(cuentas)=codigo`

`K(movimientos)=id`

`K(eventos)=id`

`K(proyecciones)=id`

`K(inventario)=sku`

Semántica de escritura implementada:

`cuentas → put`

`movimientos → add`

`eventos → add`

`proyecciones → put`

`inventario → put`

Telemetría:

`esError=false ⇒ operaciones(t+1)=operaciones(t)+1`

`esError=true ⇒ errores(t+1)=errores(t)+1`

### Esquema IndexedDB versión 6

```js
const NOMBRE_BASE_DATOS = "LibroDiarioDAG_v3";
const VERSION_BASE_DATOS = 6;
const ALMACEN_CUENTAS = "cuentas";
const ALMACEN_MOVIMIENTOS = "movimientos";
const ALMACEN_EVENTOS = "eventos";
const ALMACEN_PROYECCIONES = "proyecciones";
const ALMACEN_INVENTARIO = "inventario";
```

Store de inventario añadido por la versión actual:

```js
if (!bd.objectStoreNames.contains(ALMACEN_INVENTARIO)) {
    const inventario = bd.createObjectStore(ALMACEN_INVENTARIO, { keyPath: "sku" });
    inventario.createIndex("por_descripcion", "descripcion", { unique: false });
}
```

CRUD de inventario:

```js
function guardarInventarioBD(producto) {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readwrite", "Guardar inventario", function(almacen) {
        return almacen.put(producto);
    });
}
function obtenerInventarioBD(sku) {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readonly", "Obtener inventario", function(almacen) {
        return almacen.get(sku);
    });
}
function obtenerInventariosBD() {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readonly", "Obtener inventarios", function(almacen) {
        return almacen.getAll();
    }, Array.isArray);
}
function eliminarInventarioBD(sku) {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readwrite", "Eliminar inventario", function(almacen) {
        return almacen.delete(sku);
    });
}
```

### Complejidad dominante
- Pipeline y CRUD individual: `O(1)` respecto a colecciones JavaScript, más el costo interno de IndexedDB.
- `guardarCuentasBD(cuentas)`: `O(n)` requests `put` dentro de una transacción.
- `guardarMovimientosBD(listaMovimientos)`: `O(n)` requests `add`.
- `getAll()`: materializa `O(n)` registros en memoria para el store consultado.

### Código exacto del módulo

```js
const NOMBRE_BASE_DATOS = "LibroDiarioDAG_v3";
const VERSION_BASE_DATOS = 6;
const ALMACEN_CUENTAS = "cuentas";
const ALMACEN_MOVIMIENTOS = "movimientos";
const ALMACEN_EVENTOS = "eventos";
const ALMACEN_PROYECCIONES = "proyecciones";
const ALMACEN_INVENTARIO = "inventario";
let baseDatos;
const telemetriaBaseDatos = {
    operaciones: 0,
    errores: 0,
    ultimaOperacion: "Sin operaciones"
};
function registrarTelemetriaBD(operacion, esError) {
    telemetriaBaseDatos.ultimaOperacion = operacion;
    if (esError) {
        telemetriaBaseDatos.errores++;
    } else {
        telemetriaBaseDatos.operaciones++;
    }
}
/*
FASE 1
A. Objetivo: recibir y normalizar una solicitud de almacenamiento.
B. Entrada (Zero-Trust): almacén, modo, nombre y función recibidos sin confiar.
C. Validación: aplazada hasta la fase 2.
D. Procesamiento: construir un objeto uniforme.
E. Decisión: enviar la operación normalizada a validación.
F. Recuperación: sustituir valores ausentes por valores controlados.
G. Verificación: comprobar que el objeto contiene las propiedades esperadas.
H. Telemetría: conservar el nombre de la operación solicitada.
*/
function fase1EntradaBD(almacen, modo, nombre, ejecutar) {
    return {
        almacen: String(almacen || ""),
        modo: String(modo || ""),
        nombre: String(nombre || "Operación desconocida"),
        ejecutar: ejecutar
    };
}
/*
FASE 2
A. Objetivo: impedir transacciones inválidas.
B. Entrada (Zero-Trust): operación normalizada, todavía no autorizada.
C. Validación: conexión, almacén, modo y función ejecutora.
D. Procesamiento: revisar reglas mínimas de IndexedDB.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: detener el proceso antes de modificar datos.
G. Verificación: confirmar que el almacén existe.
H. Telemetría: registrar los rechazos desde el orquestador.
*/
function fase2ValidarBD(operacion) {
    if (!baseDatos) return "La base de datos no está abierta.";
    if (!baseDatos.objectStoreNames.contains(operacion.almacen)) {
        return "El almacén solicitado no existe.";
    }
    if (!["readonly", "readwrite"].includes(operacion.modo)) {
        return "El modo de transacción no es válido.";
    }
    if (typeof operacion.ejecutar !== "function") {
        return "La operación de almacenamiento no es válida.";
    }
    return "";
}
/*
FASE 3
A. Objetivo: ejecutar una transacción atómica.
B. Entrada (Zero-Trust): operación aprobada por la fase 2.
C. Validación: IndexedDB controla claves, índices y estado transaccional.
D. Procesamiento: abrir la transacción y ejecutar la solicitud.
E. Decisión: resolver al completar o rechazar ante error o aborto.
F. Recuperación: IndexedDB revierte automáticamente una transacción abortada.
G. Verificación: esperar transaccion.oncomplete antes de confirmar.
H. Telemetría: la fase 4 registra el resultado final.
*/
function fase3ProcesarBD(operacion) {
    return new Promise(function(resolve, reject) {
        const transaccion = baseDatos.transaction(operacion.almacen, operacion.modo);
        const almacen = transaccion.objectStore(operacion.almacen);
        let resultado;
        try {
            const solicitud = operacion.ejecutar(almacen);
            if (solicitud && typeof solicitud === "object" && "onsuccess" in solicitud) {
                solicitud.onsuccess = function() {
                    resultado = solicitud.result;
                };
                solicitud.onerror = function() {
                    reject(solicitud.error);
                };
            }
        } catch (error) {
            transaccion.abort();
            reject(error);
            return;
        }
        transaccion.oncomplete = function() {
            resolve(resultado);
        };
        transaccion.onerror = function() {
            reject(transaccion.error);
        };
        transaccion.onabort = function() {
            reject(transaccion.error || new Error("La transacción fue cancelada."));
        };
    });
}
/*
FASE 4
A. Objetivo: decidir si la operación se acepta o se rechaza.
B. Entrada (Zero-Trust): promesa de una transacción recién ejecutada.
C. Validación: comprobar su finalización sin errores.
D. Procesamiento: esperar el resultado asíncrono.
E. Decisión: devolver el resultado o propagar el error.
F. Recuperación: registrar el fallo sin ocultar su causa.
G. Verificación: solo contabilizar operaciones completadas.
H. Telemetría: actualizar operaciones, errores y última operación.
*/
async function fase4DecidirBD(promesa, nombre) {
    try {
        const resultado = await promesa;
        registrarTelemetriaBD(nombre, false);
        return resultado;
    } catch (error) {
        registrarTelemetriaBD(nombre, true);
        throw error;
    }
}
/*
FASE 5
A. Objetivo: verificar que el resultado tenga la forma esperada.
B. Entrada (Zero-Trust): resultado devuelto por IndexedDB.
C. Validación: aplicar una función verificadora cuando sea necesaria.
D. Procesamiento: comparar el resultado con la condición esperada.
E. Decisión: devolver el resultado o lanzar una inconsistencia.
F. Recuperación: permitir que el llamador informe o revierta la operación.
G. Verificación: condición explícita y reutilizable.
H. Telemetría: registrar una inconsistencia como error.
*/
function fase5VerificarBD(resultado, verificar, nombre) {
    if (typeof verificar === "function" && !verificar(resultado)) {
        registrarTelemetriaBD(nombre + " sin verificar", true);
        throw new Error("La operación no pudo verificarse.");
    }
    return resultado;
}
async function ejecutarOperacionBD(almacen, modo, nombre, ejecutar, verificar) {
    const operacion = fase1EntradaBD(almacen, modo, nombre, ejecutar);
    const error = fase2ValidarBD(operacion);
    if (error) {
        registrarTelemetriaBD(nombre, true);
        throw new Error(error);
    }
    const resultado = await fase4DecidirBD(fase3ProcesarBD(operacion), nombre);
    return fase5VerificarBD(resultado, verificar, nombre);
}
function abrirBaseDatos() {
    return new Promise(function(resolve, reject) {
        const solicitud = indexedDB.open(NOMBRE_BASE_DATOS, VERSION_BASE_DATOS);
        solicitud.onupgradeneeded = function(evento) {
            const bd = evento.target.result;
            if (!bd.objectStoreNames.contains(ALMACEN_CUENTAS)) {
                const almacen = bd.createObjectStore(ALMACEN_CUENTAS, { keyPath: "codigo" });
                almacen.createIndex("por_padre", "padre", { unique: false });
                almacen.createIndex("por_naturaleza", "naturaleza", { unique: false });
            }
            if (!bd.objectStoreNames.contains(ALMACEN_MOVIMIENTOS)) {
                const movimientos = bd.createObjectStore(ALMACEN_MOVIMIENTOS, { keyPath: "id" });
                movimientos.createIndex("por_fecha", "fecha", { unique: false });
                movimientos.createIndex("por_tipo", "tipo", { unique: false });
                movimientos.createIndex("por_referencia", "referencia", { unique: false });
            }
            if (!bd.objectStoreNames.contains(ALMACEN_EVENTOS)) {
                const eventos = bd.createObjectStore(ALMACEN_EVENTOS, { keyPath: "id" });
                eventos.createIndex("por_tipo", "tipo", { unique: false });
                eventos.createIndex("por_fecha", "fecha", { unique: false });
                eventos.createIndex("por_entidad", "entidad", { unique: false });
            }
            if (!bd.objectStoreNames.contains(ALMACEN_PROYECCIONES)) {
                bd.createObjectStore(ALMACEN_PROYECCIONES, { keyPath: "id" });
            }
            if (!bd.objectStoreNames.contains(ALMACEN_INVENTARIO)) {
                const inventario = bd.createObjectStore(ALMACEN_INVENTARIO, { keyPath: "sku" });
                inventario.createIndex("por_descripcion", "descripcion", { unique: false });
            }
        };
        solicitud.onsuccess = function(evento) {
            baseDatos = evento.target.result;
            baseDatos.onversionchange = function() {
                baseDatos.close();
            };
            registrarTelemetriaBD("Abrir base de datos", false);
            resolve(baseDatos);
        };
        solicitud.onerror = function() {
            registrarTelemetriaBD("Abrir base de datos", true);
            reject(solicitud.error);
        };
        solicitud.onblocked = function() {
            registrarTelemetriaBD("Actualización bloqueada", true);
        };
    });
}
function guardarCuentaBD(cuenta) {
    return ejecutarOperacionBD(
        ALMACEN_CUENTAS,
        "readwrite",
        "Guardar cuenta",
        function(almacen) {
            almacen.put(cuenta);
        }
    );
}
function guardarCuentasBD(cuentas) {
    return ejecutarOperacionBD(
        ALMACEN_CUENTAS,
        "readwrite",
        "Guardar cuentas",
        function(almacen) {
            cuentas.forEach(function(cuenta) {
                almacen.put(cuenta);
            });
        }
    );
}
function obtenerCuentasBD() {
    return ejecutarOperacionBD(
        ALMACEN_CUENTAS,
        "readonly",
        "Obtener cuentas",
        function(almacen) {
            return almacen.getAll();
        },
        Array.isArray
    );
}
function obtenerCuentaBD(codigo) {
    return ejecutarOperacionBD(
        ALMACEN_CUENTAS,
        "readonly",
        "Obtener cuenta",
        function(almacen) {
            return almacen.get(codigo);
        }
    );
}
function eliminarCuentaBD(codigo) {
    return ejecutarOperacionBD(
        ALMACEN_CUENTAS,
        "readwrite",
        "Eliminar cuenta",
        function(almacen) {
            almacen.delete(codigo);
        }
    );
}
function guardarMovimientoBD(movimiento) {
    return ejecutarOperacionBD(
        ALMACEN_MOVIMIENTOS,
        "readwrite",
        "Guardar movimiento",
        function(almacen) {
            almacen.add(movimiento);
        }
    );
}
function guardarMovimientosBD(listaMovimientos) {
    return ejecutarOperacionBD(
        ALMACEN_MOVIMIENTOS,
        "readwrite",
        "Guardar movimientos",
        function(almacen) {
            listaMovimientos.forEach(function(movimiento) {
                almacen.add(movimiento);
            });
        }
    );
}
function obtenerMovimientosBD() {
    return ejecutarOperacionBD(
        ALMACEN_MOVIMIENTOS,
        "readonly",
        "Obtener movimientos",
        function(almacen) {
            return almacen.getAll();
        },
        Array.isArray
    );
}
function obtenerMovimientoBD(id) {
    return ejecutarOperacionBD(
        ALMACEN_MOVIMIENTOS,
        "readonly",
        "Obtener movimiento",
        function(almacen) {
            return almacen.get(id);
        }
    );
}
function eliminarMovimientoBD(id) {
    return ejecutarOperacionBD(
        ALMACEN_MOVIMIENTOS,
        "readwrite",
        "Eliminar movimiento",
        function(almacen) {
            almacen.delete(id);
        }
    );
}

function guardarEventoBD(evento) {
return ejecutarOperacionBD(
ALMACEN_EVENTOS,
"readwrite",
"Guardar evento",
function(almacen) {
almacen.add(evento);
}
);
}
function obtenerEventosBD() {
return ejecutarOperacionBD(
ALMACEN_EVENTOS,
"readonly",
"Obtener eventos",
function(almacen) {
return almacen.getAll();
},
Array.isArray
);
}
function guardarProyeccionBD(proyeccion) {
return ejecutarOperacionBD(
ALMACEN_PROYECCIONES,
"readwrite",
"Guardar proyección",
function(almacen) {
almacen.put(proyeccion);
}
);
}
function obtenerProyeccionBD(id) {
return ejecutarOperacionBD(
ALMACEN_PROYECCIONES,
"readonly",
"Obtener proyección",
function(almacen) {
return almacen.get(id);
}
);
}

function guardarInventarioBD(producto) {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readwrite", "Guardar inventario", function(almacen) {
        return almacen.put(producto);
    });
}
function obtenerInventarioBD(sku) {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readonly", "Obtener inventario", function(almacen) {
        return almacen.get(sku);
    });
}
function obtenerInventariosBD() {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readonly", "Obtener inventarios", function(almacen) {
        return almacen.getAll();
    }, Array.isArray);
}
function eliminarInventarioBD(sku) {
    return ejecutarOperacionBD(ALMACEN_INVENTARIO, "readwrite", "Eliminar inventario", function(almacen) {
        return almacen.delete(sku);
    });
}
```

## Refutación P3 — pros y contras

### Pros a preservar
- **Preservar:** pipeline CRUD único y reutilizable.
- **Preservar:** confirmación únicamente en `transaction.oncomplete`.
- **Preservar:** separación entre persistencia y reglas de dominio.
- **Preservar:** store `inventario` desacoplado de cuentas/movimientos.
- **Preservar:** semántica `put` para estado por SKU, permitiendo actualizar la misma clave.

### Contras y tratamiento
- **Contra:** `onblocked` registra el bloqueo pero la promesa de apertura puede seguir pendiente.
  **Tratamiento/refutación:** conservar por compatibilidad y cerrar conexiones viejas mediante `onversionchange`; si se requiere UX específica, manejar el bloqueo en una revisión posterior.
- **Contra:** `getAll()` carga el store completo en memoria.
  **Tratamiento/refutación:** aceptable para el volumen actual; migrar a cursor/paginación solo si el tamaño real lo exige.
- **Contra:** `guardarInventarioBD` no valida la forma de `producto`.
  **Tratamiento/refutación:** la validación de dominio pertenece a `inventario_costos.js`; esta capa mantiene su rol de adaptador de persistencia.

## Sintaxis e instrucciones finales de mantenimiento
- No reducir `VERSION_BASE_DATOS` después de introducir el store `inventario`.
- Cualquier cambio de keyPath o índice exige una migración IndexedDB explícita.
- Mantener `Array.isArray` en operaciones `getAll()` que deben retornar listas.
- Mantener `put` para el estado agregado de inventario por `sku`; cambiarlo a `add` alteraría la semántica de actualización.
- No introducir reglas contables o fórmulas de valuación dentro de este archivo.
- No renombrar funciones públicas sin revisar todos los consumidores.

## Criterio de cierre P3
“Contras al 0%” significa que las debilidades conocidas quedan corregidas, mitigadas o documentadas; no significa declarar riesgo técnico cero.

## Migración 6
La versión 6 actualiza la cuenta `5001 Materiales` para permitir movimientos directos, requisito de la partida automática de costo de venta generada por `inventario_ui.js`.


## Actualización — `actualizarMovimientoBD(movimiento)`

Se incorpora una operación explícita de actualización para partidas existentes. A diferencia de `guardarMovimientoBD()`, que conserva semántica `add`, la edición usa `put` porque la clave `id` ya existe.

### A–H
- **A:** actualizar una partida existente. **B:** movimiento validado por la capa del Diario. **C:** store `movimientos` y transacción `readwrite`. **D:** `almacen.put(movimiento)`. **E:** crear/reemplazar exclusivamente por `id`. **F:** propagar errores de IndexedDB. **G:** confirmar únicamente en `transaction.oncomplete`. **H:** usar la telemetría común de `ejecutarOperacionBD`.

```js
function actualizarMovimientoBD(movimiento) {
    return ejecutarOperacionBD(ALMACEN_MOVIMIENTOS, "readwrite", "Actualizar movimiento", function(almacen) {
        return almacen.put(movimiento);
    });
}
```

---
## EXTENSIÓN v7 — COMPRAS, VENTAS Y TERCEROS

El esquema incorpora tres stores sin alterar los existentes:

- `terceros`, clave `nrc`, índice `por_razon_social`.
- `compras`, clave `id`, índices `por_fecha`, `por_documento`, `por_nrc`.
- `ventas`, clave `id`, índices `por_fecha`, `por_documento`, `por_tipo_cliente`, `por_nrc`.

Se agregan CRUD específicos (`guardarTerceroBD`, `guardarTercerosBD`, `obtenerTercerosBD`, `guardarCompraBD`, `obtenerComprasBD`, `eliminarCompraBD`, `guardarVentaBD`, `obtenerVentasBD`, `eliminarVentaBD`) reutilizando `ejecutarOperacionBD`. La versión 7 migra también las cuentas 1105, 1106, 2102 y 2103.
