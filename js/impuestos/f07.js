function filtrarPorPeriodo(registros, periodo) {
    return (registros || []).filter(function(r) { return String(r.fecha || "").slice(0, 7) === periodo; });
}
function filaF07Compra(compra) {
    return [
        normalizarFechaF07(compra.fecha),
        "4",
        "03",
        soloAlfanumerico(compra.documento),
        soloAlfanumerico(compra.nrc),
        compra.proveedor,
        numeroF07(0),
        numeroF07(0),
        numeroF07(0),
        numeroF07(compra.comprasGravadas),
        numeroF07(0),
        numeroF07(0),
        numeroF07(0),
        numeroF07(compra.ivaCredito),
        numeroF07(compra.total),
        "",
        String(compra.tipoOperacion || 1),
        String(compra.clasificacion || 1),
        String(compra.sector || 2),
        String(compra.tipoCostoGasto || 5),
        "3"
    ];
}
function filaF07VentaContribuyente(venta) {
    const doc = soloAlfanumerico(venta.documento);
    return [
        normalizarFechaF07(venta.fecha),
        "4",
        "03",
        doc,
        "N/A",
        doc,
        doc,
        soloAlfanumerico(venta.nrc),
        venta.cliente,
        numeroF07(0),
        numeroF07(0),
        numeroF07(venta.ventasGravadas),
        numeroF07(venta.ivaDebito),
        numeroF07(0),
        numeroF07(0),
        numeroF07(venta.total),
        "",
        String(venta.tipoOperacion || 1),
        String(venta.tipoIngreso || 2),
        "1"
    ];
}
function filaF07VentaConsumidorFinal(venta) {
    const doc = soloAlfanumerico(venta.documento);
    return [
        normalizarFechaF07(venta.fecha),
        "4",
        "01",
        doc,
        "N/A",
        doc,
        doc,
        doc,
        doc,
        "",
        numeroF07(0),
        numeroF07(0),
        numeroF07(0),
        numeroF07(venta.ventasGravadas),
        numeroF07(0),
        numeroF07(0),
        numeroF07(0),
        numeroF07(0),
        numeroF07(0),
        numeroF07(venta.total),
        String(venta.tipoOperacion || 1),
        String(venta.tipoIngreso || 2),
        "2"
    ];
}
function verificarFilaF07(fila, columnasEsperadas, nombreAnexo) {
    if (!Array.isArray(fila) || fila.length !== columnasEsperadas) {
        throw new Error(nombreAnexo + " no cumple la cantidad esperada de columnas (" + columnasEsperadas + ").");
    }
    return true;
}
function generarCSVF07Verificado(registros, periodo, filtro, mapper, columnas, nombreAnexo) {
    const filas = filtrarPorPeriodo(registros, periodo).filter(filtro || function() { return true; }).map(mapper);
    filas.forEach(function(fila) { verificarFilaF07(fila, columnas, nombreAnexo); });
    return construirCSVSinEncabezados(filas);
}
function generarCSVF07Compras(compras, periodo) {
    return generarCSVF07Verificado(compras, periodo, null, filaF07Compra, 21, "Anexo 3 Compras");
}
function generarCSVF07VentasContribuyentes(ventas, periodo) {
    return generarCSVF07Verificado(ventas, periodo, function(v) { return v.tipoCliente === "CONTRIBUYENTE"; }, filaF07VentaContribuyente, 20, "Anexo 1 Ventas a contribuyentes");
}
function generarCSVF07VentasConsumidorFinal(ventas, periodo) {
    return generarCSVF07Verificado(ventas, periodo, function(v) { return v.tipoCliente === "CONSUMIDOR_FINAL"; }, filaF07VentaConsumidorFinal, 23, "Anexo 2 Ventas a consumidor final");
}
/* ALGORITMIA 5 FASES — cierre mensual de IVA. */
function fase1EntradaCierreIVA(periodo) {
    const valor = String(periodo || "").trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) throw new Error("Seleccione un período válido.");
    return { periodo: valor, referencia: "IVA-CIERRE-" + valor };
}
async function fase2ValidarCierreIVA(entrada) {
    const [compras, ventas, movimientos] = await Promise.all([obtenerComprasBD(), obtenerVentasBD(), obtenerMovimientosBD()]);
    if (movimientos.some(function(m) { return String(m.referencia || "") === entrada.referencia; })) {
        throw new Error("El cierre de IVA de " + entrada.periodo + " ya fue contabilizado.");
    }
    const comprasPeriodo = filtrarPorPeriodo(compras, entrada.periodo);
    const ventasPeriodo = filtrarPorPeriodo(ventas, entrada.periodo);
    const resumen = resumirIVA(comprasPeriodo, ventasPeriodo);
    if (!resumen.verificacion?.valido || resumen.verificacion.niveles.length !== 3) throw new Error("El cierre no puede contabilizarse sin triple verificación del IVA.");
    const credito = comercialACentavos(resumen.creditoFiscal);
    const debito = comercialACentavos(resumen.debitoFiscal);
    if (credito === 0 && debito === 0) throw new Error("No existen operaciones de IVA para el período seleccionado.");
    return { entrada: entrada, comprasPeriodo: comprasPeriodo, ventasPeriodo: ventasPeriodo, movimientos: movimientos, resumen: resumen, credito: credito, debito: debito };
}
function fase3ProcesarCierreIVA(validacion) {
    const partida = [];
    const periodo = validacion.entrada.periodo;
    const credito = validacion.credito;
    const debito = validacion.debito;
    if (debito > 0) partida.push({ codigo: CUENTA_IVA_DEBITO, cuenta: "IVA Débito Fiscal", descripcion: "Liquidación IVA " + periodo, debe: comercialADolares(debito), haber: 0 });
    if (credito > debito) partida.push({ codigo: CUENTA_REMANENTE_IVA, cuenta: "Remanente de crédito fiscal", descripcion: "Remanente IVA " + periodo, debe: comercialADolares(credito - debito), haber: 0 });
    if (credito > 0) partida.push({ codigo: CUENTA_IVA_CREDITO, cuenta: "IVA Crédito Fiscal", descripcion: "Liquidación IVA " + periodo, debe: 0, haber: comercialADolares(credito) });
    if (debito > credito) partida.push({ codigo: CUENTA_IVA_POR_PAGAR, cuenta: "IVA por pagar", descripcion: "IVA por pagar " + periodo, debe: 0, haber: comercialADolares(debito - credito) });
    const movimiento = {
        id: siguienteIdMovimientoComercial(validacion.movimientos),
        numero: "IVA-" + periodo.replace("-", ""),
        fecha: periodo + "-01",
        referencia: validacion.entrada.referencia,
        concepto: "Liquidación mensual de IVA " + periodo,
        origen: "Cierre IVA",
        creadoEn: new Date().toISOString(),
        partida: partida
    };
    validarPartidaComercial(movimiento);
    return { ...validacion, movimiento: movimiento };
}
async function fase4PersistirCierreIVA(proceso) {
    await aplicarCambioContableBD([{ almacen: ALMACEN_MOVIMIENTOS, accion: "agregar", valor: proceso.movimiento }], proceso.movimientos);
    return proceso;
}
async function fase5VerificarCierreIVA(proceso) {
    let guardado;
// Inicio fase 5 — Verificar contenido completo, no solo existencia/referencia.
try {
const movimientos = await obtenerMovimientosBD();
guardado = movimientos.find(function(m) { return Number(m.id) === Number(proceso.movimiento.id); });
if (!estadoPersistidoCoincide(proceso.movimiento, guardado)) throw new Error("La fase 5 no pudo verificar la persistencia del cierre de IVA.");
validarPartidaComercial(guardado);
} catch (error) {
await eliminarMovimientoBD(proceso.movimiento.id);
throw error;
}
// Fin fase 5
    if (typeof publicarEventoContable === "function" && typeof TIPOS_EVENTOS !== "undefined" && TIPOS_EVENTOS.IVA_CERRADO) {
        await publicarEventoContable(TIPOS_EVENTOS.IVA_CERRADO, "iva", proceso.entrada.periodo, {
            periodo: proceso.entrada.periodo,
            movimientoId: guardado.id,
            creditoFiscal: proceso.resumen.creditoFiscal,
            debitoFiscal: proceso.resumen.debitoFiscal,
            ivaPorPagar: proceso.resumen.ivaPorPagar,
            remanenteCreditoFiscal: proceso.resumen.remanenteCreditoFiscal
        });
    }
    return { movimiento: guardado, resumen: proceso.resumen };
}
async function contabilizarCierreIVA(periodo) {
return ejecutarConBloqueoContable(async function() {
    // FASE 1 — Entrada normalizada.
    const entrada = fase1EntradaCierreIVA(periodo);
    // FASE 2 — Validación de período, idempotencia e IVA.
    const validacion = await fase2ValidarCierreIVA(entrada);
    // FASE 3 — Construcción determinista de la partida.
    const proceso = fase3ProcesarCierreIVA(validacion);
    // FASE 4 — Persistencia.
    await fase4PersistirCierreIVA(proceso);
    // FASE 5 — Relectura, verificación y evento EDA.
    return fase5VerificarCierreIVA(proceso);
});
}
