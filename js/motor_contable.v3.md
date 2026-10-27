# motor_contable.js — P3 v3

## Qué es este archivo
Núcleo de cálculo contable determinista que valida partida doble, genera saldos y construye balanza de comprobación, estado de resultados y balance general.


## Propósito técnico
Núcleo de cálculo contable puro: valida partida doble, acumula saldos por cuenta y genera balanza, estado de resultados y balance general.

## Dependencias reales
- Catálogo de cuentas con `codigo`, `naturaleza`, `permiteMovimientos`
- Movimientos con `fecha` y `partida[]`

## Algoritmia aplicada al archivo
Los principios A–H se aplican a las fases y funciones reales de este archivo. No se asume DAG, Circuit Breaker, checksum, Epoll, GPU/SIMD o criptografía si el código no los implementa o no los necesita.

### FASE 00 — Conversión monetaria y clasificación
**Funciones reales de la fase:** `convertirACentavos()`, `convertirADolares()`, `obtenerClasificacionCuenta()`, `calcularSaldoNatural()`, `estaDentroDelPeriodo()`.

- **A. Objetivo (DDD):** Centralizar utilidades deterministas para trabajar importes en centavos y clasificar cuentas por prefijo.
- **B. Entrada (Zero-Trust):** `convertirACentavos` recibe cualquier valor convertible a número; `calcularSaldoNatural` recibe naturaleza explícita.
- **C. Validación (Harness IAST):** Rechaza números no finitos y naturalezas distintas de Deudora/Acreedora.
- **D. Procesamiento:** Redondea a centavos, convierte a dólares, clasifica por primer dígito y filtra por período.
- **E. Decisión:** Naturaleza decide fórmula de saldo; fechas fuera de límites retornan false.
- **F. Recuperación:** Importes/naturalezas inválidos lanzan excepción antes de contaminar cálculos posteriores.
- **G. Verificación:** Conversiones monetarias operan sobre enteros centavos para evitar acumulación binaria directa.
- **H. Telemetría:** No existe telemetría propia; al ser funciones puras, el error se propaga al consumidor.

### FASE 01 — Validación de partida doble
**Funciones reales de la fase:** `validarPartidaDoble()`.

- **A. Objetivo (DDD):** Garantizar que cada movimiento sea una partida contable válida antes de acumular saldos.
- **B. Entrada (Zero-Trust):** Recibe `movimiento` y `cuentasPorCodigo` Map.
- **C. Validación (Harness IAST):** Exige >=2 líneas, cuenta existente y auxiliar, importes no negativos, exactamente un lado por línea y Debe total = Haber total.
- **D. Procesamiento:** Convierte debe/haber a centavos y acumula totales en una sola pasada.
- **E. Decisión:** Cualquier violación lanza error; si cuadra devuelve `{debeCentavos,haberCentavos}`.
- **F. Recuperación:** No modifica catálogo ni movimientos; el cálculo falla antes de generar reportes.
- **G. Verificación:** Postcondición obligatoria: `debeCentavos === haberCentavos`.
- **H. Telemetría:** No registra; el llamador decide cómo presentar/loguear el fallo.

### FASE 02 — Generación de saldos por cuenta
**Funciones reales de la fase:** `generarSaldos()`.

- **A. Objetivo (DDD):** Transformar catálogo+movimientos en saldos auxiliares del período.
- **B. Entrada (Zero-Trust):** Recibe arrays `cuentas`, `movimientos` y límites de fecha opcionales.
- **C. Validación (Harness IAST):** Rechaza no-arrays, códigos vacíos/duplicados y valida cada movimiento con FASE 01.
- **D. Procesamiento:** Construye `Map` de cuentas y acumuladores; filtra período; acumula centavos; calcula debe, haber, saldos deudor/acreedor/natural.
- **E. Decisión:** Solo cuentas `permiteMovimientos` reciben acumulador y la salida elimina saldos totalmente cero.
- **F. Recuperación:** Cualquier inconsistencia aborta generación sin producir reporte parcial.
- **G. Verificación:** Salida ordenada por código y cada saldo natural respeta la naturaleza de la cuenta.
- **H. Telemetría:** No existe telemetría interna; determinismo facilita pruebas unitarias.

### FASE 03 — Balanza de comprobación
**Funciones reales de la fase:** `generarBalanzaComprobacion()`.

- **A. Objetivo (DDD):** Generar una balanza y comprobar igualdad global de cargos y abonos.
- **B. Entrada (Zero-Trust):** Reutiliza catálogo, movimientos y período de FASE 02.
- **C. Validación (Harness IAST):** Toda validación de movimientos ocurre al llamar `generarSaldos`; después se revalida total Debe = total Haber.
- **D. Procesamiento:** Reduce saldos a totales de debe, haber, saldo deudor y saldo acreedor en centavos.
- **E. Decisión:** Si total Debe != Haber lanza inconsistencia; si cuadra devuelve objeto de balanza.
- **F. Recuperación:** No entrega balanza parcial si falla igualdad.
- **G. Verificación:** Invariante principal: `totalDebe === totalHaber` en centavos.
- **H. Telemetría:** El módulo no registra; el consumidor reporta el error.

### FASE 04 — Estado de resultados
**Funciones reales de la fase:** `sumarSaldoNaturalCentavos()`, `generarEstadoResultados()`.

- **A. Objetivo (DDD):** Separar ingresos y gastos del período y calcular utilidad/pérdida neta.
- **B. Entrada (Zero-Trust):** Catálogo, movimientos y rango de fechas.
- **C. Validación (Harness IAST):** Se apoya en `generarSaldos`; solo clasificaciones Ingresos/Gastos con saldo distinto de cero entran al estado.
- **D. Procesamiento:** Suma saldos naturales en centavos y calcula `resultadoNeto = ingresos - gastos`.
- **E. Decisión:** Resultado >=0 se etiqueta `Utilidad neta`; negativo `Pérdida neta`.
- **F. Recuperación:** Errores de catálogo/partida se propagan desde fases previas; no se maquilla resultado.
- **G. Verificación:** Totales del estado se derivan exclusivamente de cuentas clasificadas 4 y 5.
- **H. Telemetría:** Sin telemetría propia; salida es determinista para mismas entradas.

### FASE 05 — Balance general
**Funciones reales de la fase:** `generarBalanceGeneral()`.

- **A. Objetivo (DDD):** Generar Activo, Pasivo y Patrimonio e incorporar resultado del período verificando la ecuación contable.
- **B. Entrada (Zero-Trust):** Catálogo, movimientos y fecha de corte opcional.
- **C. Validación (Harness IAST):** Reutiliza `generarSaldos` y `generarEstadoResultados`; filtra clasificaciones Activo/Pasivo/Patrimonio.
- **D. Procesamiento:** Suma cada grupo, agrega resultado neto al patrimonio y calcula Pasivo+Patrimonio.
- **E. Decisión:** Si Activo != Pasivo + Patrimonio+Resultado lanza error; si cuadra devuelve balance.
- **F. Recuperación:** No retorna balance inconsistente; el error sube a reportería.
- **G. Verificación:** Invariante final: `totalActivosCentavos === totalPasivoPatrimonioCentavos`.
- **H. Telemetría:** Sin telemetría interna; la verificación matemática es el control de integridad principal.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `centavos(x)=round(Number(x)·100)`; `dolares(c)=c/100`.
- `SaldoNatural_Deudora = Debe - Haber`; `SaldoNatural_Acreedora = Haber - Debe`.
- `PartidaValida ⇔ Σ debeCentavos = Σ haberCentavos`.
- `BalanzaValida ⇔ TotalDebe = TotalHaber`.
- `ResultadoNeto = TotalIngresos - TotalGastos`.
- `BalanceValido ⇔ Activo = Pasivo + Patrimonio + ResultadoPeriodo`.

### Declaraciones y estado de módulo reflejados desde el código

```js
// El archivo no mantiene declaraciones ejecutables fuera de sus funciones.
```

### FASE 00 — Conversión monetaria y clasificación — espejo técnico

**Firmas reales:** `function convertirACentavos(valor)`, `function convertirADolares(centavos)`, `function obtenerClasificacionCuenta(codigo)`, `function calcularSaldoNatural(totalDebeCentavos, totalHaberCentavos, naturaleza)`, `function estaDentroDelPeriodo(fecha, fechaDesde, fechaHasta)`.

**Formalización de la fase:** `centavos(x)=round(Number(x)·100)`; `saldo_D=D-H`; `saldo_A=H-D`; `periodo(f)=desde≤f≤hasta` cuando existen límites.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!Number.isFinite(numero)) {
if (naturaleza === "Deudora") {
if (naturaleza === "Acreedora") {
if (fechaDesde && fecha < fechaDesde) return false;
if (fechaHasta && fecha > fechaHasta) return false;
```

**Postcondiciones/retornos observables extraídos:**

```js
return Math.round(numero * 100);
return Number(centavos || 0) / 100;
return clasificaciones[String(codigo || "").charAt(0)] || "Sin clasificación";
return totalDebeCentavos - totalHaberCentavos;
return totalHaberCentavos - totalDebeCentavos;
return true;
```

**Código exacto correspondiente a la fase:**

```js
function convertirACentavos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
        throw new Error("Se encontró un importe contable inválido.");
    }
    return Math.round(numero * 100);
}

function convertirADolares(centavos) {
    return Number(centavos || 0) / 100;
}

function obtenerClasificacionCuenta(codigo) {
    const clasificaciones = {
        "1": "Activo",
        "2": "Pasivo",
        "3": "Patrimonio",
        "4": "Ingresos",
        "5": "Gastos"
    };
    return clasificaciones[String(codigo || "").charAt(0)] || "Sin clasificación";
}

function calcularSaldoNatural(totalDebeCentavos, totalHaberCentavos, naturaleza) {
    if (naturaleza === "Deudora") {
        return totalDebeCentavos - totalHaberCentavos;
    }
    if (naturaleza === "Acreedora") {
        return totalHaberCentavos - totalDebeCentavos;
    }
    throw new Error("La naturaleza de una cuenta no es válida.");
}

function estaDentroDelPeriodo(fecha, fechaDesde, fechaHasta) {
    if (fechaDesde && fecha < fechaDesde) return false;
    if (fechaHasta && fecha > fechaHasta) return false;
    return true;
}

```

### FASE 01 — Validación de partida doble — espejo técnico

**Firmas reales:** `function validarPartidaDoble(movimiento, cuentasPorCodigo)`.

**Formalización de la fase:** `∀ línea: (debe>0) XOR (haber>0)` y `Σdebe=Σhaber`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(n)` respecto al tamaño de la colección recorrida.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!movimiento || !Array.isArray(movimiento.partida) || movimiento.partida.length < 2) {
if (!cuenta) {
if (!cuenta.permiteMovimientos) {
if (debe < 0 || haber < 0 || (debe > 0 && haber > 0) || (debe === 0 && haber === 0)) {
if (debeCentavos !== haberCentavos) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return { debeCentavos: debeCentavos, haberCentavos: haberCentavos };
```

**Código exacto correspondiente a la fase:**

```js
function validarPartidaDoble(movimiento, cuentasPorCodigo) {
    if (!movimiento || !Array.isArray(movimiento.partida) || movimiento.partida.length < 2) {
        throw new Error("La partida " + String(movimiento && movimiento.numero || "sin número") + " no tiene suficientes líneas.");
    }
    let debeCentavos = 0;
    let haberCentavos = 0;
    movimiento.partida.forEach(function(linea) {
        const codigo = String(linea.codigo || "");
        const cuenta = cuentasPorCodigo.get(codigo);
        if (!cuenta) {
            throw new Error("La cuenta " + codigo + " no existe en el catálogo.");
        }
        if (!cuenta.permiteMovimientos) {
            throw new Error("La cuenta " + codigo + " no permite movimientos directos.");
        }
        const debe = convertirACentavos(linea.debe || 0);
        const haber = convertirACentavos(linea.haber || 0);
        if (debe < 0 || haber < 0 || (debe > 0 && haber > 0) || (debe === 0 && haber === 0)) {
            throw new Error("La partida " + movimiento.numero + " contiene una línea inválida.");
        }
        debeCentavos += debe;
        haberCentavos += haber;
    });
    if (debeCentavos !== haberCentavos) {
        throw new Error("La partida " + movimiento.numero + " está descuadrada.");
    }
    return { debeCentavos: debeCentavos, haberCentavos: haberCentavos };
}

```

### FASE 02 — Generación de saldos por cuenta — espejo técnico

**Firmas reales:** `function generarSaldos(cuentas, movimientos, fechaDesde, fechaHasta)`.

**Formalización de la fase:** `Saldo[c].debe=Σ debe_i`; `Saldo[c].haber=Σ haber_i` para líneas con `codigo=c` y fecha dentro del período.

**Estructuras/tecnicismos reales:** `Map`.

**Complejidad dominante:** `O(n log n)` por ordenamiento; las pasadas lineales adicionales no cambian el término dominante.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (!Array.isArray(cuentas) || !Array.isArray(movimientos)) {
if (!codigo || cuentasPorCodigo.has(codigo)) {
if (cuenta.permiteMovimientos) {
if (!estaDentroDelPeriodo(movimiento.fecha, fechaDesde, fechaHasta)) return;
```

**Postcondiciones/retornos observables extraídos:**

```js
return Array.from(saldosPorCodigo.entries()).map(function(entrada) {
return {
return cuenta.debe !== 0 || cuenta.haber !== 0;
return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
```

**Código exacto correspondiente a la fase:**

```js
function generarSaldos(cuentas, movimientos, fechaDesde, fechaHasta) {
    if (!Array.isArray(cuentas) || !Array.isArray(movimientos)) {
        throw new Error("El catálogo y los movimientos deben ser listas.");
    }
    const cuentasPorCodigo = new Map();
    const saldosPorCodigo = new Map();
    cuentas.forEach(function(cuenta) {
        const codigo = String(cuenta.codigo || "");
        if (!codigo || cuentasPorCodigo.has(codigo)) {
            throw new Error("El catálogo contiene códigos vacíos o duplicados.");
        }
        cuentasPorCodigo.set(codigo, cuenta);
        if (cuenta.permiteMovimientos) {
            saldosPorCodigo.set(codigo, { debeCentavos: 0, haberCentavos: 0 });
        }
    });
    movimientos.forEach(function(movimiento) {
        validarPartidaDoble(movimiento, cuentasPorCodigo);
        if (!estaDentroDelPeriodo(movimiento.fecha, fechaDesde, fechaHasta)) return;
        movimiento.partida.forEach(function(linea) {
            const saldo = saldosPorCodigo.get(String(linea.codigo));
            saldo.debeCentavos += convertirACentavos(linea.debe || 0);
            saldo.haberCentavos += convertirACentavos(linea.haber || 0);
        });
    });
    return Array.from(saldosPorCodigo.entries()).map(function(entrada) {
        const codigo = entrada[0];
        const acumulado = entrada[1];
        const cuenta = cuentasPorCodigo.get(codigo);
        const diferencia = acumulado.debeCentavos - acumulado.haberCentavos;
        return {
            codigo: codigo,
            nombre: cuenta.nombre,
            clasificacion: obtenerClasificacionCuenta(codigo),
            naturaleza: cuenta.naturaleza,
            debe: convertirADolares(acumulado.debeCentavos),
            haber: convertirADolares(acumulado.haberCentavos),
            saldoDeudor: convertirADolares(Math.max(diferencia, 0)),
            saldoAcreedor: convertirADolares(Math.max(-diferencia, 0)),
            saldoNatural: convertirADolares(calcularSaldoNatural(
                acumulado.debeCentavos,
                acumulado.haberCentavos,
                cuenta.naturaleza
            ))
        };
    }).filter(function(cuenta) {
        return cuenta.debe !== 0 || cuenta.haber !== 0;
    }).sort(function(a, b) {
        return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
    });
}

```

### FASE 03 — Balanza de comprobación — espejo técnico

**Firmas reales:** `function generarBalanzaComprobacion(cuentas, movimientos, fechaDesde, fechaHasta)`.

**Formalización de la fase:** `TotalDebe=Σ cuenta.debe`; `TotalHaber=Σ cuenta.haber`; invariante `TotalDebe=TotalHaber`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(n)` respecto al tamaño de la colección recorrida.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (totalesCentavos.debe !== totalesCentavos.haber) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return totales;
return {
```

**Código exacto correspondiente a la fase:**

```js
function generarBalanzaComprobacion(cuentas, movimientos, fechaDesde, fechaHasta) {
    const saldos = generarSaldos(cuentas, movimientos, fechaDesde || "", fechaHasta || "");
    const totalesCentavos = saldos.reduce(function(totales, cuenta) {
        totales.debe += convertirACentavos(cuenta.debe);
        totales.haber += convertirACentavos(cuenta.haber);
        totales.saldoDeudor += convertirACentavos(cuenta.saldoDeudor);
        totales.saldoAcreedor += convertirACentavos(cuenta.saldoAcreedor);
        return totales;
    }, { debe: 0, haber: 0, saldoDeudor: 0, saldoAcreedor: 0 });
    if (totalesCentavos.debe !== totalesCentavos.haber) {
        throw new Error("Existe una inconsistencia entre los cargos y abonos almacenados.");
    }
    return {
        cuentas: saldos,
        totalDebe: convertirADolares(totalesCentavos.debe),
        totalHaber: convertirADolares(totalesCentavos.haber),
        totalSaldoDeudor: convertirADolares(totalesCentavos.saldoDeudor),
        totalSaldoAcreedor: convertirADolares(totalesCentavos.saldoAcreedor)
    };
}

```

### FASE 04 — Estado de resultados — espejo técnico

**Firmas reales:** `function sumarSaldoNaturalCentavos(cuentas)`, `function generarEstadoResultados(cuentas, movimientos, fechaDesde, fechaHasta)`.

**Formalización de la fase:** `ResultadoNeto=ΣIngresos−ΣGastos`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Postcondiciones/retornos observables extraídos:**

```js
return cuentas.reduce(function(total, cuenta) {
return total + convertirACentavos(cuenta.saldoNatural);
return cuenta.clasificacion === "Ingresos" && cuenta.saldoNatural !== 0;
return cuenta.clasificacion === "Gastos" && cuenta.saldoNatural !== 0;
return {
```

**Código exacto correspondiente a la fase:**

```js
function sumarSaldoNaturalCentavos(cuentas) {
    return cuentas.reduce(function(total, cuenta) {
        return total + convertirACentavos(cuenta.saldoNatural);
    }, 0);
}

function generarEstadoResultados(cuentas, movimientos, fechaDesde, fechaHasta) {
    const saldos = generarSaldos(cuentas, movimientos, fechaDesde || "", fechaHasta || "");
    const ingresos = saldos.filter(function(cuenta) {
        return cuenta.clasificacion === "Ingresos" && cuenta.saldoNatural !== 0;
    });
    const gastos = saldos.filter(function(cuenta) {
        return cuenta.clasificacion === "Gastos" && cuenta.saldoNatural !== 0;
    });
    const totalIngresosCentavos = sumarSaldoNaturalCentavos(ingresos);
    const totalGastosCentavos = sumarSaldoNaturalCentavos(gastos);
    const resultadoNetoCentavos = totalIngresosCentavos - totalGastosCentavos;
    return {
        ingresos: ingresos,
        gastos: gastos,
        totalIngresos: convertirADolares(totalIngresosCentavos),
        totalGastos: convertirADolares(totalGastosCentavos),
        resultadoNeto: convertirADolares(resultadoNetoCentavos),
        tipoResultado: resultadoNetoCentavos >= 0 ? "Utilidad neta" : "Pérdida neta"
    };
}

```

### FASE 05 — Balance general — espejo técnico

**Firmas reales:** `function generarBalanceGeneral(cuentas, movimientos, fechaHasta)`.

**Formalización de la fase:** `Activo = Pasivo + Patrimonio + ResultadoPeriodo`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(n)` por cada recorrido independiente; puede alcanzar `O(n·m)` si un recorrido contiene búsquedas/recorridos sobre otra colección.

**Condiciones/guardas ejecutables extraídas del `.js`:**

```js
if (totalActivosCentavos !== totalPasivoPatrimonioCentavos) {
```

**Postcondiciones/retornos observables extraídos:**

```js
return cuenta.clasificacion === "Activo" && cuenta.saldoNatural !== 0;
return cuenta.clasificacion === "Pasivo" && cuenta.saldoNatural !== 0;
return cuenta.clasificacion === "Patrimonio" && cuenta.saldoNatural !== 0;
return {
```

**Código exacto correspondiente a la fase:**

```js
function generarBalanceGeneral(cuentas, movimientos, fechaHasta) {
    const saldos = generarSaldos(cuentas, movimientos, "", fechaHasta || "");
    const activos = saldos.filter(function(cuenta) {
        return cuenta.clasificacion === "Activo" && cuenta.saldoNatural !== 0;
    });
    const pasivos = saldos.filter(function(cuenta) {
        return cuenta.clasificacion === "Pasivo" && cuenta.saldoNatural !== 0;
    });
    const patrimonio = saldos.filter(function(cuenta) {
        return cuenta.clasificacion === "Patrimonio" && cuenta.saldoNatural !== 0;
    });
    const estadoResultados = generarEstadoResultados(cuentas, movimientos, "", fechaHasta || "");
    const totalActivosCentavos = sumarSaldoNaturalCentavos(activos);
    const totalPasivosCentavos = sumarSaldoNaturalCentavos(pasivos);
    const totalPatrimonioCentavos = sumarSaldoNaturalCentavos(patrimonio);
    const resultadoCentavos = convertirACentavos(estadoResultados.resultadoNeto);
    const totalPatrimonioResultadoCentavos = totalPatrimonioCentavos + resultadoCentavos;
    const totalPasivoPatrimonioCentavos = totalPasivosCentavos + totalPatrimonioResultadoCentavos;
    if (totalActivosCentavos !== totalPasivoPatrimonioCentavos) {
        throw new Error("El Balance general no cumple Activo = Pasivo + Patrimonio.");
    }
    return {
        activos: activos,
        pasivos: pasivos,
        patrimonio: patrimonio,
        totalActivos: convertirADolares(totalActivosCentavos),
        totalPasivos: convertirADolares(totalPasivosCentavos),
        totalPatrimonio: convertirADolares(totalPatrimonioCentavos),
        resultadoPeriodo: estadoResultados.resultadoNeto,
        tipoResultado: estadoResultados.resultadoNeto >= 0
            ? "Resultado del período"
            : "Pérdida del período",
        totalPatrimonioResultado: convertirADolares(totalPatrimonioResultadoCentavos),
        totalPasivoPatrimonio: convertirADolares(totalPasivoPatrimonioCentavos)
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
- **Preservar:** Cálculos monetarios en centavos.
- **Preservar:** Funciones mayormente puras y testeables.
- **Preservar:** Partida doble verificada antes de acumulación.
- **Preservar:** Ecuación del balance verificada explícitamente.

### Contras y tratamiento
- **Contra:** Clasificación por primer dígito está acoplada al plan de cuentas actual.
  **Tratamiento/refutación:** Mantener mientras el catálogo use prefijos 1–5; externalizar solo si cambia el contrato del catálogo.
- **Contra:** Conversión dólares↔centavos usa Number.
  **Tratamiento/refutación:** Adecuado para importes del prototipo; límites de magnitud deben definirse si el sistema escala.

## Sintaxis e instrucciones finales de mantenimiento
- Rechaza números no finitos y naturalezas distintas de Deudora/Acreedora.
- Exige >=2 líneas, cuenta existente y auxiliar, importes no negativos, exactamente un lado por línea y Debe total = Haber total.
- Rechaza no-arrays, códigos vacíos/duplicados y valida cada movimiento con FASE 01.
- Toda validación de movimientos ocurre al llamar generarSaldos; después se revalida total Debe = total Haber.
- Se apoya en generarSaldos; solo clasificaciones Ingresos/Gastos con saldo distinto de cero entran al estado.
- Reutiliza generarSaldos y generarEstadoResultados; filtra clasificaciones Activo/Pasivo/Patrimonio.
- No renombrar funciones públicas, variables globales compartidas ni contratos entre módulos sin revisar consumidores.
- Mantener comentarios de inicio/fin de fase cortos; la explicación detallada permanece en este `.md`.

## Criterio de cierre P3
El objetivo de “contras al 0%” se interpreta como **cero debilidades identificadas sin tratamiento**: corregir, mitigar, documentar como restricción o convertir en prueba obligatoria. No se declara riesgo técnico cero cuando el código conserva un trade-off real.

## Actualización — gastos 6xxx y depreciación acumulada en Balance General

El catálogo actual usa cuentas `6xxx` para gastos operativos y gasto por depreciación; por tanto, `obtenerClasificacionCuenta()` clasifica tanto `5xxx` como `6xxx` como `Gastos`.

Código crítico:
```js
const clasificaciones = {
    "1": "Activo",
    "2": "Pasivo",
    "3": "Patrimonio",
    "4": "Ingresos",
    "5": "Gastos",
    "6": "Gastos"
};
```

Las cuentas correctoras de activo `13xx` son de naturaleza `Acreedora`. En el Balance General su `saldoNatural` se invierte para presentación, de modo que reduzcan el activo en vez de aumentarlo:
```js
const activos = saldos.filter(function(cuenta) {
    return cuenta.clasificacion === "Activo" && cuenta.saldoNatural !== 0;
}).map(function(cuenta) {
    return cuenta.naturaleza === "Acreedora"
        ? { ...cuenta, saldoNatural: -cuenta.saldoNatural }
        : cuenta;
});
```

Invariantes:
```text
GastoDepreciación(6xxx) ∈ EstadoResultados
ActivoNeto = ActivosDeudores - ContraActivosAcreedores
ActivoNeto = Pasivo + Patrimonio + Resultado
```

## Afinación octubre 2026
- Balanza, Estado de resultados y Balance general incorporan triple verificación matemática antes de devolverse a la UI.
