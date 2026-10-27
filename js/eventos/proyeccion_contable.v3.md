# proyeccion_contable.v3.md — P3 Refutación, cierre y sintaxis de reparación

## Qué es este archivo
Módulo de proyección contable que reconstruye balanza, estado de resultados y balance general desde datos persistidos, guarda la proyección y reacciona a eventos que afectan los reportes.


**Archivo auditado:** `js/eventos/proyeccion_contable.js`  
**Responsabilidad:** reconstrucción de proyecciones contables.  
**Base documental:** P1 (`v1`) + P2 (`v2`) + código del proyecto.


## PRINCIPIOS DE ALGORITMIA — MARCO OBLIGATORIO A–H

Estos principios gobiernan la revisión y cualquier reparación del archivo. Se aplican **sin inventar tecnologías ajenas al módulo** y sin romper sus contratos públicos.

| Principio | Regla técnica obligatoria | Criterio de aplicación en este módulo |
|---|---|---|
| **A. Objetivo (DDD)** | [D] Precondiciones y postcondiciones finitas (*Design by Contract*). [A] Frontera de contexto blindada (*Anti-Corruption Layer*). | Cada fase declara qué acepta, qué produce y qué responsabilidad no invade. |
| **B. Entrada (Zero-Trust)** | [D] Ingesta fuertemente tipada. [A] *Gatekeeping*: sanitización y validación estricta en la frontera. | Validar tipo, presencia, forma y límites antes de procesar datos externos. |
| **C. Validación (Harness IAST)** | [R] Verificación de invariantes. [D] Evaluación determinista y *Fail-Fast*. | Rechazar antes de mutar estado o persistir cuando el contrato no se cumple. |
| **D. Procesamiento** | [D] Priorizar funciones puras e idempotentes. [A] Evitar mutación global/compartida no controlada. | Mantener efectos secundarios explícitos y limitados al propósito del módulo. |
| **E. Decisión** | [D] Minimizar complejidad Big-O. Priorizar O(1) cuando la estructura real lo permita; O(n log n) solo cuando sea necesario. [R] DAG solo si el flujo real es acíclico. | No introducir *Perfect Hash Maps* ni DAG artificiales si el archivo no los necesita. |
| **F. Recuperación** | [R] Aplicar resiliencia proporcional: rollback/compensación; *Retry/Circuit Breaker* solo ante I/O remoto/transitorio real. [A] Contener la excepción en su frontera. | Preservar causa del error y restaurar consistencia cuando existan efectos parciales. |
| **G. Verificación** | [D] Confirmar el estado final/invariante; checksum solo cuando exista una necesidad real de integridad binaria. | Verificar postcondición observable antes de declarar éxito. |
| **H. Telemetría** | [A] I/O asíncrono no bloqueante cuando exista. [R] Trazabilidad suficiente para reconstruir el resultado. | Registrar fase, éxito/error y causa sin ocultar la excepción original. |

**R = Redundancia/Resiliencia; D = Determinismo; A = Aislamiento.**

## FASES REALES DEL ARCHIVO — COMENTARIOS EN CÓDIGO

El `.js` P3 usa comentarios cortos `FASE NN INICIO` / `FASE NN FIN`; la lógica ejecutable se preserva y los bloques A–H extensos se trasladan a este `.md`.

- **FASE 00:** configuración, estado y utilidades previas.
- **FASE 01: Reconstrucción de proyección.** `reconstruirProyeccionContable()`
- **FASE 02: Lectura de proyección.** `obtenerBalanzaProyectada()`
- **FASE 03: Suscripción e inicialización.** `iniciarProyeccionContable()`

### Funciones reflejadas desde el `.js`

- `reconstruirProyeccionContable()`
- `obtenerBalanzaProyectada()`
- `iniciarProyeccionContable()`

## REGLAS DE ENTREGA DEL CÓDIGO P3

1. Mantener declaraciones y funciones públicas **alineadas a la izquierda**.
2. Mantener el código **compacto**, eliminando comentarios A–H redundantes del `.js`; la explicación extensa permanece en este `.md`.
3. Usar comentarios cortos únicamente para marcar `FASE NN INICIO` y `FASE NN FIN` o justificar un invariante crítico.
4. No renombrar variables, funciones públicas, stores, eventos ni contratos existentes para reducir líneas.
5. No comprimir/minificar hasta perder legibilidad; “menor cantidad de líneas” significa **cero redundancia**, no código ilegible.
6. El archivo debe pasar validación de sintaxis antes de entregarse.
7. Las instrucciones de reparación deben mencionar símbolos reales del `.js` y ser breves, técnicas y no ambiguas.

## Reflejo exacto del código — formalización matemática, tecnicismos y lenguaje de programación

Esta sección **agrega** la instrucción de reflejo exacto sin sustituir la redacción P3 existente. La documentación usa los mismos nombres de variables, funciones, estructuras y contratos del `.js`; la proporción 50/50 se interpreta como equilibrio aproximado entre explicación técnica y representación ejecutable/formal, no como conteo mecánico de palabras.

### Modelo formal global del módulo

- `P = (Balanza(C,M), EstadoResultados(C,M), BalanceGeneral(C,M))`.
- `reconstruirProyeccionContable(): (C,M) → P`.
- `obtenerBalanzaProyectada() = P_persistida ∨ reconstruirProyeccionContable()`.
- `tipo∈EVENTOS_QUE_AFECTAN_BALANZA ⇒ reconstruirProyeccionContable()`.

### Declaraciones y estado de módulo reflejados desde el código

```js
﻿const ID_PROYECCION_BALANZA = "balanza-comprobacion";
const EVENTOS_QUE_AFECTAN_BALANZA = Object.values(TIPOS_EVENTOS);
iniciarProyeccionContable();
```

### FASE 00 — Configuración, constantes y estado — espejo técnico

**Alcance:** constantes/estado de módulo y dependencias previas a la ejecución de funciones.

**Formalización de la fase:** `Proyección = f(cuentas,movimientos) = {balanza,estadoResultados,balanceGeneral}`; un evento relevante invalida/reconstruye `f`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(1)` respecto al tamaño de colecciones, salvo costo interno de APIs invocadas.

### FASE 01 — Reconstrucción de proyección — espejo técnico

**Firmas reales:** `async function reconstruirProyeccionContable(evento)`.

**Formalización de la fase:** `Proyección = f(cuentas,movimientos) = {balanza,estadoResultados,balanceGeneral}`; un evento relevante invalida/reconstruye `f`.

**Estructuras/tecnicismos reales:** DOM.

**Complejidad dominante:** Costo CPU local cercano a `O(1)` más latencia de I/O/asíncrona determinada por la API externa o el almacenamiento.

**Postcondiciones/retornos observables extraídos:**

```js
return proyeccion;
```

**Código exacto correspondiente a la fase:**

```js
async function reconstruirProyeccionContable(evento) {
const cuentas = await obtenerCuentasBD();
const movimientos = await obtenerMovimientosBD();
const balanza = generarBalanzaComprobacion(cuentas, movimientos);
const estadoResultados = generarEstadoResultados(cuentas, movimientos);
const balanceGeneral = generarBalanceGeneral(cuentas, movimientos);
const proyeccion = {
id: ID_PROYECCION_BALANZA,
actualizadaEn: new Date().toISOString(),
ultimoEventoId: evento && evento.id ? evento.id : null,
ultimoEventoTipo: evento && evento.tipo
? evento.tipo
: "ReconstruccionInicial",
balanza: balanza,
estadoResultados: estadoResultados,
balanceGeneral: balanceGeneral
};
await guardarProyeccionBD(proyeccion);
document.dispatchEvent(new CustomEvent("proyeccion:actualizada", {
detail: proyeccion
}));
return proyeccion;
}

```

### FASE 02 — Lectura de proyección — espejo técnico

**Firmas reales:** `async function obtenerBalanzaProyectada()`.

**Formalización de la fase:** `Proyección = f(cuentas,movimientos) = {balanza,estadoResultados,balanceGeneral}`; un evento relevante invalida/reconstruye `f`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** Costo CPU local cercano a `O(1)` más latencia de I/O/asíncrona determinada por la API externa o el almacenamiento.

**Postcondiciones/retornos observables extraídos:**

```js
return proyeccion || reconstruirProyeccionContable();
```

**Código exacto correspondiente a la fase:**

```js
async function obtenerBalanzaProyectada() {
const proyeccion = await obtenerProyeccionBD(ID_PROYECCION_BALANZA);
return proyeccion || reconstruirProyeccionContable();
}

```

### FASE 03 — Suscripción e inicialización — espejo técnico

**Firmas reales:** `function iniciarProyeccionContable()`.

**Formalización de la fase:** `Proyección = f(cuentas,movimientos) = {balanza,estadoResultados,balanceGeneral}`; un evento relevante invalida/reconstruye `f`.

**Estructuras/tecnicismos reales:** Primitivos/objetos JavaScript definidos por el contrato de las funciones..

**Complejidad dominante:** `O(n)` respecto al tamaño de la colección recorrida.

**Código exacto correspondiente a la fase:**

```js
function iniciarProyeccionContable() {
EVENTOS_QUE_AFECTAN_BALANZA.forEach(function(tipo) {
suscribirEventoContable(tipo, reconstruirProyeccionContable);
});
}

```

### Regla de fidelidad del reflejo

- Las ecuaciones describen únicamente relaciones que ya están codificadas; no sustituyen el comportamiento JavaScript.
- Los nombres `codigo`, `cuenta`, `movimiento`, `partida`, `baseDatos`, stores, eventos y demás símbolos se mantienen exactamente como aparecen en el código.
- Una futura modificación del `.js` exige actualizar esta sección si cambia una firma, condición, estructura, efecto secundario o postcondición.
- No se introducen DAG, criptografía, Circuit Breaker, checksum, GPU/SIMD u otras tecnologías salvo que el propio archivo las implemente.


## 1. Regla P3 utilizada

P3 se interpreta de forma verificable: **pro al 100%** significa que una fortaleza confirmada se preserva sin degradarla; **contra al 0%** significa que ningún contra identificado queda sin una decisión técnica: se corrige, se convierte en restricción preventiva, se remite a una prueba concreta o se documenta como cambio de versión cuando repararlo silenciosamente rompería el contrato.

> **Importante:** “0%” no significa riesgo cibernético absoluto cero. Significa **0% de contras sin tratamiento técnico definido**. P3 no inventa certeza donde faltan pruebas de ejecución.

## 2. Línea base de auditoría

- P1: 85 controles; 3 puntos no conformes o sujetos a revisión.
- P2: 40 controles; 0 mitigaciones verificadas documentalmente y 11 puntos sujetos a tratamiento/revisión.
- Fortalezas preservadas/refutadas favorablemente en P3: 101 controles.

## 3. Refutación de los PRO — objetivo 100%

Se intentó refutar cada control previamente conforme: si no existe evidencia concreta que contradiga su cumplimiento, se conserva. Para evitar redundancia, los controles se agrupan por sección manteniendo todos sus identificadores.

### P1 — Lógica

**Controles:** L01, L02, L03, L04, L05, L06, L07, L08, L09, L10, L11, L12, L13, L14, L16, L17, L18, L19, L20, L21, L22, L23, L24, L25.  
**Refutación:** no se encontró evidencia concreta en P1/P2 que invalide estos controles. Las mitigaciones P2 se consideran fortalezas recuperadas y no deben revertirse.  
**Decisión P3:** conservar comportamiento y contratos asociados. **Pro preservado: 100%.**

### P1 — Programación

**Controles:** P01, P02, P03, P05, P06, P07, P08, P09, P10, P11, P12, P13, P14, P15, P17, P18, P19, P20.  
**Refutación:** no se encontró evidencia concreta en P1/P2 que invalide estos controles. Las mitigaciones P2 se consideran fortalezas recuperadas y no deben revertirse.  
**Decisión P3:** conservar comportamiento y contratos asociados. **Pro preservado: 100%.**

### P1 — Sintaxis

**Controles:** S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20.  
**Refutación:** no se encontró evidencia concreta en P1/P2 que invalide estos controles. Las mitigaciones P2 se consideran fortalezas recuperadas y no deben revertirse.  
**Decisión P3:** conservar comportamiento y contratos asociados. **Pro preservado: 100%.**

### P1 — Estructuras de datos

**Controles:** D01, D02, D03, D04, D05, D06, D07, D08, D09, D10, D11, D12, D13, D14, D15, D16, D17, D18, D19, D20.  
**Refutación:** no se encontró evidencia concreta en P1/P2 que invalide estos controles. Las mitigaciones P2 se consideran fortalezas recuperadas y no deben revertirse.  
**Decisión P3:** conservar comportamiento y contratos asociados. **Pro preservado: 100%.**

### P2 — 4. 20 controles de seguridad de la información

**Controles:** SI01, SI02, SI04, SI09, SI11, SI12, SI13, SI14, SI16, SI17, SI19.  
**Refutación:** no se encontró evidencia concreta en P1/P2 que invalide estos controles. Las mitigaciones P2 se consideran fortalezas recuperadas y no deben revertirse.  
**Decisión P3:** conservar comportamiento y contratos asociados. **Pro preservado: 100%.**

### P2 — 5. 20 controles de ciberseguridad — MITRE CWE

**Controles:** CWE-400, CWE-770, CWE-200, CWE-209, CWE-94, CWE-78, CWE-22, CWE-1321.  
**Refutación:** no se encontró evidencia concreta en P1/P2 que invalide estos controles. Las mitigaciones P2 se consideran fortalezas recuperadas y no deben revertirse.  
**Decisión P3:** conservar comportamiento y contratos asociados. **Pro preservado: 100%.**

## 4. Refutación de los CONTRA — objetivo 0%

| Origen | ID | Contra / riesgo | Refutación P3 | Tratamiento definitivo | Resultado |
|---|---|---|---|---|---|
| P1 | L15 | Límites y casos extremos: Todos los tipos de evento reconstruyen los tres reportes completos, aunque algunos cambios podrían no afectarlos. | No existe evidencia suficiente para llamarlo defecto confirmado; se mantiene como riesgo condicionado hasta probar el contrato. | Mantener corrección; optimizar solo si se mide impacto. | 0% ambigüedad: prueba/regla obligatoria definida. |
| P1 | P04 | Manejo explícito de excepciones: `iniciarProyeccionContable()` se ejecuta al cargar sin contención local de errores de suscripción. | No existe evidencia suficiente para llamarlo defecto confirmado; se mantiene como riesgo condicionado hasta probar el contrato. | Agregar manejo de inicialización si este script puede cargarse fuera del orden esperado. | 0% ambigüedad: prueba/regla obligatoria definida. |
| P1 | P16 | Separación UI/dominio/persistencia: Línea aprox. 21: La proyección contable despacha directamente un `CustomEvent` sobre `document`, acoplando cálculo/persistencia con DOM. | La evidencia es concreta; el contra se acepta y no puede maquillarse como pro. | Separar notificación de UI del módulo de proyección o documentar este acoplamiento como contrato. | 0% sin tratamiento: reparación obligatoria definida. |
| P2 | SI03 | Disponibilidad y recuperación: La inicialización automática depende del orden de carga y suscripciones disponibles. | La evidencia mantiene una debilidad plausible; debe cerrarse con la acción indicada o una prueba que demuestre conformidad. | Contener fallo de inicialización y registrar diagnóstico técnico. | 0% sin tratamiento: acción/prueba obligatoria definida. |
| P2 | SI06 | Mínimo privilegio funcional: El módulo dispara CustomEvent sobre document, acoplando proyección con DOM. | La evidencia mantiene una debilidad plausible; debe cerrarse con la acción indicada o una prueba que demuestre conformidad. | Mantener si es contrato actual; en evolución, introducir adaptador de notificación UI. | 0% sin tratamiento: acción/prueba obligatoria definida. |
| P2 | SI10 | Protección del almacenamiento local: El módulo participa en datos persistentes del navegador. | P2 no demuestra una vulnerabilidad explotable local; se refuta como hallazgo confirmado y se conserva como control preventivo. | No tratar almacenamiento local como repositorio de secretos; documentar sensibilidad de datos. | 0% vulnerabilidad confirmada; prevención 100% definida. |
| P2 | SI15 | Respaldo / reversión: La capacidad de rollback/reconciliación depende del proceso concreto. | P2 no demuestra una vulnerabilidad explotable local; se refuta como hallazgo confirmado y se conserva como control preventivo. | Probar fallos parciales y documentar compensación donde existan múltiples efectos secundarios. | 0% vulnerabilidad confirmada; prevención 100% definida. |
| P2 | SI20 | Pruebas de seguridad y regresión: P1/P2 son auditorías estáticas; la cobertura automatizada del módulo no está demostrada en este ZIP. | P2 no demuestra una vulnerabilidad explotable local; se refuta como hallazgo confirmado y se conserva como control preventivo. | Agregar pruebas de regresión para entradas inválidas, errores asíncronos y contratos críticos. | 0% vulnerabilidad confirmada; prevención 100% definida. |
| P2 | CWE-20 | Improper Input Validation: Toda frontera debe mantener validación de tipo/formato; la auditoría requiere pruebas negativas. | P2 no demuestra una vulnerabilidad explotable local; se refuta como hallazgo confirmado y se conserva como control preventivo. | Validar tipos, rangos, formato y relaciones antes de efectos secundarios. | 0% vulnerabilidad confirmada; prevención 100% definida. |
| P2 | CWE-312 | Cleartext Storage of Sensitive Information: Puede participar en persistencia local; la sensibilidad de los datos debe clasificarse. | P2 no demuestra una vulnerabilidad explotable local; se refuta como hallazgo confirmado y se conserva como control preventivo. | No almacenar credenciales/tokens en IndexedDB; definir controles según sensibilidad. | 0% vulnerabilidad confirmada; prevención 100% definida. |
| P2 | CWE-922 | Insecure Storage of Sensitive Information: Puede participar en persistencia local; la sensibilidad de los datos debe clasificarse. | P2 no demuestra una vulnerabilidad explotable local; se refuta como hallazgo confirmado y se conserva como control preventivo. | No almacenar credenciales/tokens en IndexedDB; definir controles según sensibilidad. | 0% vulnerabilidad confirmada; prevención 100% definida. |
| P2 | CWE-362 | Concurrent Execution using Shared Resource with Improper Synchronization: Existen operaciones asíncronas/estado compartido; revisar intercalado de efectos. | P2 no demuestra una vulnerabilidad explotable local; se refuta como hallazgo confirmado y se conserva como control preventivo. | Mantener atomicidad/orden y evitar IDs dependientes de estado compartido sin coordinación. | 0% vulnerabilidad confirmada; prevención 100% definida. |
| P2 | CWE-754 | Improper Check for Unusual or Exceptional Conditions: Se requiere verificar rutas de excepción y recuperación con pruebas negativas. | P2 no demuestra una vulnerabilidad explotable local; se refuta como hallazgo confirmado y se conserva como control preventivo. | No ocultar errores críticos; revertir/propagar de forma consistente. | 0% vulnerabilidad confirmada; prevención 100% definida. |
| P2 | CWE-703 | Improper Check or Handling of Exceptional Conditions: Inicialización sin contención local si faltan dependencias. | La evidencia mantiene una debilidad plausible; debe cerrarse con la acción indicada o una prueba que demuestre conformidad. | try { iniciarProyeccionContable(); } catch (error) { ... } | 0% sin tratamiento: acción/prueba obligatoria definida. |

## 5. Sintaxis técnica de reparación

Las siguientes sintaxis son **reparaciones o contratos de implementación**, no ejemplos decorativos. Deben aplicarse solo si el cambio no rompe una API pública; cuando el cambio sea arquitectónico se marca como instrucción de versión.

### Contener error de inicialización

```js
function iniciarProyeccionContable() {
    EVENTOS_QUE_AFECTAN_BALANZA.forEach(function(tipo) {
        suscribirEventoContable(tipo, reconstruirProyeccionContable);
    });
}
try { iniciarProyeccionContable(); } catch (error) { console.error("No se pudo iniciar la proyección:", error); }
```

### Desacoplar notificación de UI

- Mantener el cálculo/persistencia en `reconstruirProyeccionContable`; mover `document.dispatchEvent(...)` a un adaptador UI en una versión que permita refactor arquitectónico.

## 6. Instrucciones finales P3 — breves, técnicas y no ambiguas

1. Contener errores de inicialización de suscripciones.
2. No mezclar nuevas responsabilidades UI con cálculo/persistencia de proyecciones.
3. Reconstruir reportes desde cuentas y movimientos confirmados.
4. Probar equivalencia entre proyección persistida y cálculo directo.

## 7. Compuerta de cierre

- **Pros:** todos los controles conformes/mitigados fueron revisados y se preservan; objetivo documental **100%**.
- **Contras:** todos los hallazgos/riesgos tienen reparación, prueba o regla de versión definida; **0% de contras sin tratamiento**.
- **No se declara riesgo absoluto cero:** los controles que requieren ejecución se cierran únicamente después de pruebas negativas y de regresión.
- **No alterar arquitectura pública para “mejorar” estilo:** cualquier cambio incompatible debe versionarse y probar consumidores.
