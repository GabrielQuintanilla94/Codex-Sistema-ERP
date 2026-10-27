// Fuente: manual aportado 700-DGII-MN-2021-26031, páginas impresas 5–20.
function filtrarPorPeriodo(registros, periodo) {
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(periodo || ""))) throw new Error("Seleccione un período F07 válido.");
return (registros || []).filter(function(r) { return String(r.fecha || "").slice(0, 7) === periodo; });
}
// Inicio fase 2 — Ninguna referencia interna se convierte en identidad fiscal.
function validarDatosDTEF07(registro, tipoEsperado) {
if (registro.claseDocumento !== "4") throw new Error("Identifique el documento fiscal de " + registro.documento + " antes de exportar. Este flujo exporta DTE 01/03; no convierte documentos físicos automáticamente.");
const identidad = normalizarIdentificadoresFiscales(registro, tipoEsperado);
normalizarFechaComercial(registro.fecha);
return identidad;
}
function identificadorTributarioF07(valor) {
const texto = String(valor || "").replace(/[-/]/g, "").trim();
if (!/^\d{1,14}$/.test(texto)) throw new Error("El NIT o NRC debe contener hasta 14 dígitos sin agregar ceros.");
return texto;
}
function importeF07(valor) {
if (valor === undefined || valor === null || valor === "" || !Number.isFinite(Number(valor)) || Number(valor) < 0) throw new Error("El importe F07 debe ser finito y no negativo.");
const centavos = comercialACentavos(valor);
if (!Number.isSafeInteger(centavos)) throw new Error("El importe excede la precisión monetaria admitida.");
return centavos;
}
function verificarImportesF07(registro, campoBase, campoIVA, cantidadDocumentos) {
const base = importeF07(registro[campoBase]);
const iva = importeF07(registro[campoIVA]);
const total = importeF07(registro.total);
if (base + iva !== total || Math.abs(Math.round(base * 13 / 100) - iva) > Math.max(1, Math.ceil((cantidadDocumentos || 1) / 2))) throw new Error("Base, IVA y total no coinciden en " + registro.documento + ".");
return { base: base, iva: iva, total: total };
}
function clasificacionRentaF07(registro, campo, permitidos, inicio) {
if (registro.fecha.slice(0, 7) < inicio) return "0";
const valor = String(registro[campo] ?? "");
if (!permitidos.includes(valor)) throw new Error("Revise " + campo + " para F07 en " + registro.documento + ".");
return valor;
}
// Fin fase 2
// Inicio fase 3 — Mapeo explícito de columnas del manual, sin I/O.
function filaF07Compra(compra) {
const identidad = validarDatosDTEF07(compra, "03");
verificarImportesF07(compra, "comprasGravadas", "ivaCredito");
const documento = compra.fecha < "2022-11-01" ? identidad.numeroControl : identidad.codigoGeneracion;
return [normalizarFechaF07(compra.fecha), "4", "03", documento.replaceAll("-", ""), identificadorTributarioF07(compra.nrc), compra.proveedor,
"0.00", "0.00", "0.00", numeroF07(compra.comprasGravadas), "0.00", "0.00", "0.00", numeroF07(compra.ivaCredito), numeroF07(compra.comprasGravadas), "",
clasificacionRentaF07(compra,"tipoOperacion",["1","2","3","4","8","9"],"2024-02"),clasificacionRentaF07(compra,"clasificacion",["1","2","8","9"],"2024-02"),clasificacionRentaF07(compra,"sector",["1","2","3","4","8","9"],"2024-02"),clasificacionRentaF07(compra,"tipoCostoGasto",["1","2","3","4","5","6","7","8","9"],"2024-02"),"3"];
}
function filaF07VentaContribuyente(venta) {
const identidad = validarDatosDTEF07(venta, "03");
verificarImportesF07(venta, "ventasGravadas", "ivaDebito");
if (!identidad.selloRecepcion) throw new Error("El Anexo 1 requiere el Sello de Recepción original del DTE " + venta.documento + ".");
const anterior = venta.fecha < "2022-11-01";
return [normalizarFechaF07(venta.fecha),"4","03",(anterior ? identidad.codigoGeneracion : identidad.numeroControl).replaceAll("-", ""),identidad.selloRecepcion,(anterior ? identidad.numeroControl : identidad.codigoGeneracion).replaceAll("-", ""),"",identificadorTributarioF07(venta.nrc),venta.cliente,
"0.00","0.00",numeroF07(venta.ventasGravadas),numeroF07(venta.ivaDebito),"0.00","0.00",numeroF07(venta.total),"",
clasificacionRentaF07(venta,"tipoOperacion",["1","2","3","4","12","13"],"2025-01"),clasificacionRentaF07(venta,"tipoIngreso",["1","2","3","4","5","6","7","8","9","10","12","13"],"2025-01"),"1"];
}
function filaF07VentaConsumidorFinal(venta) {
const identidad = validarDatosDTEF07(venta, "01");
verificarImportesF07(venta, "ventasGravadas", "ivaDebito", venta.cantidadDocumentos);
const ultimo = venta.ultimoCodigoGeneracion || identidad.codigoGeneracion;
return [normalizarFechaF07(venta.fecha),"4","01","N/A","N/A","N/A","N/A",identidad.codigoGeneracion,ultimo,"","0.00","0.00","0.00",numeroF07(venta.total),"0.00","0.00","0.00","0.00","0.00",numeroF07(venta.total),
clasificacionRentaF07(venta,"tipoOperacion",["1","2","3","4","12","13"],"2025-01"),clasificacionRentaF07(venta,"tipoIngreso",["1","2","3","4","5","6","7","8","9","10","12","13"],"2025-01"),"2"];
}
function agruparVentasConsumidorFinalF07(ventas) {
const grupos = new Map();
for (const venta of ventas) {
validarDatosDTEF07(venta,"01");
verificarImportesF07(venta,"ventasGravadas","ivaDebito");
const clave = [venta.fecha,venta.tipoOperacion,venta.tipoIngreso].join("|");
if (!grupos.has(clave)) grupos.set(clave,[]);
grupos.get(clave).push(venta);
}
return Array.from(grupos.values(), function(grupo) {
if (grupo.length > 1 && grupo.some(function(v) { return !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(v.horaEmision || ""); })) throw new Error("Ingrese la hora de emisión de cada DTE del " + grupo[0].fecha + " para determinar el primer y último documento del día.");
const ordenados = grupo.slice().sort(function(a,b) { return String(a.horaEmision || "").localeCompare(String(b.horaEmision || "")) || a.numeroControl.localeCompare(b.numeroControl); });
for (let i = 1; i < ordenados.length; i++) {
const previo = ordenados[i-1], actual = ordenados[i];
if (previo.horaEmision === actual.horaEmision && previo.numeroControl.slice(0,-15) !== actual.numeroControl.slice(0,-15)) throw new Error("No puede determinarse el primer/último DTE con la misma hora y series distintas. Revise el orden de emisión original.");
}
const primero = ordenados[0];
const suma = function(campo) { return comercialADolares(grupo.reduce(function(total,v) { return total + importeF07(v[campo]); },0)); };
return {...primero,cantidadDocumentos:grupo.length,ventasGravadas:suma("ventasGravadas"),ivaDebito:suma("ivaDebito"),total:suma("total"),ultimoCodigoGeneracion:ordenados[ordenados.length-1].codigoGeneracion};
}).sort(function(a,b) { return a.fecha.localeCompare(b.fecha); });
}
// Fin fase 3
// Inicio fase 5 — Comprobar estructura y duplicados antes de generar el archivo.
function verificarFilaF07(fila, columnasEsperadas, nombreAnexo) {
if (!Array.isArray(fila) || fila.length !== columnasEsperadas) throw new Error(nombreAnexo + " no cumple la cantidad esperada de columnas (" + columnasEsperadas + ").");
if (fila.some(function(valor) { return typeof valor !== "string" || /[\r\n]/.test(valor); })) throw new Error(nombreAnexo + " contiene un campo inválido o un salto de línea.");
const limites = columnasEsperadas === 21 ? [[3,100],[4,14]] : columnasEsperadas === 20 ? [[3,100],[4,100],[5,100],[6,100],[7,14]] : [[3,100],[4,100],[5,100],[6,100],[7,100],[8,100],[9,14]];
if (limites.some(function(par) { return fila[par[0]].length > par[1]; })) throw new Error(nombreAnexo + " supera la longitud de un identificador.");
return true;
}
function generarCSVF07Verificado(registros, periodo, filtro, mapper, columnas, nombreAnexo) {
const seleccionados = filtrarPorPeriodo(registros, periodo).filter(filtro || function() { return true; });
const codigos = new Set();
for (const registro of seleccionados) {
if (registro.codigoGeneracion && codigos.has(registro.codigoGeneracion)) throw new Error("Código de Generación duplicado en el anexo.");
if (registro.codigoGeneracion) codigos.add(registro.codigoGeneracion);
}
const base = columnas === 23 ? agruparVentasConsumidorFinalF07(seleccionados) : seleccionados;
const filas = base.map(mapper);
filas.forEach(function(fila) { verificarFilaF07(fila,columnas,nombreAnexo); });
return construirCSVSinEncabezados(filas);
}
function generarCSVF07Compras(compras, periodo) { return generarCSVF07Verificado(compras,periodo,null,filaF07Compra,21,"Anexo 3 Compras"); }
function generarCSVF07VentasContribuyentes(ventas, periodo) { return generarCSVF07Verificado(ventas,periodo,function(v) { return v.tipoCliente === "CONTRIBUYENTE"; },filaF07VentaContribuyente,20,"Anexo 1 Ventas a contribuyentes"); }
function generarCSVF07VentasConsumidorFinal(ventas, periodo) { return generarCSVF07Verificado(ventas,periodo,function(v) { return v.tipoCliente === "CONSUMIDOR_FINAL"; },filaF07VentaConsumidorFinal,23,"Anexo 2 Ventas a consumidor final"); }
// Fin fase 5
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
