# depreciacion.js — P3 v4 SRP / determinismo / triple verificación

## Qué es este archivo
`js/depreciacion/depreciacion.js` es el módulo de dominio de depreciación de activos fijos. Reconstruye los activos desde el Libro Diario, calcula depreciación por línea recta, valida los resultados matemáticos y prepara/persiste las partidas automáticas de depreciación.

## Propósito técnico
Conservar la lógica contable de depreciación separada de la UI, IndexedDB y el renderizado. La refactorización aplica **SRP**, **DRY/no redundancia**, **determinismo**, **aislamiento** y **tres verificaciones matemáticas independientes** antes de que un cálculo pueda ser renderizado o contabilizado.

## Configuración real
```js
const CONFIGURACION_DEPRECIACION = Object.freeze({
  "1201": { categoria: "Edificios", vidaUtilAnios: 20, cuentaDepreciacionAcumulada: "1301", cuentaGastoDepreciacion: "6201" },
  "1202": { categoria: "Maquinaria", vidaUtilAnios: 5, cuentaDepreciacionAcumulada: "1302", cuentaGastoDepreciacion: "6202" },
  "1203": { categoria: "Automóviles", vidaUtilAnios: 4, cuentaDepreciacionAcumulada: "1303", cuentaGastoDepreciacion: "6203" },
  "1204": { categoria: "Otros bienes muebles", vidaUtilAnios: 2, cuentaDepreciacionAcumulada: "1304", cuentaGastoDepreciacion: "6204" }
});
```

## Modelo matemático
```text
BaseDepreciable = Costo - ValorResidual
MesesVida = VidaUtilAnios × 12
CuotaMensual = round(BaseDepreciable / MesesVida)
PrimerPeriodo = round(CuotaMensual × DiasUso / DiasMes)
DepAcumulada(t) = Σ CuotasCerradas(t)
ValorLibros(t) = max(ValorResidual, Costo - DepAcumulada(t))
```

La última cuota se limita al remanente:
```text
Σ Calendario = BaseDepreciable
DepAcumulada <= BaseDepreciable
ValorLibros >= ValorResidual
```

# Refactor SRP por responsabilidad

## FASE 00 — Telemetría aislada
Funciones:
```js
registrarTelemetriaDepreciacion()
registrarVerificacionDepreciacion()
```
Solo registran contadores/estado diagnóstico. No calculan, no renderizan y no escriben IndexedDB.

## FASE 01 — Utilidades deterministas
Funciones:
```js
obtenerConfiguracionDepreciacion()
esCuentaActivoFijo()
depreciacionACentavos()
depreciacionADolares()
fechaDepreciacionValida()
fechaUTCDesdeISO()
ultimoDiaMesUTC()
periodoISO()
resolverFechaCorteEfectiva()
ultimoDiaPeriodoISO()
periodoCerradoAFecha()
```

### Determinismo
La función crítica ya no necesita consultar internamente el reloj cuando recibe ambos valores:
```js
resolverFechaCorteEfectiva(fechaCorte, fechaSistema)
```

Formalmente:
```text
f(fechaCorte, fechaSistema) = min(fechaCorte, fechaSistema)
```
Mismas entradas ⇒ misma salida.

`fechaSistemaLocalISO()` queda aislada como frontera de reloj. Los flujos de cálculo capturan esa fecha una sola vez y la pasan explícitamente.

## FASE 02 — Validación de adquisición PPE
Responsabilidades separadas:
```js
validarDatosAdquisicionActivo(movimiento, linea, indice)
construirMetadataActivoFijo(movimiento, linea, indice, validado)
prepararMovimientoConDepreciacion(movimiento)
```

La validación no construye partidas ni calcula cuotas. La construcción de metadata no persiste.

Código crítico:
```js
if (fechaDisponibleUso < movimiento.fecha)
    throw new Error("La fecha disponible para uso no puede ser anterior a la adquisición...");

if (residualCentavos < 0 || residualCentavos >= costoCentavos)
    throw new Error("El valor residual debe ser ... menor que el costo...");
```

## FASE 03 — Reconstrucción del auxiliar PPE
Funciones:
```js
activoDesdeLineaMovimiento()
extraerActivosFijosDesdeMovimientos()
```

Conjunto formal:
```text
Activos = { linea ∈ LibroDiario |
            cuenta ∈ {1201,1202,1203,1204}
            ∧ Debe > 0
            ∧ activoFijo existe }
```

Complejidad:
```text
Recorrido de líneas: O(L)
Ordenamiento de A activos: O(A log A)
```

## FASE 04 — Motor puro de línea recta
Funciones:
```js
validarActivoParaCalculo()
calcularCuotaMensualCentavos()
calcularCuotaPrimerPeriodoCentavos()
construirCalendarioLineaRecta()
generarCalendarioDepreciacion()
```

La fórmula existe en un único punto:
```js
return Math.round(baseDepreciable / mesesVida);
```
Esto elimina redundancia de fórmulas entre UI, contabilización y reporte.

Primer período:
```js
return Math.round(cuotaMensual * diasUso / diasMes);
```

## FASE 05 — Triple verificación matemática
Antes de considerar confiable un cálculo se ejecutan tres controles distintos.

### Verificación 1 — Identidad de fórmula
Función:
```js
verificarNivel1FormulaDepreciacion(activo, detalle)
```
Comprueba simultáneamente:
```text
BaseCalculada = Costo - Residual
CuotaCalculada = round(Base / (Vida × 12))
Σ Calendario = Base
```

### Verificación 2 — Invariantes del calendario
Función:
```js
verificarNivel2InvariantesCalendario(activo, detalle)
```
Para cada fila `i`:
```text
Acumulada_i = Σ monto_1..i
ValorLibros_i = Costo - Acumulada_i
Acumulada_i <= Base
ValorLibros_i >= Residual
```
Al final:
```text
AcumuladaFinal = Base
ValorFinal = Residual
```

### Verificación 3 — Recalculo independiente a corte
Función:
```js
verificarNivel3CorteDepreciacion(activo, calculo, fechaCorteEfectiva)
```
Recalcula desde el calendario únicamente meses cerrados y contrasta:
```text
DepAcumuladaReportada = Σ cuotas(periodo cerrado)
ValorLibrosReportado = Costo - DepAcumuladaReportada
```

### Compuerta final
```js
verificarCalculoDepreciacionTresNiveles()
```
Solo devuelve éxito cuando:
```text
V1 ∧ V2 ∧ V3 = true
```
En caso contrario lanza error y el cálculo no se renderiza ni se usa como resultado confiable.

## FASE 06 — Cálculo a fecha
Función:
```js
calcularDepreciacionAFecha(activo, fechaCorte, fechaSistema)
```

Flujo:
```text
fechaCorte + fechaSistema
→ resolverFechaCorteEfectiva
→ generarCalendarioDepreciacion
→ sumar períodos cerrados
→ calcular valor en libros
→ triple verificación
→ resultado
```

El resultado contiene:
```js
{
  fechaCorteEfectiva,
  cuotaMensualCentavos,
  depreciacionAcumuladaCentavos,
  valorLibrosCentavos,
  baseDepreciableCentavos,
  calendario,
  verificacion
}
```

## FASE 07 — Construcción contable consolidada y aislada
Funciones:
```js
validarCuentasDepreciacion()
obtenerCuotaVerificadaPorPeriodo()
construirDetalleDepreciacionActivo()
construirPartidaDepreciacionConsolidada()
```

La construcción no guarda en BD. Primero obtiene una cuota verificada por cada activo del período y después arma **una sola partida contable por período**.

Para dos activos en `2026-08`, por ejemplo:
```text
Debe   6203 Depreciación - Automóviles       520.83
Haber  1303 Dep. acumulada - Automóviles     520.83
Debe   6204 Depreciación - Otros muebles      20.83
Haber  1304 Dep. acumulada - Otros muebles    20.83
```

Todo lo anterior pertenece a un único movimiento:
```js
{
  numero: "DEP-202608",
  concepto: "Depreciación consolidada 2026-08",
  depreciacionAutomatica: {
    periodo: "2026-08",
    consolidada: true,
    totalCentavos: 54166,
    detalles: [/* un elemento por activo */]
  }
}
```

Invariante de partida doble:
```text
Σ Debe = Σ Haber = Σ cuotaActivosPeriodo
```

## FASE 08 — Idempotencia y planificación consolidada
Funciones:
```js
claveDepreciacionAutomatica()
detallesDepreciacionMovimiento()
movimientoCorrespondeDepreciacion()
esMovimientoDepreciacionAutomatica()
periodoDepreciacionMovimiento()
numeroPartidaDepreciacion()
crearContextoDepreciacion()
construirPeriodosEsperados()
firmaDetallesDepreciacion()
movimientoConsolidadoCoincide()
planificarDepreciacionesPendientes()
```

Invariantes:
```text
∀ periodo cerrado: cantidadPartidasAutomaticasConsolidadas(periodo) <= 1
∀ activo depreciable del periodo: existe exactamente un detalle en esa partida
```

La planificación agrupa primero por `periodo`. Si encuentra partidas automáticas antiguas separadas por activo, las marca para reemplazo por una única partida consolidada. Si ya existe una consolidada con la misma firma `activo + periodo + monto`, no genera otra.

## FASE 09 — Persistencia, migración y recuperación
Funciones:
```js
verificarPersistenciaConsolidada()
eliminarDepreciacionesParaReemplazo()
revertirSincronizacionDepreciacion()
sincronizarDepreciacionAutomatica()
```

`sincronizarDepreciacionAutomatica()` captura una sola vez la fecha del sistema:
```js
const fechaSistema = fechaSistemaLocalISO();
```

Pipeline:
```text
leer BD
→ crear contexto
→ agrupar cuotas por período
→ detectar movimientos antiguos / consolidado vigente
→ eliminar movimientos automáticos a reemplazar
→ guardar una partida consolidada por período
→ releer BD
→ verificar firma de detalles
→ éxito / restauración de movimientos anteriores
```

La migración es compatible con el formato anterior `depreciacionAutomatica.codigoActivo + periodo`: esos movimientos se reconocen, se eliminan y se sustituyen por el formato consolidado cuando se vuelve a contabilizar al corte.

# Principios exigidos

## SRP
Cada función tiene una sola causa principal de cambio: fecha, validación, cálculo, verificación, construcción contable, planificación o persistencia.

## No redundancia / DRY
La cuota mensual y el calendario se calculan en funciones únicas; UI y persistencia consumen esos resultados y no repiten fórmulas.

## Determinismo
Las funciones matemáticas dependen de argumentos explícitos. El reloj se encapsula en `fechaSistemaLocalISO()` y se toma como snapshot en la frontera.

## Aislamiento
El motor matemático no depende del DOM ni de IndexedDB. La persistencia aparece únicamente en la sincronización; el renderizado está exclusivamente en `depreciacion_ui.js`.

# Invariantes consolidados
```text
Costo > Residual >= 0
VidaUtilAnios > 0
FechaDisponibleUso >= FechaAdquisicion
Base = Costo - Residual
Cuota = round(Base / (Vida × 12))
Σ Calendario = Base
DepAcumulada <= Base
ValorLibros >= Residual
Debe(GastoDep) = Haber(DepAcumulada)
V1 ∧ V2 ∧ V3 antes de renderizar
Periodo contabilizable ⇔ UltimoDiaPeriodo <= min(Corte, FechaSistema)
```

## Complejidad
Para un activo con `M = Vida × 12` meses:
```text
Generar calendario: O(M)
Verificación nivel 1: O(M)
Verificación nivel 2: O(M)
Verificación nivel 3: O(M)
```
Total asintótico sigue siendo `O(M)`, porque tres recorridos lineales no cambian la clase de complejidad.


## ACTUALIZACIÓN — ALGORITMIA DE 5 FASES
Sincronización: fase1EntradaSincronizacionDepreciacion → fase2ValidarSincronizacionDepreciacion → fase3ProcesarSincronizacionDepreciacion → fase4PersistirSincronizacionDepreciacion → fase5VerificarSincronizacionDepreciacion. El evento se emite tras verificación consolidada.
