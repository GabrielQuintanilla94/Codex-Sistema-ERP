const METODO_VALUACION_INVENTARIO = "PROMEDIO_PONDERADO_PERPETUO";
const CUENTA_INVENTARIO_MATERIALES = "1104";
const CUENTA_COSTO_MATERIALES = "5001";

function inventarioACentavos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) throw new Error("El importe de inventario no es válido.");
    return Math.round(numero * 100);
}

function inventarioADolares(centavos) {
    return Number(centavos || 0) / 100;
}

function validarCantidadInventario(cantidad) {
    const numero = Number(cantidad);
    if (!Number.isFinite(numero) || numero <= 0) throw new Error("La cantidad debe ser mayor que cero.");
    return numero;
}

function normalizarSKU(sku) {
    const valor = String(sku || "").trim();
    if (!valor) throw new Error("El SKU es obligatorio.");
    return valor;
}

function normalizarTipoInventario(tipo) {
    const valor = String(tipo || "").trim().toLowerCase();
    if (!valor) return "";
    if (valor === "entrada") return "Entrada";
    if (valor === "salida") return "Salida";
    throw new Error("El tipo de inventario debe ser Entrada o Salida.");
}

function crearEstadoInventarioVacio(sku, descripcion, marcaTiempo) {
    return {
        sku: normalizarSKU(sku),
        descripcion: String(descripcion || "").trim(),
        cantidad: 0,
        valorInventarioCentavos: 0,
        costoPromedioCentavos: 0,
        metodoValuacion: METODO_VALUACION_INVENTARIO,
        actualizadoEn: String(marcaTiempo || "")
    };
}

function clonarEstadoInventario(estado) {
    return estado ? { ...estado } : null;
}
function verificarEstadoInventarioTresNiveles(estado, contexto) {
    const cantidad = Number(estado?.cantidad || 0);
    const valor = Number(estado?.valorInventarioCentavos || 0);
    const promedio = Number(estado?.costoPromedioCentavos || 0);
    const nivel1 = Number.isFinite(cantidad) && cantidad >= 0 && Number.isInteger(valor) && valor >= 0 && Number.isInteger(promedio) && promedio >= 0;
    const nivel2 = cantidad === 0 ? valor === 0 && promedio === 0 : valor > 0;
    const tolerancia = Math.max(1, Math.ceil(Math.abs(cantidad)));
    const nivel3 = cantidad === 0 || Math.abs(Math.round(cantidad * promedio) - valor) <= tolerancia;
    const verificacion = {
        valido: nivel1 && nivel2 && nivel3,
        contexto: String(contexto || "Inventario"),
        niveles: [
            { nivel: 1, nombre: "Límites y enteros monetarios", valido: nivel1 },
            { nivel: 2, nombre: "Existencia coherente con valor", valido: nivel2 },
            { nivel: 3, nombre: "Promedio aproxima valor total", valido: nivel3 }
        ]
    };
    if (!verificacion.valido) throw new Error("El estado de inventario no superó la triple verificación: " + verificacion.contexto + ".");
    return verificacion;
}

function calcularEntradaPorValor(estadoActual, datos) {
    const sku = normalizarSKU(datos.sku);
    const cantidadEntrada = validarCantidadInventario(datos.cantidad);
    const costoTotalEntradaCentavos = inventarioACentavos(datos.valorTotal);
    if (costoTotalEntradaCentavos <= 0) throw new Error("La entrada de inventario debe tener un valor al Debe mayor que cero.");
    const actual = estadoActual || crearEstadoInventarioVacio(sku, datos.descripcion);
    const nuevaCantidad = Number(actual.cantidad || 0) + cantidadEntrada;
    const nuevoValorCentavos = Number(actual.valorInventarioCentavos || 0) + costoTotalEntradaCentavos;
    const nuevoPromedioCentavos = Math.round(nuevoValorCentavos / nuevaCantidad);
    const resultado = {
        sku: sku,
        descripcion: String(datos.descripcion || actual.descripcion || sku).trim(),
        cantidad: nuevaCantidad,
        valorInventarioCentavos: nuevoValorCentavos,
        costoPromedioCentavos: nuevoPromedioCentavos,
        metodoValuacion: METODO_VALUACION_INVENTARIO,
        actualizadoEn: String(datos.actualizadoEn || actual.actualizadoEn || "")
    };
    verificarEstadoInventarioTresNiveles(resultado, "Entrada " + sku);
    return resultado;
}

function calcularSalidaPorCantidad(estadoActual, datos) {
    if (!estadoActual) throw new Error("El SKU " + datos.sku + " no existe en inventario.");
    const cantidadSalida = validarCantidadInventario(datos.cantidad);
    const cantidadActual = Number(estadoActual.cantidad || 0);
    if (cantidadSalida > cantidadActual) {
        throw new Error("La salida de " + datos.sku + " supera la existencia disponible (" + cantidadActual + ").");
    }
    const promedioCentavos = Number(estadoActual.costoPromedioCentavos || 0);
    const costoSalidaCentavos = Math.round(cantidadSalida * promedioCentavos);
    const cantidadFinal = cantidadActual - cantidadSalida;
    const valorFinalCentavos = cantidadFinal === 0
        ? 0
        : Number(estadoActual.valorInventarioCentavos || 0) - costoSalidaCentavos;
    const resultado = {
        estado: {
            ...estadoActual,
            cantidad: cantidadFinal,
            valorInventarioCentavos: valorFinalCentavos,
            costoPromedioCentavos: cantidadFinal === 0 ? 0 : promedioCentavos,
            actualizadoEn: String(datos.actualizadoEn || estadoActual.actualizadoEn || "")
        },
        costoSalidaCentavos: costoSalidaCentavos
    };
    verificarEstadoInventarioTresNiveles(resultado.estado, "Salida " + datos.sku);
    const nivelCosto = costoSalidaCentavos >= 0 && valorFinalCentavos >= 0 && valorFinalCentavos === (cantidadFinal === 0 ? 0 : Number(estadoActual.valorInventarioCentavos || 0) - costoSalidaCentavos);
    if (!nivelCosto) throw new Error("La salida de inventario no superó la verificación de costo y valor remanente.");
    return resultado;
}

function ordenarMovimientosInventario(movimientosEntrada) {
    return (Array.isArray(movimientosEntrada) ? movimientosEntrada.slice() : []).sort(function(a, b) {
        const fechaA = String(a.fecha || "");
        const fechaB = String(b.fecha || "");
        return fechaA.localeCompare(fechaB) || Number(a.id || 0) - Number(b.id || 0);
    });
}

function construirMapaInventarioDesdeMovimientos(movimientosEntrada) {
    const estados = new Map();
    const historial = [];
    ordenarMovimientosInventario(movimientosEntrada).forEach(function(movimiento) {
        const marcaTiempo = movimiento.editadoEn || movimiento.actualizadoEn || movimiento.creadoEn || movimiento.fecha;
        (movimiento.partida || []).forEach(function(linea, indice) {
            if (String(linea.codigo || "") !== CUENTA_INVENTARIO_MATERIALES) return;
            const tipo = normalizarTipoInventario(linea.tipoInventario);
            if (!tipo) return;
            const sku = normalizarSKU(linea.sku);
            const cantidad = validarCantidadInventario(linea.cantidadInventario);
            const descripcion = String(linea.descripcionMaterial || linea.descripcion || sku).trim();
            const debeCentavos = inventarioACentavos(linea.debe || 0);
            const haberCentavos = inventarioACentavos(linea.haber || 0);
            if (tipo === "Entrada") {
                if (debeCentavos <= 0 || haberCentavos !== 0) {
                    throw new Error("La entrada de inventario " + sku + " debe registrarse al Debe.");
                }
                const nuevo = calcularEntradaPorValor(estados.get(sku), {
                    sku: sku,
                    descripcion: descripcion,
                    cantidad: cantidad,
                    valorTotal: inventarioADolares(debeCentavos),
                    actualizadoEn: marcaTiempo
                });
                estados.set(sku, nuevo);
                historial.push({
                    movimientoId: movimiento.id,
                    numero: movimiento.numero,
                    fecha: movimiento.fecha,
                    linea: indice + 1,
                    tipo: "Entrada",
                    sku: sku,
                    cantidad: cantidad,
                    valor: inventarioADolares(debeCentavos),
                    costoPromedio: inventarioADolares(nuevo.costoPromedioCentavos)
                });
            } else {
                if (debeCentavos !== 0) throw new Error("La salida de inventario " + sku + " no puede registrarse al Debe.");
                const calculo = calcularSalidaPorCantidad(estados.get(sku), { sku: sku, cantidad: cantidad, actualizadoEn: marcaTiempo });
                const diferencia = Math.abs(haberCentavos - calculo.costoSalidaCentavos);
                if (haberCentavos > 0 && diferencia > 1) {
                    throw new Error(
                        "El costo registrado para la salida de " + sku + " no coincide con el promedio ponderado. " +
                        "Esperado: $" + inventarioADolares(calculo.costoSalidaCentavos).toFixed(2) + "."
                    );
                }
                estados.set(sku, calculo.estado);
                historial.push({
                    movimientoId: movimiento.id,
                    numero: movimiento.numero,
                    fecha: movimiento.fecha,
                    linea: indice + 1,
                    tipo: "Salida",
                    sku: sku,
                    cantidad: cantidad,
                    valor: inventarioADolares(calculo.costoSalidaCentavos),
                    costoPromedio: inventarioADolares(Number(calculo.estado.costoPromedioCentavos || 0))
                });
            }
        });
    });
    return { estados: estados, historial: historial };
}

function prepararMovimientoConInventario(movimientoEntrada, movimientosPrevios) {
    const movimiento = JSON.parse(JSON.stringify(movimientoEntrada));
    movimiento.partida = (movimiento.partida || []).filter(function(linea) {
        return linea.generadoInventario !== true;
    });
    const simulacion = construirMapaInventarioDesdeMovimientos(movimientosPrevios || []);
    const estados = simulacion.estados;
    let costoSalidasCentavos = 0;
    let tieneSalida = false;

    movimiento.partida.forEach(function(linea, indice) {
        const tipo = normalizarTipoInventario(linea.tipoInventario);
        const tieneDatosInventario = tipo || String(linea.sku || "").trim() || Number(linea.cantidadInventario || 0) > 0;
        if (!tieneDatosInventario) return;
        if (String(linea.codigo || "") !== CUENTA_INVENTARIO_MATERIALES) {
            throw new Error("Los campos SKU/unidades solo pueden utilizarse con la cuenta 1104 Inventario de materiales.");
        }
        if (!tipo) throw new Error("Seleccione Entrada o Salida para la línea de inventario " + (indice + 1) + ".");
        const sku = normalizarSKU(linea.sku);
        const cantidad = validarCantidadInventario(linea.cantidadInventario);
        linea.tipoInventario = tipo;
        linea.sku = sku;
        linea.cantidadInventario = cantidad;
        linea.descripcionMaterial = String(linea.descripcionMaterial || linea.descripcion || sku).trim();

        if (tipo === "Entrada") {
            const debeCentavos = inventarioACentavos(linea.debe || 0);
            if (debeCentavos <= 0 || inventarioACentavos(linea.haber || 0) !== 0) {
                throw new Error("La entrada de " + sku + " debe llevar su costo total al Debe de Inventario.");
            }
            const nuevo = calcularEntradaPorValor(estados.get(sku), {
                sku: sku,
                descripcion: linea.descripcionMaterial,
                cantidad: cantidad,
                valorTotal: linea.debe
            });
            estados.set(sku, nuevo);
        } else {
            if (inventarioACentavos(linea.debe || 0) !== 0) {
                throw new Error("La salida de " + sku + " no puede llevar valor al Debe de Inventario.");
            }
            const calculo = calcularSalidaPorCantidad(estados.get(sku), { sku: sku, cantidad: cantidad });
            linea.debe = 0;
            linea.haber = inventarioADolares(calculo.costoSalidaCentavos);
            estados.set(sku, calculo.estado);
            costoSalidasCentavos += calculo.costoSalidaCentavos;
            tieneSalida = true;
        }
    });

    if (tieneSalida) {
        movimiento.partida.push({
            codigo: CUENTA_COSTO_MATERIALES,
            cuenta: "Materiales",
            descripcion: "Costo de materiales vendidos calculado por promedio ponderado",
            debe: inventarioADolares(costoSalidasCentavos),
            haber: 0,
            generadoInventario: true
        });
    }
    return movimiento;
}

async function reconstruirInventarioDesdeMovimientos(movimientosEntrada) {
    const simulacion = construirMapaInventarioDesdeMovimientos(movimientosEntrada || []);
    const existentes = await obtenerInventariosBD();
    for (const producto of existentes) {
        await eliminarInventarioBD(producto.sku);
    }
    for (const estado of simulacion.estados.values()) {
        await guardarInventarioBD(estado);
    }
    return {
        productos: Array.from(simulacion.estados.values()),
        historial: simulacion.historial
    };
}

async function obtenerResumenInventario() {
    const productos = await obtenerInventariosBD();
    const valorTotalCentavos = productos.reduce(function(total, producto) {
        return total + Number(producto.valorInventarioCentavos || 0);
    }, 0);
    return {
        metodoValuacion: METODO_VALUACION_INVENTARIO,
        productos: productos,
        cantidadSKUs: productos.length,
        valorTotal: inventarioADolares(valorTotalCentavos)
    };
}

// Inicio fase 4 — Inventario y partidas comparten la transacción del orquestador.
function cambiosInventarioDesdeMovimientos(movimientosEntrada) {
const estados = construirMapaInventarioDesdeMovimientos(movimientosEntrada).estados;
return [{ almacen: ALMACEN_INVENTARIO, accion: "limpiar" }].concat(Array.from(estados.values(), function(estado) { return { almacen: ALMACEN_INVENTARIO, accion: "guardar", valor: estado }; }));
}
// Fin fase 4
// Inicio fase 5 — Relectura independiente del inventario completo.
async function verificarInventarioDesdeMovimientos(movimientosEntrada) {
const esperados = construirMapaInventarioDesdeMovimientos(movimientosEntrada).estados;
const actuales = await obtenerInventariosBD();
if (actuales.length !== esperados.size || !actuales.every(function(actual) { return estadoPersistidoCoincide(esperados.get(actual.sku), actual); })) throw new Error("El inventario persistido no coincide con los movimientos esperados.");
return true;
}
// Fin fase 5
