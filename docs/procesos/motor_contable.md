# Proceso: motor contable

**Código:** `js/motor_contable.js`

**Invariante:** la suma de todos los cargos debe ser igual a la suma de todos los abonos.

## Clasificación usada

- Códigos que empiezan con `1`: Activo.
- Códigos que empiezan con `2`: Pasivo.
- Códigos que empiezan con `3`: Patrimonio.
- Códigos que empiezan con `4`: Ingresos.
- Códigos que empiezan con `5`: Gastos.

## Fase 1: preparar datos

- **A. Objetivo:** preparar catálogo, partidas, período e importes.
- **B. Entrada (Zero-Trust):** cuentas y movimientos recibidos desde almacenamiento.
- **C. Validación:** exigir listas y valores numéricos finitos.
- **D. Procesamiento:** convertir importes a centavos y crear índices por código.
- **E. Decisión:** detenerse ante códigos vacíos o duplicados.
- **F. Recuperación:** lanzar un error antes de calcular saldos.
- **G. Verificación:** cada cuenta auxiliar debe tener un acumulador.
- **H. Telemetría:** el llamador conserva el resultado o error.

## Fase 2: validar partida doble

- **A. Objetivo:** aceptar únicamente partidas contables válidas.
- **B. Entrada (Zero-Trust):** cada movimiento y sus líneas.
- **C. Validación:** dos líneas como mínimo, cuentas existentes, auxiliares e importes no negativos.
- **D. Procesamiento:** sumar Debe y Haber en centavos.
- **E. Decisión:** aceptar solamente cuando ambos totales coinciden.
- **F. Recuperación:** identificar la partida y la regla que falló.
- **G. Verificación:** ninguna línea puede usar Debe y Haber a la vez.
- **H. Telemetría:** el error se entrega al módulo solicitante.

## Fase 3: acumular

- **A. Objetivo:** sumar los movimientos por cuenta.
- **B. Entrada (Zero-Trust):** partidas aprobadas y rango de fechas.
- **C. Validación:** incluir solamente fechas dentro del período.
- **D. Procesamiento:** acumular Debe y Haber por código.
- **E. Decisión:** omitir movimientos fuera del período.
- **F. Recuperación:** no producir una balanza parcial ante un error.
- **G. Verificación:** cada línea debe encontrar su acumulador.
- **H. Telemetría:** devolver la cantidad de cuentas con movimientos.

## Fase 4: interpretar saldos y resultados

- **A. Objetivo:** presentar saldo deudor, acreedor, natural y resultado neto.
- **B. Entrada (Zero-Trust):** acumulados y naturaleza de la cuenta.
- **C. Validación:** naturaleza `Deudora` o `Acreedora`.
- **D. Procesamiento:** calcular la diferencia y separar ingresos y gastos.
- **E. Decisión:** ubicar saldos y calcular ingresos menos gastos.
- **F. Recuperación:** rechazar naturalezas desconocidas.
- **G. Verificación:** Cuentas por cobrar puede quedar deudora y Cuentas por pagar acreedora.
- **H. Telemetría:** entregar los resultados ordenados por código.

## Fase 5: verificar reportes

- **A. Objetivo:** confirmar partida doble y ecuación contable.
- **B. Entrada (Zero-Trust):** saldos calculados.
- **C. Validación:** recalcular los totales en centavos.
- **D. Procesamiento:** reducir cuentas a Balanza, Estado de resultados y Balance general.
- **E. Decisión:** devolver reportes solamente si sus ecuaciones coinciden.
- **F. Recuperación:** lanzar una inconsistencia contable.
- **G. Verificación:** Debe = Haber y Activo = Pasivo + Patrimonio.
- **H. Telemetría:** el módulo de reportes informa el resultado.

## Comunicación

No accede a la interfaz ni a IndexedDB. Genera los tres reportes para `proyeccion_contable.js` y `reportes.js`.
