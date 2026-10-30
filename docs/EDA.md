# Comunicación EDA y routing verificable
El dominio guarda y relee cada operación mediante sus cinco fases. Solo después llama `publicarEventoContable`. El bus valida y persiste el evento; `routing_eventos.js` decide qué consumidores de la página deben ejecutarlo. No contiene reglas contables ni modifica Compras/Ventas.

## Registro central
`RUTAS_EVENTOS_CONTABLES` declara los 14 eventos, sus archivos publicadores y los consumidores. `PERFILES_ROUTING` declara qué conexiones exige cada página; las demás vistas no tienen que estar abiertas para registrar una operación. `DEPENDENCIAS_ROUTING` impone proyección → reportes. El router rechaza ciclos, rutas incompletas y consumidores locales ausentes o duplicados con otro manejador.

| Eventos | Publicadores | Destinos declarados |
| --- | --- | --- |
| CuentaCreada / CuentaEliminada | `catalogo/catalogo_ui.js` | Proyección, Reportes, BI |
| PartidaRegistrada / Editada / Eliminada | `diario/libro_diario.js` | Proyección, Reportes, BI, Inventario |
| PartidasImportadas | `importacion/importador_partidas.js` | Proyección, Reportes, BI, Inventario |
| CompraRegistrada / CompraEditada | `compras/compras.js` | Proyección, Reportes, BI, Inventario |
| VentaRegistrada / VentaEditada | `ventas/ventas.js` | Proyección, Reportes, BI, Inventario |
| CompraEliminada / VentaEliminada | `comercial/operaciones.js` | Proyección, Reportes, BI, Inventario |
| IVACerrado | `impuestos/f07.js` | Proyección, Reportes, BI |
| DepreciacionSincronizada | `depreciacion/depreciacion.js` | Proyección, Reportes, BI |

Paths de la tabla relativos a `js/`. Los productores siguen usando los nombres existentes. Las únicas suscripciones internas al bus están en `routing_eventos.js`; cada consumidor registra una función por nombre con `registrarConsumidorContable`.

## Perfiles y ejecución
- `index.html`: BI (`dashboard`).
- `inventario.html`: Inventario, derivado en memoria desde movimientos; no reescribe almacenes al visualizar.
- `reportes.html`: Proyección contable y luego Reportes; se conservan fechas y tipo de reporte seleccionados.
- `partida_manual.html` y `catalogo_cuentas.html`: Proyección contable.
- `operaciones.html` y `depreciacion.html`: publicadores; no necesitan consumidores locales del router. Sus formularios mantienen el refresco local existente.

Los eventos entre pestañas viajan por `BroadcastChannel` dentro del mismo origen/puerto. En cada página se procesan en cola serial y según el DAG. `proyeccion:actualizada` se conserva como notificación DOM de compatibilidad; Reportes ya no depende de ese listener: el router espera la proyección y después llama su consumidor directamente.

## Resiliencia y evidencia
Solo consumidores idempotentes de lectura/renderizado/proyección se reintentan. Son dos reintentos transitorios con backoff y jitter. Los errores contables deterministas no se reintentan. Tras dos ejecuciones fallidas, el circuito abre por consumidor; el siguiente evento tras un segundo prueba Half-Open. Si falla una dependencia, su consumidor posterior se omite. Un fallo no bloquea la cola de eventos posteriores.
El evento permanece en `eventos`; la traza queda en `proyecciones` con clave `routing:<pagina>:<eventoId>`. Registra `en-proceso` antes de ejecutar, avances y estado final verificado. La evidencia puede sobrevivir a una caída y a recargar, pero no hay reproducción automática ni entrega exactamente una vez. Pestañas del mismo perfil comparten la clave de traza: registra el último procesamiento de ese perfil, no identifica cada instancia de pestaña.

## Cómo comprobarlo
En la consola de cualquier página conectada:
```javascript
console.table(obtenerEstadoRoutingEventos().rutas);
obtenerEstadoRoutingEventos();
verificarEnlacesRoutingEventos();
```
`activos` indica los destinos exigidos en la página actual; una página publicadora puede tener cero destinos locales. `faltantes` debe estar vacío. Para una traza concreta:
```javascript
await obtenerProyeccionBD('routing:reportes.html:' + eventoId);
```
`eventoId` debe ser el identificador de un evento real en `obtenerEventosBD()`. `completado` significa que los consumidores del perfil finalizaron y la traza se releyó; no certifica por sí solo que una operación esté contabilizada en las cuentas correctas.

## Conciliación numérica reproducible
`tests/integracion.cjs` abre Operaciones, Reportes e Inventario en el mismo contexto. Compra 10 unidades por $100 + $13 IVA; vende 2 por $40 + $5.20 IVA. Sin refresco manual exige stock 8/$80, costo de ventas $20, ingreso $40, utilidad $20, Activo $138.20 y Pasivo $118.20 + resultado $20. Comprueba la proyección, el balance visible y las trazas; al eliminar la venta exige stock 10/$100 y Activo $113.
La igualdad del balance no basta: también se contrastan cuentas e inventario con importes independientes del motor. Las pruebas adicionales comprueban DAG, enlaces, filtros, ausencia de escrituras desde la vista de Inventario, reintentos, circuito y persistencia de trazas al recargar.
