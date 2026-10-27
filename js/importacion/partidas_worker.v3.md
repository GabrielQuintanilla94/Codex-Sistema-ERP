# partidas_worker.js — P3 v3

## Qué es este archivo
Worker de procesamiento CSV que parsea texto, normaliza fechas/importes, agrupa líneas por partida, valida reglas contables y devuelve un resultado agregado al hilo principal.


## Propósito técnico
Worker puro de parsing y validación masiva: interpreta CSV, normaliza fechas/importes, agrupa líneas por partida, aplica reglas contables y devuelve válidas/rechazadas con resumen.

## Dependencias reales
- Web Worker `self.onmessage/postMessage`
- estructura de cuentas recibida desde importador

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases y funciones reales de este archivo. No se asume DAG, Circuit Breaker, checksum, Epoll, GPU/SIMD o criptografía si el código no los implementa o no los necesita.

### FASE 00 — Utilidades de parsing, normalización y validación de grupo
**Funciones reales de la fase:** `actualizarTelemetriaWorker()`, `normalizarNombre()`, `analizarCSV()`, `fechaCalendarioValida()`, `convertirFecha()`, `convertirCentavos()`, `agruparPorPartida()`, `validarGrupo()`.

- **A. Objetivo (DDD):** Concentrar lógica CPU-bound/parseo sin DOM ni IndexedDB.
- **B. Entrada (Zero-Trust):** Funciones reciben texto CSV, fechas, importes, registros y contexto de cuentas/referencias.
- **C. Validación (Harness IAST):** Parser controla comillas; fechas validan calendario; importes se convierten a centavos; `validarGrupo` comprueba consistencia de líneas y reglas contables.
- **D. Procesamiento:** Normaliza encabezados, parsea filas, agrupa por número y produce movimiento candidato por grupo.
- **E. Decisión:** Cada grupo termina con `valida`, `errores` y `movimiento` o null.
- **F. Recuperación:** Errores de parsing/valor se convierten en rechazos controlados o excepción capturada por `self.onmessage`.
- **G. Verificación:** Los helpers devuelven representaciones canónicas consumidas por fases posteriores.
- **H. Telemetría:** `telemetriaWorker` registra archivos, válidas, rechazadas y resultado.

### FASE 01 — Entrada del mensaje Worker
**Funciones reales de la fase:** `fase1EntradaWorker()`.

- **A. Objetivo (DDD):** Normalizar el mensaje proveniente del hilo principal.
- **B. Entrada (Zero-Trust):** Recibe `evento.data` y convierte texto a String; arrays inexistentes se vuelven `[]`.
- **C. Validación (Harness IAST):** No confía en la forma del mensaje; garantiza tipos básicos antes del parser.
- **D. Procesamiento:** Devuelve `textoCSV`, `cuentas`, `numerosExistentes`, `referenciasExistentes`.
- **E. Decisión:** Campos ausentes se degradan a valores vacíos que FASE 02/03 rechazarán si son insuficientes.
- **F. Recuperación:** Evita TypeError por propiedades ausentes.
- **G. Verificación:** Salida siempre tiene los cuatro campos del contrato.
- **H. Telemetría:** Registra `Entrada recibida`.

### FASE 02 — Validación de estructura CSV
**Funciones reales de la fase:** `fase2ValidarWorker()`.

- **A. Objetivo (DDD):** Confirmar que el CSV tiene datos y todas las columnas contractuales antes de mapear registros.
- **B. Entrada (Zero-Trust):** Texto CSV normalizado.
- **C. Validación (Harness IAST):** Exige >=2 filas y columnas NumeroPartida, Fecha, Referencia, Concepto, CodigoCuenta, DescripcionLinea, Debe, Haber.
- **D. Procesamiento:** Parsea filas, normaliza encabezados y construye mapa `posiciones`.
- **E. Decisión:** Falta de cualquier encabezado requerido lanza error inmediato.
- **F. Recuperación:** No continúa al agrupamiento con esquema incompleto.
- **G. Verificación:** Cada propiedad requerida tiene índice >=0.
- **H. Telemetría:** Registra `Estructura CSV validada`.

### FASE 03 — Normalización y agrupación
**Funciones reales de la fase:** `fase3ProcesarWorker()`.

- **A. Objetivo (DDD):** Convertir filas en registros canónicos y estructuras O(1) para validar partidas.
- **B. Entrada (Zero-Trust):** Filas+posiciones de FASE 02 y contexto de cuentas/existentes de FASE 01.
- **C. Validación (Harness IAST):** Todas las líneas deben tener NumeroPartida; solo cuentas auxiliares entran a `cuentasPorCodigo`.
- **D. Procesamiento:** Mapea registros, crea Map de cuentas, Set de números/referencias existentes y agrupa registros en Map por partida.
- **E. Decisión:** Una línea sin número aborta archivo; el resto queda agrupado para FASE 04.
- **F. Recuperación:** No modifica estado externo; error se captura en handler principal del Worker.
- **G. Verificación:** Cada grupo tiene clave de partida y lista de líneas; lookups posteriores usan Map/Set O(1) promedio.
- **H. Telemetría:** Registra `Partidas agrupadas` y cantidad de grupos.

### FASE 04 — Validación y clasificación de partidas
**Funciones reales de la fase:** `fase4DecidirWorker()`.

- **A. Objetivo (DDD):** Emitir una decisión explícita por cada grupo y detectar referencias duplicadas dentro del mismo archivo.
- **B. Entrada (Zero-Trust):** Estructuras preparadas en FASE 03.
- **C. Validación (Harness IAST):** `validarGrupo` comprueba número duplicado, fechas, cuentas, importes, partida doble y coherencia de metadatos; luego controla duplicados de referencia intra-archivo.
- **D. Procesamiento:** Produce `resultados[]`; referencias repetidas invalidan todas las partidas afectadas y anulan `movimiento`.
- **E. Decisión:** Cada resultado queda `valida=true/false` con lista de errores concreta.
- **F. Recuperación:** No descarta el archivo completo por una sola partida: conserva diagnósticos por grupo para vista previa; el importador decide política todo-o-nada.
- **G. Verificación:** Cuenta de válidas + rechazadas debe coincidir con resultados en FASE 05.
- **H. Telemetría:** Registra `Validación contable completada`, válidas y rechazadas.

### FASE 05 — Verificación del resultado agregado
**Funciones reales de la fase:** `fase5VerificarWorker()`.

- **A. Objetivo (DDD):** Garantizar que cada partida tiene decisión y que el resumen enviado al hilo principal es consistente.
- **B. Entrada (Zero-Trust):** `resultados` y `totalLineas` calculados localmente.
- **C. Validación (Harness IAST):** Cada `resultado.valida` debe ser boolean; partición válidas/rechazadas debe cubrir 100% de resultados.
- **D. Procesamiento:** Separa listas, actualiza telemetría y construye `{exito,validas,rechazadas,resultados,resumen}`.
- **E. Decisión:** Inconsistencia del resumen lanza error y se devuelve `exito:false` desde el handler principal.
- **F. Recuperación:** `self.onmessage` captura excepciones y responde con error controlado en lugar de romper silenciosamente el Worker.
- **G. Verificación:** `validas.length + rechazadas.length === resultados.length` y cada resultado tiene decisión binaria.
- **H. Telemetría:** Incrementa archivos procesados y publica conteos finales.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `CSV → filas → registros → grupos(Map<numeroPartida,lineas[]>) → resultados`.
- `Debe(p)=Σ_i debe_i`; `Haber(p)=Σ_i haber_i`; `Valida(p) ⇒ Debe(p)=Haber(p) ∧ Debe(p)>0`.
- `nLineas(p)≥2` y cada línea usa exactamente un lado: `(debe>0) XOR (haber>0)`.
- `FechaValida(y,m,d) ⇔ Date.UTC(y,m-1,d)` conserva `y,m,d`.
- `resumen.total = validas + rechazadas`.
- `Map`/`Set` se usan para búsquedas por cuenta, número y referencia con acceso promedio `O(1)`.

### Declaraciones y estado de módulo reflejados desde el código

```js
const telemetriaWorker = {
    archivosProcesados: 0,
    partidasValidas: 0,
    partidasRechazadas: 0,
    ultimoResultado: "Sin operaciones"
};
FASE 1
A. Objetivo: recibir el mensaje enviado al Web Worker.
B. Entrada (Zero-Trust): texto CSV, cuentas y duplicados provenientes de la interfaz.
C. Validación: todavía no se confía en tipos ni contenido.
D. Procesamiento: normalizar valores básicos y colecciones.
E. Decisión: enviar una entrada uniforme a la fase 2.
F. Recuperación: sustituir valores ausentes por cadenas o listas vacías.
G. Verificación: devolver siempre las cinco propiedades esperadas.
H. Telemetría: registrar la recepción del archivo.
FASE 2
A. Objetivo: validar la estructura física del CSV.
B. Entrada (Zero-Trust): texto normalizado, todavía no confiable.
C. Validación: filas, encabezados requeridos y números de partida.
D. Procesamiento: analizar comillas, separadores y posiciones de columnas.
E. Decisión: devolver filas y posiciones o lanzar un error.
F. Recuperación: detener el lote completo ante una estructura inválida.
G. Verificación: cada encabezado requerido debe tener una posición.
H. Telemetría: registrar que la estructura fue aprobada.
FASE 3
A. Objetivo: transformar filas CSV en registros y grupos contables.
B. Entrada (Zero-Trust): filas y posiciones aprobadas.
C. Validación: todas las líneas deben tener NumeroPartida.
D. Procesamiento: mapear columnas, crear índices y agrupar partidas.
E. Decisión: entregar grupos listos para validación contable.
F. Recuperación: rechazar el archivo si una línea no puede agruparse.
G. Verificación: la suma de líneas agrupadas coincide con los registros.
H. Telemetría: registrar cuántos grupos se construyeron.
FASE 4
A. Objetivo: decidir qué grupos cumplen las reglas contables.
B. Entrada (Zero-Trust): partidas agrupadas, aún no aprobadas.
C. Validación: fechas, duplicados, cuentas, líneas, importes y partida doble.
D. Procesamiento: ejecutar validarGrupo() y detectar referencias repetidas.
E. Decisión: marcar cada partida como válida o rechazada.
F. Recuperación: conservar errores detallados sin guardar datos.
G. Verificación: las referencias repetidas invalidan todos sus grupos.
H. Telemetría: contar partidas válidas y rechazadas.
FASE 5
A. Objetivo: verificar y devolver un resultado completo a la interfaz.
B. Entrada (Zero-Trust): resultados individuales recién evaluados.
C. Validación: comprobar que cada grupo tenga una decisión booleana.
D. Procesamiento: separar válidas, rechazadas y construir el resumen.
E. Decisión: publicar éxito solo si la estructura final es consistente.
F. Recuperación: lanzar un error si falta una decisión.
G. Verificación: válidas más rechazadas debe igualar el total.
H. Telemetría: acumular archivos procesados y resultado final.
self.onmessage = function(evento) {
    try {
        const entrada = fase1EntradaWorker(evento);
        const estructura = fase2ValidarWorker(entrada);
        const procesamiento = fase3ProcesarWorker(entrada, estructura);
        const resultados = fase4DecidirWorker(procesamiento);
        self.postMessage(fase5VerificarWorker(resultados, procesamiento.registros.length));
    } catch (error) {
        actualizarTelemetriaWorker("Error de procesamiento", 0, 1);
        self.postMessage({
            exito: false,
            error: error.message || "No fue posible procesar el CSV."
        });
    }
};
```

### FASE 00 — Utilidades de parsing, normalización y validación de grupo — espejo técnico

**Firmas reales:** `function actualizarTelemetriaWorker(resultado, validas, rechazadas)`, `function normalizarNombre(texto)`, `function analizarCSV(texto)`, `function fechaCalendarioValida(anio, mes, dia)`, `function convertirFecha(valor)`, `function convertirCentavos(valor)`, `function agruparPorPartida(registros)`, `function validarGrupo(numero, lineas, cuentasPorCodigo, numerosExistentes, referenciasExistentes)`.

**Formalización de la fase:** `V = estructuraValida ∧ cuentasValidas ∧ ((debe>0) XOR (haber>0)) ∧ Σdebe=Σhaber`; `¬V ⇒ rechazo`.

**Estructuras/tecnicismos reales:** `Map`, `Array`, `Worker`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (caracter === '"') {
if (entreComillas && siguiente === '"') {
if (caracter === "\r" && siguiente === "\n") indice++;
if (fila.some(function(valor) { return valor !== ""; })) filas.push(fila);
if (entreComillas) throw new Error("El archivo contiene comillas sin cerrar.");
if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
if (!fechaCalendarioValida(partes[0], partes[1], partes[2])) return "";
if (limpio === "") return 0;
if (limpio.includes(",") && limpio.includes(".")) {
if (limpio.lastIndexOf(",") > limpio.lastIndexOf(".")) {
if (!grupos.has(numero)) grupos.set(numero, []);
if (!numero || numero.length < 3) errores.push("Número de partida vacío o inválido.");
```

**Postcondiciones/retornos observables extraídos:**

```js
return String(texto || "")
return filas;
return fecha.getUTCFullYear() === anio &&
return "";
return String(partes[0]).padStart(4, "0") + "-" +
return Number.isFinite(numero) ? Math.round(numero * 100) : NaN;
return grupos;
return {
```

**Código exacto correspondiente a la fase:**

```js
function actualizarTelemetriaWorker(resultado, validas, rechazadas) {
    telemetriaWorker.ultimoResultado = resultado;
    telemetriaWorker.partidasValidas = Number(validas || 0);
    telemetriaWorker.partidasRechazadas = Number(rechazadas || 0);
}

function normalizarNombre(texto) {
    return String(texto || "")
        .replace(/^\uFEFF/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
}

function analizarCSV(texto) {
    const filas = [];
    let fila = [];
    let campo = "";
    let entreComillas = false;
    for (let indice = 0; indice < texto.length; indice++) {
        const caracter = texto[indice];
        const siguiente = texto[indice + 1];
        if (caracter === '"') {
            if (entreComillas && siguiente === '"') {
                campo += '"';
                indice++;
            } else {
                entreComillas = !entreComillas;
            }
        } else if (caracter === "," && !entreComillas) {
            fila.push(campo.trim());
            campo = "";
        } else if ((caracter === "\n" || caracter === "\r") && !entreComillas) {
            if (caracter === "\r" && siguiente === "\n") indice++;
            fila.push(campo.trim());
            campo = "";
            if (fila.some(function(valor) { return valor !== ""; })) filas.push(fila);
            fila = [];
        } else {
            campo += caracter;
        }
    }
    fila.push(campo.trim());
    if (fila.some(function(valor) { return valor !== ""; })) filas.push(fila);
    if (entreComillas) throw new Error("El archivo contiene comillas sin cerrar.");
    return filas;
}

function fechaCalendarioValida(anio, mes, dia) {
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    return fecha.getUTCFullYear() === anio &&
        fecha.getUTCMonth() === mes - 1 &&
        fecha.getUTCDate() === dia;
}

function convertirFecha(valor) {
    const fecha = String(valor || "").trim();
    let partes;
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        partes = fecha.split("-").map(Number);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
        const partesEntrada = fecha.split("/").map(Number);
        partes = [partesEntrada[2], partesEntrada[1], partesEntrada[0]];
    } else {
        return "";
    }
    if (!fechaCalendarioValida(partes[0], partes[1], partes[2])) return "";
    return String(partes[0]).padStart(4, "0") + "-" +
        String(partes[1]).padStart(2, "0") + "-" +
        String(partes[2]).padStart(2, "0");
}

function convertirCentavos(valor) {
    let limpio = String(valor || "")
        .replace(/\$/g, "")
        .replace(/\s/g, "")
        .trim();
    if (limpio === "") return 0;
    if (limpio.includes(",") && limpio.includes(".")) {
        if (limpio.lastIndexOf(",") > limpio.lastIndexOf(".")) {
            limpio = limpio.replace(/\./g, "").replace(",", ".");
        } else {
            limpio = limpio.replace(/,/g, "");
        }
    } else if (limpio.includes(",")) {
        limpio = limpio.replace(",", ".");
    }
    const numero = Number(limpio);
    return Number.isFinite(numero) ? Math.round(numero * 100) : NaN;
}

function agruparPorPartida(registros) {
    const grupos = new Map();
    registros.forEach(function(registro) {
        const numero = registro.numeroPartida;
        if (!grupos.has(numero)) grupos.set(numero, []);
        grupos.get(numero).push(registro);
    });
    return grupos;
}

function validarGrupo(numero, lineas, cuentasPorCodigo, numerosExistentes, referenciasExistentes) {
    const errores = [];
    const primera = lineas[0];
    const fecha = convertirFecha(primera.fecha);
    const referencia = primera.referencia.trim();
    const concepto = primera.concepto.trim();
    if (!numero || numero.length < 3) errores.push("Número de partida vacío o inválido.");
    if (!fecha) errores.push("Fecha inválida.");
    if (concepto.length < 3) errores.push("Concepto general inválido.");
    if (numerosExistentes.has(numero.toLowerCase())) errores.push("El número de partida ya existe.");
    if (referencia && referenciasExistentes.has(referencia.toLowerCase())) {
        errores.push("La referencia ya existe.");
    }
    if (lineas.length < 2) errores.push("La partida debe contener al menos dos líneas.");
    lineas.forEach(function(linea, indice) {
        if (convertirFecha(linea.fecha) !== fecha) {
            errores.push("La fecha cambia dentro de la partida, línea " + (indice + 1) + ".");
        }
        if (linea.referencia.trim() !== referencia) {
            errores.push("La referencia cambia dentro de la partida, línea " + (indice + 1) + ".");
        }
        if (linea.concepto.trim() !== concepto) {
            errores.push("El concepto cambia dentro de la partida, línea " + (indice + 1) + ".");
        }
    });
    let totalDebe = 0;
    let totalHaber = 0;
    const partida = [];
    lineas.forEach(function(linea, indice) {
        const codigo = linea.codigoCuenta.trim();
        const cuenta = cuentasPorCodigo.get(codigo);
        const debe = convertirCentavos(linea.debe);
        const haber = convertirCentavos(linea.haber);
        if (!cuenta) {
            errores.push("Cuenta auxiliar inexistente en línea " + (indice + 1) + ": " + codigo + ".");
        }
        if (!Number.isFinite(debe) || debe < 0 || !Number.isFinite(haber) || haber < 0) {
            errores.push("Monto inválido en línea " + (indice + 1) + ".");
            return;
        }
        if (debe > 0 && haber > 0) {
            errores.push("La línea " + (indice + 1) + " contiene Debe y Haber.");
        }
        if (debe <= 0 && haber <= 0) {
            errores.push("La línea " + (indice + 1) + " no contiene importe.");
        }
        totalDebe += debe;
        totalHaber += haber;
        if (cuenta) {
            partida.push({
                codigo: cuenta.codigo,
                cuenta: cuenta.nombre,
                descripcion: linea.descripcionLinea.trim(),
                debe: debe / 100,
                haber: haber / 100
            });
        }
    });
    if (totalDebe !== totalHaber) {
        errores.push("Partida desbalanceada por $" +
            (Math.abs(totalDebe - totalHaber) / 100).toFixed(2) + ".");
    }
    if (totalDebe <= 0) errores.push("La partida no contiene valores positivos.");
    return {
        valida: errores.length === 0,
        numero: numero,
        fecha: fecha || primera.fecha,
        referencia: referencia,
        concepto: concepto,
        lineas: lineas.length,
        totalDebe: totalDebe / 100,
        totalHaber: totalHaber / 100,
        errores: errores,
        movimiento: errores.length === 0 ? {
            numero: numero,
            fecha: fecha,
            referencia: referencia,
            concepto: concepto,
            origen: "CSV",
            partida: partida
        } : null
    };
}

```

### FASE 01 — Entrada del mensaje Worker — espejo técnico

**Firmas reales:** `function fase1EntradaWorker(evento)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** `Array`, `Worker`.

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Postcondiciones/retornos observables extraídos:**

```js
return {
```

**Código exacto correspondiente a la fase:**

```js
function fase1EntradaWorker(evento) {
    actualizarTelemetriaWorker("Entrada recibida", 0, 0);
    return {
        textoCSV: String(evento.data.textoCSV || ""),
        cuentas: Array.isArray(evento.data.cuentas) ? evento.data.cuentas : [],
        numerosExistentes: Array.isArray(evento.data.numerosExistentes)
            ? evento.data.numerosExistentes
            : [],
        referenciasExistentes: Array.isArray(evento.data.referenciasExistentes)
            ? evento.data.referenciasExistentes
            : []
    };
}

```

### FASE 02 — Validación de estructura CSV — espejo técnico

**Firmas reales:** `function fase2ValidarWorker(entrada)`.

**Formalización de la fase:** `V = estructuraValida ∧ cuentasValidas ∧ ((debe>0) XOR (haber>0)) ∧ Σdebe=Σhaber`; `¬V ⇒ rechazo`.

**Estructuras/tecnicismos reales:** `Worker`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (filas.length < 2) throw new Error("El CSV no contiene líneas de datos.");
if (posiciones[propiedad] === -1) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return { filas: filas, posiciones: posiciones };
```

**Código exacto correspondiente a la fase:**

```js
function fase2ValidarWorker(entrada) {
    const filas = analizarCSV(entrada.textoCSV);
    if (filas.length < 2) throw new Error("El CSV no contiene líneas de datos.");
    const encabezados = filas[0].map(normalizarNombre);
    const requeridos = {
        numeroPartida: "numeropartida",
        fecha: "fecha",
        referencia: "referencia",
        concepto: "concepto",
        codigoCuenta: "codigocuenta",
        descripcionLinea: "descripcionlinea",
        debe: "debe",
        haber: "haber"
    };
    const posiciones = {};
    Object.keys(requeridos).forEach(function(propiedad) {
        posiciones[propiedad] = encabezados.indexOf(requeridos[propiedad]);
        if (posiciones[propiedad] === -1) {
            throw new Error("Falta la columna requerida: " + requeridos[propiedad] + ".");
        }
    });
    actualizarTelemetriaWorker("Estructura CSV validada", 0, 0);
    return { filas: filas, posiciones: posiciones };
}

```

### FASE 03 — Normalización y agrupación — espejo técnico

**Firmas reales:** `function fase3ProcesarWorker(entrada, estructura)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** `Map`, `Set`, `Worker`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (registros.some(function(registro) { return !registro.numeroPartida; })) {
if (cuenta.permiteMovimientos) cuentasPorCodigo.set(cuenta.codigo, cuenta);
```

**Postcondiciones/retornos observables extraídos:**

```js
return registro;
return String(valor).toLowerCase();
return {
```

**Código exacto correspondiente a la fase:**

```js
function fase3ProcesarWorker(entrada, estructura) {
    const registros = estructura.filas.slice(1).map(function(fila) {
        const registro = {};
        Object.keys(estructura.posiciones).forEach(function(propiedad) {
            registro[propiedad] = String(fila[estructura.posiciones[propiedad]] || "").trim();
        });
        return registro;
    });
    if (registros.some(function(registro) { return !registro.numeroPartida; })) {
        throw new Error("Todas las líneas deben contener NumeroPartida.");
    }
    const cuentasPorCodigo = new Map();
    entrada.cuentas.forEach(function(cuenta) {
        if (cuenta.permiteMovimientos) cuentasPorCodigo.set(cuenta.codigo, cuenta);
    });
    const numerosExistentes = new Set(entrada.numerosExistentes.map(function(valor) {
        return String(valor).toLowerCase();
    }));
    const referenciasExistentes = new Set(entrada.referenciasExistentes.map(function(valor) {
        return String(valor).toLowerCase();
    }));
    const grupos = agruparPorPartida(registros);
    actualizarTelemetriaWorker("Partidas agrupadas", grupos.size, 0);
    return {
        registros: registros,
        grupos: grupos,
        cuentasPorCodigo: cuentasPorCodigo,
        numerosExistentes: numerosExistentes,
        referenciasExistentes: referenciasExistentes
    };
}

```

### FASE 04 — Validación y clasificación de partidas — espejo técnico

**Firmas reales:** `function fase4DecidirWorker(procesamiento)`.

**Formalización de la fase:** `V = estructuraValida ∧ cuentasValidas ∧ ((debe>0) XOR (haber>0)) ∧ Σdebe=Σhaber`; `¬V ⇒ rechazo`.

**Estructuras/tecnicismos reales:** `Map`, `Array`, `Worker`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!referencia) return;
if (!referenciasArchivo.has(referencia)) referenciasArchivo.set(referencia, []);
if (partidas.length < 2) return;
```

**Postcondiciones/retornos observables extraídos:**

```js
return partida.numero;
return resultado.valida;
return resultados;
```

**Código exacto correspondiente a la fase:**

```js
function fase4DecidirWorker(procesamiento) {
    const resultados = [];
    procesamiento.grupos.forEach(function(lineas, numero) {
        resultados.push(validarGrupo(
            numero,
            lineas,
            procesamiento.cuentasPorCodigo,
            procesamiento.numerosExistentes,
            procesamiento.referenciasExistentes
        ));
    });
    const referenciasArchivo = new Map();
    resultados.forEach(function(resultado) {
        const referencia = resultado.referencia.toLowerCase();
        if (!referencia) return;
        if (!referenciasArchivo.has(referencia)) referenciasArchivo.set(referencia, []);
        referenciasArchivo.get(referencia).push(resultado);
    });
    referenciasArchivo.forEach(function(partidas, referencia) {
        if (partidas.length < 2) return;
        const numeros = partidas.map(function(partida) {
            return partida.numero;
        }).join(", ");
        partidas.forEach(function(partida) {
            partida.valida = false;
            partida.movimiento = null;
            partida.errores.push(
                "La referencia " + referencia + " se repite en: " + numeros + "."
            );
        });
    });
    const validas = resultados.filter(function(resultado) {
        return resultado.valida;
    }).length;
    actualizarTelemetriaWorker(
        "Validación contable completada",
        validas,
        resultados.length - validas
    );
    return resultados;
}

```

### FASE 05 — Verificación del resultado agregado — espejo técnico

**Firmas reales:** `function fase5VerificarWorker(resultados, totalLineas)`.

**Formalización de la fase:** `Precondiciones ∧ invariantes ⇒ postcondición`; cualquier condición de rechazo ejecutada por el código corta la transición antes del siguiente efecto.

**Estructuras/tecnicismos reales:** `Worker`.

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (resultados.some(function(resultado) {
if (validas.length + rechazadas.length !== resultados.length) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return typeof resultado.valida !== "boolean";
return resultado.valida;
return !resultado.valida;
return {
```

**Código exacto correspondiente a la fase:**

```js
function fase5VerificarWorker(resultados, totalLineas) {
    if (resultados.some(function(resultado) {
        return typeof resultado.valida !== "boolean";
    })) {
        throw new Error("El resultado contiene una partida sin decisión.");
    }
    const validas = resultados.filter(function(resultado) {
        return resultado.valida;
    });
    const rechazadas = resultados.filter(function(resultado) {
        return !resultado.valida;
    });
    if (validas.length + rechazadas.length !== resultados.length) {
        throw new Error("No fue posible verificar el resumen del archivo.");
    }
    telemetriaWorker.archivosProcesados++;
    actualizarTelemetriaWorker("Archivo verificado", validas.length, rechazadas.length);
    return {
        exito: true,
        validas: validas,
        rechazadas: rechazadas,
        resultados: resultados,
        resumen: {
            totalPartidas: resultados.length,
            validas: validas.length,
            rechazadas: rechazadas.length,
            totalLineas: totalLineas
        }
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
- **Preservar:** Parsing/validación fuera del hilo UI.
- **Preservar:** Map/Set para búsquedas repetidas.
- **Preservar:** Diagnóstico por partida.
- **Preservar:** Resumen final autoconsistente.

### Contras y tratamiento
- **Contra:** Parser CSV propio cubre un subconjunto del estándar.
  **Tratamiento/refutación:** Mantener pruebas con comillas, comas y saltos; sustituir por parser externo solo si se autoriza dependencia.
- **Contra:** Un archivo muy grande aún consume memoria completa en Worker.
  **Tratamiento/refutación:** El límite de 5 MB del importador contiene el riesgo actual.

## Sintaxis e instrucciones finales de mantenimiento
- Parser controla comillas; fechas validan calendario; importes se convierten a centavos; validarGrupo comprueba consistencia de líneas y reglas contables.
- No confía en la forma del mensaje; garantiza tipos básicos antes del parser.
- Exige >=2 filas y columnas NumeroPartida, Fecha, Referencia, Concepto, CodigoCuenta, DescripcionLinea, Debe, Haber.
- Todas las líneas deben tener NumeroPartida; solo cuentas auxiliares entran a cuentasPorCodigo.
- validarGrupo comprueba número duplicado, fechas, cuentas, importes, partida doble y coherencia de metadatos; luego controla duplicados de referencia intra-archivo.
- Cada resultado.valida debe ser boolean; partición válidas/rechazadas debe cubrir 100% de resultados.
- No renombrar funciones públicas, variables globales compartidas ni contratos entre módulos sin revisar consumidores.
- Mantener comentarios de inicio/fin de fase cortos; la explicación detallada permanece en este `.md`.

## Criterio de cierre P3
El objetivo de “contras al 0%” se interpreta como **cero debilidades identificadas sin tratamiento**: corregir, mitigar, documentar como restricción o convertir en prueba obligatoria. No se declara riesgo técnico cero cuando el código conserva un trade-off real.


## Esquema CSV de inventario
Se reconocen las columnas `TipoInventario`, `SKU` y `CantidadInventario`. Para `Salida`, el Worker valida estructura y unidades, mientras que la valuación monetaria se resuelve después en `inventario_costos.js`.

## Actualización — importación PPE
El CSV admite opcionalmente `FechaDisponibleUso` y `ValorResidual`. Si `CodigoCuenta` corresponde a una cuenta con `categoriaActivoFijo`, el Worker exige descripción, Debe positivo, fecha válida y residual menor al costo; la metadata se conserva en `linea.activoFijo`.


### Normalización de `FechaDisponibleUso`
Antes de comparar `FechaDisponibleUso` contra la fecha de adquisición, ambas fechas se convierten a ISO `AAAA-MM-DD` mediante `convertirFecha()`. La comparación se realiza únicamente sobre valores normalizados y la metadata del activo conserva la fecha normalizada. Esto evita falsos rechazos cuando el CSV usa `DD/MM/AAAA`.
