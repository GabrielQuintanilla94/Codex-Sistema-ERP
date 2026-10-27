# Comunicación EDA

## Orquestador

`js/eventos/bus_eventos.js` es el orquestador. Recibe eventos válidos, los guarda en IndexedDB y los entrega a los consumidores suscritos.

## Flujo

1. Un módulo guarda o elimina una cuenta o partida.
2. El módulo llama `publicarEventoContable()`.
3. `tipos_eventos.js` crea y valida el evento.
4. `bus_eventos.js` guarda el evento en el historial.
5. El bus avisa a `proyeccion_contable.js`.
6. La proyección lee cuentas y movimientos desde IndexedDB.
7. `motor_contable.js` reconstruye la Balanza, el Balance general y el Estado de resultados.
8. `reportes.js` recibe `proyeccion:actualizada` y actualiza la pantalla.

## Matriz de eventos

| Evento | Productor | Cambio realizado antes del evento | Consumidor |
|---|---|---|---|
| `CuentaCreada` | `catalogo_ui.js` | Cuenta guardada y verificada | `proyeccion_contable.js` |
| `CuentaEliminada` | `catalogo_ui.js` | Cuenta eliminada y verificada | `proyeccion_contable.js` |
| `PartidaRegistrada` | `libro_diario.js` | Partida guardada y verificada | `proyeccion_contable.js` |
| `PartidaEliminada` | `libro_diario.js` | Partida eliminada | `proyeccion_contable.js` |
| `PartidasImportadas` | `importador_partidas.js` | Lote CSV guardado | `proyeccion_contable.js` |

`proyeccion:actualizada` es una notificación interna del navegador. Incluye los tres reportes y no se guarda en el historial porque solamente sirve para refrescar la vista.

## Comunicación entre pestañas

`BroadcastChannel` envía los eventos a otras pestañas abiertas en el mismo origen. Si no está disponible, el evento sigue funcionando dentro de la pestaña actual y queda guardado en IndexedDB.

## Recuperación

Si falla un consumidor, el bus registra el error y los demás consumidores continúan. Si la proyección queda desactualizada, `reportes.js` puede reconstruirla leyendo las cuentas y partidas persistidas.
