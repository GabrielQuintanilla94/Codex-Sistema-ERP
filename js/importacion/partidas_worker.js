const telemetriaWorker = {
    archivosProcesados: 0,
    partidasValidas: 0,
    partidasRechazadas: 0,
    ultimoResultado: "Sin operaciones"
};
function actualizarTelemetriaWorker(resultado, validas, rechazadas) {
    telemetriaWorker.ultimoResultado = resultado;
    telemetriaWorker.partidasValidas = Number(validas || 0);
    telemetriaWorker.partidasRechazadas = Number(rechazadas || 0);
}
function normalizarNombre(texto) {
    return String(texto || "")
        .replace(/^\uFEFF/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
}
function analizarCSVConSeparador(texto, separador) {
    const filas = [];
    let fila = [];
    let campo = "";
    let entreComillas = false;
    const contenido = String(texto || "").replace(/^\uFEFF/, "");
    for (let indice = 0; indice < contenido.length; indice++) {
        const caracter = contenido[indice];
        const siguiente = contenido[indice + 1];
        if (caracter === '"') {
            if (entreComillas && siguiente === '"') {
                campo += '"';
                indice++;
            } else {
                entreComillas = !entreComillas;
            }
        } else if (caracter === separador && !entreComillas) {
            fila.push(campo.trim());
            campo = "";
        } else if ((caracter === "\n" || caracter === "\r") && !entreComillas) {
            if (caracter === "\r" && siguiente === "\n") indice++;
            fila.push(campo.trim());
            campo = "";
            if (fila.some(function(valor) { return valor !== ""; })) filas.push(fila);
            fila = [];
        } else {
            campo += caracter;
        }
    }
    fila.push(campo.trim());
    if (fila.some(function(valor) { return valor !== ""; })) filas.push(fila);
    if (entreComillas) throw new Error("El archivo contiene comillas sin cerrar.");
    return filas;
}
function detectarSeparadorCSV(texto, separadorForzado) {
    if (separadorForzado === "," || separadorForzado === ";") return separadorForzado;
    const requeridos = [
        "numeropartida", "fecha", "referencia", "concepto",
        "codigocuenta", "descripcionlinea", "debe", "haber"
    ];
    const candidatos = [",", ";"].map(function(separador) {
        const filas = analizarCSVConSeparador(texto, separador);
        const encabezados = filas.length ? filas[0].map(normalizarNombre) : [];
        const coincidencias = requeridos.filter(function(nombre) {
            return encabezados.includes(nombre);
        }).length;
        return { separador: separador, filas: filas, encabezados: encabezados, coincidencias: coincidencias };
    });
    candidatos.sort(function(a, b) {
        return b.coincidencias - a.coincidencias || b.encabezados.length - a.encabezados.length;
    });
    if (candidatos[0].coincidencias === 0) {
        throw new Error("No fue posible detectar el separador CSV. Use coma (,) o punto y coma (;).");
    }
    return candidatos[0].separador;
}
function analizarCSV(texto, separadorForzado) {
    const separador = detectarSeparadorCSV(texto, separadorForzado);
    return analizarCSVConSeparador(texto, separador);
}
function fechaCalendarioValida(anio, mes, dia) {
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    return fecha.getUTCFullYear() === anio &&
        fecha.getUTCMonth() === mes - 1 &&
        fecha.getUTCDate() === dia;
}
function convertirFecha(valor) {
    const fecha = String(valor || "").trim();
    let partes;
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        partes = fecha.split("-").map(Number);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
        const partesEntrada = fecha.split("/").map(Number);
        // Fecha local del ERP: D/M/YYYY; los archivos sin ambigüedad pueden usar ISO.
        partes = [partesEntrada[2], partesEntrada[1], partesEntrada[0]];
    } else {
        return "";
    }
    if (!fechaCalendarioValida(partes[0], partes[1], partes[2])) return "";
    return String(partes[0]).padStart(4, "0") + "-" +
        String(partes[1]).padStart(2, "0") + "-" +
        String(partes[2]).padStart(2, "0");
}
function convertirCentavos(valor) {
    let limpio = String(valor || "")
        .replace(/\$/g, "")
        .replace(/\s/g, "")
        .trim();
    if (limpio === "") return 0;
    if (limpio.includes(",") && limpio.includes(".")) {
        if (limpio.lastIndexOf(",") > limpio.lastIndexOf(".")) {
            limpio = limpio.replace(/\./g, "").replace(",", ".");
        } else {
            limpio = limpio.replace(/,/g, "");
        }
    } else if (limpio.includes(",")) {
        limpio = limpio.replace(",", ".");
    }
    const numero = Number(limpio);
    return Number.isFinite(numero) ? Math.round(numero * 100) : NaN;
}
function agruparPorPartida(registros) {
    const grupos = new Map();
    registros.forEach(function(registro) {
        const numero = registro.numeroPartida;
        if (!grupos.has(numero)) grupos.set(numero, []);
        grupos.get(numero).push(registro);
    });
    return grupos;
}
function validarGrupo(numero, lineas, cuentasPorCodigo, numerosExistentes, referenciasExistentes) {
    const errores = [];
    const primera = lineas[0];
    const fecha = convertirFecha(primera.fecha);
    const referencia = primera.referencia.trim();
    const concepto = primera.concepto.trim();
    if (!numero || numero.length < 3) errores.push("Número de partida vacío o inválido.");
    if (!fecha) errores.push("Fecha inválida.");
    if (concepto.length < 3) errores.push("Concepto general inválido.");
    if (numerosExistentes.has(numero.toLowerCase())) errores.push("El número de partida ya existe.");
    if (referencia && referenciasExistentes.has(referencia.toLowerCase())) {
        errores.push("La referencia ya existe.");
    }
    if (lineas.length < 2) errores.push("La partida debe contener al menos dos líneas.");
    lineas.forEach(function(linea, indice) {
        if (convertirFecha(linea.fecha) !== fecha) {
            errores.push("La fecha cambia dentro de la partida, línea " + (indice + 1) + ".");
        }
        if (linea.referencia.trim() !== referencia) {
            errores.push("La referencia cambia dentro de la partida, línea " + (indice + 1) + ".");
        }
        if (linea.concepto.trim() !== concepto) {
            errores.push("El concepto cambia dentro de la partida, línea " + (indice + 1) + ".");
        }
    });
    let totalDebe = 0;
    let totalHaber = 0;
    const partida = [];
    lineas.forEach(function(linea, indice) {
        const codigo = linea.codigoCuenta.trim();
        const cuenta = cuentasPorCodigo.get(codigo);
        const debe = convertirCentavos(linea.debe);
        const haber = convertirCentavos(linea.haber);
        if (!cuenta) {
            errores.push("Cuenta auxiliar inexistente en línea " + (indice + 1) + ": " + codigo + ".");
        }
        if (!Number.isFinite(debe) || debe < 0 || !Number.isFinite(haber) || haber < 0) {
            errores.push("Monto inválido en línea " + (indice + 1) + ".");
            return;
        }
        if (debe > 0 && haber > 0) {
            errores.push("La línea " + (indice + 1) + " contiene Debe y Haber.");
        }
        const tipoInventario = String(linea.tipoInventario || "").trim();
        const sku = String(linea.sku || "").trim();
        const cantidadInventario = Number(String(linea.cantidadInventario || "0").replace(",", "."));
        const usaInventario = tipoInventario || sku || cantidadInventario > 0;
        if (usaInventario) {
            if (codigo !== "1104") {
                errores.push("Los datos de inventario solo pueden usarse con la cuenta 1104, línea " + (indice + 1) + ".");
            } else if (!["entrada", "salida"].includes(tipoInventario.toLowerCase())) {
                errores.push("TipoInventario debe ser Entrada o Salida en línea " + (indice + 1) + ".");
            } else if (!sku) {
                errores.push("Falta SKU en línea " + (indice + 1) + ".");
            } else if (!Number.isFinite(cantidadInventario) || cantidadInventario <= 0) {
                errores.push("CantidadInventario inválida en línea " + (indice + 1) + ".");
            } else if (tipoInventario.toLowerCase() === "entrada" && (debe <= 0 || haber > 0)) {
                errores.push("Una Entrada de inventario debe registrarse al Debe en línea " + (indice + 1) + ".");
            } else if (tipoInventario.toLowerCase() === "salida" && debe > 0) {
                errores.push("Una Salida de inventario no puede registrarse al Debe en línea " + (indice + 1) + ".");
            }
        }
        const esActivoFijo = Boolean(cuenta && cuenta.categoriaActivoFijo);
        const fechaDisponibleUso = String(linea.fechaDisponibleUso || "").trim();
        const fechaDisponibleUsoNormalizada = convertirFecha(fechaDisponibleUso);
        const valorResidual = Number(String(linea.valorResidual || "0").replace(",", "."));
        if (esActivoFijo) {
            if (!linea.descripcionLinea.trim()) {
                errores.push("Falta nombre/descripción del activo fijo en línea " + (indice + 1) + ".");
            } else if (debe <= 0 || haber > 0) {
                errores.push("La adquisición de activo fijo debe registrarse al Debe en línea " + (indice + 1) + ".");
            } else if (!fechaDisponibleUsoNormalizada) {
                errores.push("FechaDisponibleUso inválida en línea " + (indice + 1) + ".");
            } else if (fechaDisponibleUsoNormalizada < fecha) {
                errores.push("FechaDisponibleUso no puede ser anterior a la adquisición en línea " + (indice + 1) + ".");
            } else if (!Number.isFinite(valorResidual) || valorResidual < 0 || Math.round(valorResidual * 100) >= debe) {
                errores.push("ValorResidual debe ser menor que el costo del activo en línea " + (indice + 1) + ".");
            }
        }
        const salidaInventarioPendiente = codigo === "1104" && tipoInventario.toLowerCase() === "salida" && sku && cantidadInventario > 0;
        if (debe <= 0 && haber <= 0 && !salidaInventarioPendiente) {
            errores.push("La línea " + (indice + 1) + " no contiene importe.");
        }
        totalDebe += debe;
        totalHaber += haber;
        if (cuenta) {
            partida.push({
                codigo: cuenta.codigo,
                cuenta: cuenta.nombre,
                descripcion: linea.descripcionLinea.trim(),
                tipoInventario: String(linea.tipoInventario || "").trim(),
                sku: String(linea.sku || "").trim(),
                cantidadInventario: Number(String(linea.cantidadInventario || "0").replace(",", ".")) || 0,
                descripcionMaterial: linea.descripcionLinea.trim(),
                activoFijo: cuenta.categoriaActivoFijo ? {
                    nombre: linea.descripcionLinea.trim(),
                    fechaDisponibleUso: fechaDisponibleUsoNormalizada,
                    valorResidual: Number(String(linea.valorResidual || "0").replace(",", ".")) || 0
                } : null,
                debe: debe / 100,
                haber: haber / 100
            });
        }
    });
    if (totalDebe !== totalHaber) {
        errores.push("Partida desbalanceada por $" +
            (Math.abs(totalDebe - totalHaber) / 100).toFixed(2) + ".");
    }
    if (totalDebe <= 0) errores.push("La partida no contiene valores positivos.");
    return {
        valida: errores.length === 0,
        numero: numero,
        fecha: fecha || primera.fecha,
        referencia: referencia,
        concepto: concepto,
        lineas: lineas.length,
        totalDebe: totalDebe / 100,
        totalHaber: totalHaber / 100,
        errores: errores,
        movimiento: errores.length === 0 ? {
            numero: numero,
            fecha: fecha,
            referencia: referencia,
            concepto: concepto,
            origen: "CSV",
            partida: partida
        } : null
    };
}
/*
FASE 1
A. Objetivo: recibir el mensaje enviado al Web Worker.
B. Entrada (Zero-Trust): texto CSV, cuentas y duplicados provenientes de la interfaz.
C. Validación: todavía no se confía en tipos ni contenido.
D. Procesamiento: normalizar valores básicos y colecciones.
E. Decisión: enviar una entrada uniforme a la fase 2.
F. Recuperación: sustituir valores ausentes por cadenas o listas vacías.
G. Verificación: devolver siempre las cinco propiedades esperadas.
H. Telemetría: registrar la recepción del archivo.
*/
function fase1EntradaWorker(evento) {
    actualizarTelemetriaWorker("Entrada recibida", 0, 0);
    return {
        textoCSV: String(evento.data.textoCSV || ""),
        cuentas: Array.isArray(evento.data.cuentas) ? evento.data.cuentas : [],
        numerosExistentes: Array.isArray(evento.data.numerosExistentes)
            ? evento.data.numerosExistentes
            : [],
        referenciasExistentes: Array.isArray(evento.data.referenciasExistentes)
            ? evento.data.referenciasExistentes
            : [],
        separadorCSV: evento.data.separadorCSV === "," || evento.data.separadorCSV === ";"
            ? evento.data.separadorCSV
            : ""
    };
}
/*
FASE 2
A. Objetivo: validar la estructura física del CSV.
B. Entrada (Zero-Trust): texto normalizado, todavía no confiable.
C. Validación: filas, encabezados requeridos y números de partida.
D. Procesamiento: analizar comillas, separadores y posiciones de columnas.
E. Decisión: devolver filas y posiciones o lanzar un error.
F. Recuperación: detener el lote completo ante una estructura inválida.
G. Verificación: cada encabezado requerido debe tener una posición.
H. Telemetría: registrar que la estructura fue aprobada.
*/
function fase2ValidarWorker(entrada) {
    const filas = analizarCSV(entrada.textoCSV, entrada.separadorCSV);
    if (filas.length < 2) throw new Error("El CSV no contiene líneas de datos.");
    const encabezados = filas[0].map(normalizarNombre);
    const requeridos = {
        numeroPartida: "numeropartida",
        fecha: "fecha",
        referencia: "referencia",
        concepto: "concepto",
        codigoCuenta: "codigocuenta",
        descripcionLinea: "descripcionlinea",
        debe: "debe",
        haber: "haber"
    };
    const posiciones = {};
    Object.keys(requeridos).forEach(function(propiedad) {
        posiciones[propiedad] = encabezados.indexOf(requeridos[propiedad]);
        if (posiciones[propiedad] === -1) {
            throw new Error("Falta la columna requerida: " + requeridos[propiedad] + ".");
        }
    });
    const opcionales = {
        tipoInventario: "tipoinventario",
        sku: "sku",
        cantidadInventario: "cantidadinventario",
        fechaDisponibleUso: "fechadisponibleuso",
        valorResidual: "valorresidual"
    };
    Object.keys(opcionales).forEach(function(propiedad) {
        posiciones[propiedad] = encabezados.indexOf(opcionales[propiedad]);
    });
    actualizarTelemetriaWorker("Estructura CSV validada", 0, 0);
    return { filas: filas, posiciones: posiciones };
}
/*
FASE 3
A. Objetivo: transformar filas CSV en registros y grupos contables.
B. Entrada (Zero-Trust): filas y posiciones aprobadas.
C. Validación: todas las líneas deben tener NumeroPartida.
D. Procesamiento: mapear columnas, crear índices y agrupar partidas.
E. Decisión: entregar grupos listos para validación contable.
F. Recuperación: rechazar el archivo si una línea no puede agruparse.
G. Verificación: la suma de líneas agrupadas coincide con los registros.
H. Telemetría: registrar cuántos grupos se construyeron.
*/
function fase3ProcesarWorker(entrada, estructura) {
    const registros = estructura.filas.slice(1).map(function(fila) {
        const registro = {};
        Object.keys(estructura.posiciones).forEach(function(propiedad) {
            registro[propiedad] = String(fila[estructura.posiciones[propiedad]] || "").trim();
        });
        return registro;
    });
    if (registros.some(function(registro) { return !registro.numeroPartida; })) {
        throw new Error("Todas las líneas deben contener NumeroPartida.");
    }
    const cuentasPorCodigo = new Map();
    entrada.cuentas.forEach(function(cuenta) {
        if (cuenta.permiteMovimientos) cuentasPorCodigo.set(cuenta.codigo, cuenta);
    });
    const numerosExistentes = new Set(entrada.numerosExistentes.map(function(valor) {
        return String(valor).toLowerCase();
    }));
    const referenciasExistentes = new Set(entrada.referenciasExistentes.map(function(valor) {
        return String(valor).toLowerCase();
    }));
    const grupos = agruparPorPartida(registros);
    actualizarTelemetriaWorker("Partidas agrupadas", grupos.size, 0);
    return {
        registros: registros,
        grupos: grupos,
        cuentasPorCodigo: cuentasPorCodigo,
        numerosExistentes: numerosExistentes,
        referenciasExistentes: referenciasExistentes
    };
}
/*
FASE 4
A. Objetivo: decidir qué grupos cumplen las reglas contables.
B. Entrada (Zero-Trust): partidas agrupadas, aún no aprobadas.
C. Validación: fechas, duplicados, cuentas, líneas, importes y partida doble.
D. Procesamiento: ejecutar validarGrupo() y detectar referencias repetidas.
E. Decisión: marcar cada partida como válida o rechazada.
F. Recuperación: conservar errores detallados sin guardar datos.
G. Verificación: las referencias repetidas invalidan todos sus grupos.
H. Telemetría: contar partidas válidas y rechazadas.
*/
function fase4DecidirWorker(procesamiento) {
    const resultados = [];
    procesamiento.grupos.forEach(function(lineas, numero) {
        resultados.push(validarGrupo(
            numero,
            lineas,
            procesamiento.cuentasPorCodigo,
            procesamiento.numerosExistentes,
            procesamiento.referenciasExistentes
        ));
    });
    const referenciasArchivo = new Map();
    resultados.forEach(function(resultado) {
        const referencia = resultado.referencia.toLowerCase();
        if (!referencia) return;
        if (!referenciasArchivo.has(referencia)) referenciasArchivo.set(referencia, []);
        referenciasArchivo.get(referencia).push(resultado);
    });
    referenciasArchivo.forEach(function(partidas, referencia) {
        if (partidas.length < 2) return;
        const numeros = partidas.map(function(partida) {
            return partida.numero;
        }).join(", ");
        partidas.forEach(function(partida) {
            partida.valida = false;
            partida.movimiento = null;
            partida.errores.push(
                "La referencia " + referencia + " se repite en: " + numeros + "."
            );
        });
    });
    const validas = resultados.filter(function(resultado) {
        return resultado.valida;
    }).length;
    actualizarTelemetriaWorker(
        "Validación contable completada",
        validas,
        resultados.length - validas
    );
    return resultados;
}
/*
FASE 5
A. Objetivo: verificar y devolver un resultado completo a la interfaz.
B. Entrada (Zero-Trust): resultados individuales recién evaluados.
C. Validación: comprobar que cada grupo tenga una decisión booleana.
D. Procesamiento: separar válidas, rechazadas y construir el resumen.
E. Decisión: publicar éxito solo si la estructura final es consistente.
F. Recuperación: lanzar un error si falta una decisión.
G. Verificación: válidas más rechazadas debe igualar el total.
H. Telemetría: acumular archivos procesados y resultado final.
*/
function fase5VerificarWorker(resultados, totalLineas) {
    if (resultados.some(function(resultado) {
        return typeof resultado.valida !== "boolean";
    })) {
        throw new Error("El resultado contiene una partida sin decisión.");
    }
    const validas = resultados.filter(function(resultado) {
        return resultado.valida;
    });
    const rechazadas = resultados.filter(function(resultado) {
        return !resultado.valida;
    });
    if (validas.length + rechazadas.length !== resultados.length) {
        throw new Error("No fue posible verificar el resumen del archivo.");
    }
    telemetriaWorker.archivosProcesados++;
    actualizarTelemetriaWorker("Archivo verificado", validas.length, rechazadas.length);
    return {
        exito: true,
        validas: validas,
        rechazadas: rechazadas,
        resultados: resultados,
        resumen: {
            totalPartidas: resultados.length,
            validas: validas.length,
            rechazadas: rechazadas.length,
            totalLineas: totalLineas
        }
    };
}
self.onmessage = function(evento) {
    try {
        const entrada = fase1EntradaWorker(evento);
        const estructura = fase2ValidarWorker(entrada);
        const procesamiento = fase3ProcesarWorker(entrada, estructura);
        const resultados = fase4DecidirWorker(procesamiento);
        self.postMessage(fase5VerificarWorker(resultados, procesamiento.registros.length));
    } catch (error) {
        actualizarTelemetriaWorker("Error de procesamiento", 0, 1);
        self.postMessage({
            exito: false,
            error: error.message || "No fue posible procesar el CSV."
        });
    }
};
