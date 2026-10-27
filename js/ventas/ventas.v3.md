# ventas.js — reflejo técnico v3

## A. Objetivo
Registrar ventas y producir ingreso, IVA Débito Fiscal, cobro/cuenta por cobrar, salida de inventario y costo de ventas.
## B. Entrada
Fecha, documento, tipo de cliente, cliente/NRC cuando aplique y líneas SKU/cantidad/precio.
## C. Validación
Tipo de cliente permitido, NRC obligatorio para contribuyentes, SKU existente, cantidad disponible y precio positivo.
## D. Procesamiento
Calcula base como `cantidad × precio`, aplica IVA 13%, acredita ventas e IVA débito y delega el costo a promedio ponderado.
## E. Decisión
Consumidor final debita Caja; contribuyente debita Cuentas por cobrar.
## F. Recuperación
La persistencia coordinada revierte operación, partida e inventario si algún paso falla.
## G. Verificación
Partida doble, existencia suficiente y documento único por cliente.
## H. Telemetría
El registro conserva `movimientoId`, tipo de cliente y fecha de creación.

## Afinación octubre 2026
- `calcularResumenVenta()` es la fuente única de base/IVA/total.
- Se verifica existencia acumulada por SKU antes de construir la venta.
- `verificarVentaConstruidaTresNiveles()` valida ventas, IVA/cobro y partida doble.
- Una sola marca de tiempo se reutiliza entre registro y movimiento.


## ACTUALIZACIÓN — ALGORITMIA DE 5 FASES
Ventas: registrar/editar usa fase1EntradaVenta → fase2ValidarVenta → fase3ProcesarVenta → fase4PersistirVenta → fase5VerificarVenta. Stock/costo se procesan antes de persistir y EDA solo se publica tras fase 5.
