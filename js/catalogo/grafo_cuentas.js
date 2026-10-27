const catalogoCuentas = [];
let grafoCuentas = {};
const telemetriaGrafo = {
    nodosProcesados: 0,
    recorridos: 0,
    ciclosDetectados: 0,
    ultimoResultado: "Sin operaciones"
};
function actualizarTelemetriaGrafo(resultado, nodosProcesados) {
    telemetriaGrafo.ultimoResultado = resultado;
    telemetriaGrafo.nodosProcesados = Number(nodosProcesados || 0);
}
/*
FASE 1
A. Objetivo: recibir una colección de cuentas para construir el DAG.
B. Entrada (Zero-Trust): cualquier valor recibido como catálogo.
C. Validación: todavía no se acepta su estructura interna.
D. Procesamiento: asegurar una colección iterable.
E. Decisión: continuar con un arreglo o usar uno vacío.
F. Recuperación: evitar fallos cuando el catálogo no sea un arreglo.
G. Verificación: devolver siempre una colección.
H. Telemetría: registrar cuántos nodos se recibieron.
*/
function fase1EntradaGrafo(cuentas) {
    const entrada = Array.isArray(cuentas) ? cuentas : [];
    actualizarTelemetriaGrafo("Entrada recibida", entrada.length);
    return entrada;
}
/*
FASE 2
A. Objetivo: validar códigos y relaciones padre-hijo.
B. Entrada (Zero-Trust): catálogo normalizado, todavía no confiable.
C. Validación: códigos únicos y padres existentes.
D. Procesamiento: construir un índice de códigos.
E. Decisión: devolver una causa de rechazo o una cadena vacía.
F. Recuperación: no modificar el grafo si existe un error.
G. Verificación: revisar cada cuenta una sola vez.
H. Telemetría: registrar el resultado de la validación.
*/
function fase2ValidarGrafo(cuentas) {
    const codigos = new Set();
    for (const cuenta of cuentas) {
        if (!cuenta || !cuenta.codigo) return "Existe una cuenta sin código.";
        if (codigos.has(cuenta.codigo)) return "El código " + cuenta.codigo + " está duplicado.";
        codigos.add(cuenta.codigo);
    }
    for (const cuenta of cuentas) {
        if (cuenta.padre && !codigos.has(cuenta.padre)) {
            return "La cuenta padre " + cuenta.padre + " no existe.";
        }
    }
    actualizarTelemetriaGrafo("Catálogo validado", cuentas.length);
    return "";
}
/*
FASE 3
A. Objetivo: transformar las cuentas en una lista de adyacencia.
B. Entrada (Zero-Trust): catálogo aprobado por la fase 2.
C. Validación: aceptar únicamente relaciones con padre registrado.
D. Procesamiento: crear nodos y conectar sus hijos.
E. Decisión: conservar solo relaciones válidas.
F. Recuperación: representar nodos sin hijos con una lista vacía.
G. Verificación: cada código debe existir como clave del grafo.
H. Telemetría: registrar la cantidad de nodos construidos.
*/
function fase3ProcesarGrafo(cuentas) {
    const grafo = {};
    cuentas.forEach(function(cuenta) {
        grafo[cuenta.codigo] = [];
    });
    cuentas.forEach(function(cuenta) {
        if (cuenta.padre && grafo[cuenta.padre]) {
            grafo[cuenta.padre].push(cuenta.codigo);
        }
    });
    actualizarTelemetriaGrafo("Grafo construido", Object.keys(grafo).length);
    return grafo;
}
/*
FASE 4
A. Objetivo: decidir si la estructura puede aceptarse como DAG.
B. Entrada (Zero-Trust): lista de adyacencia recién construida.
C. Validación: búsqueda en profundidad con conjunto de recorrido.
D. Procesamiento: visitar cada nodo y sus descendientes.
E. Decisión: rechazar al encontrar un nodo activo repetido.
F. Recuperación: permitir que el llamador restaure el grafo anterior.
G. Verificación: revisar todos los componentes del grafo.
H. Telemetría: contar los ciclos detectados.
*/
function detectarCiclo(grafo) {
    const visitados = new Set();
    const enRecorrido = new Set();
    function visitar(nodo) {
        if (enRecorrido.has(nodo)) return true;
        if (visitados.has(nodo)) return false;
        visitados.add(nodo);
        enRecorrido.add(nodo);
        const hijos = grafo[nodo] || [];
        for (const hijo of hijos) {
            if (visitar(hijo)) return true;
        }
        enRecorrido.delete(nodo);
        return false;
    }
    const tieneCiclo = Object.keys(grafo).some(visitar);
    if (tieneCiclo) telemetriaGrafo.ciclosDetectados++;
    actualizarTelemetriaGrafo(
        tieneCiclo ? "Ciclo detectado" : "DAG válido",
        Object.keys(grafo).length
    );
    return tieneCiclo;
}
/*
FASE 5
A. Objetivo: verificar y exponer un DAG utilizable.
B. Entrada (Zero-Trust): catálogo y grafo procesados.
C. Validación: confirmar cantidad de nodos y ausencia de ciclos.
D. Procesamiento: comparar claves del grafo con cuentas del catálogo.
E. Decisión: devolver verdadero solo si ambas estructuras coinciden.
F. Recuperación: conservar el grafo previo cuando falle la verificación.
G. Verificación: igualdad de tamaños y prueba final de ciclos.
H. Telemetría: registrar el resultado final.
*/
function fase5VerificarGrafo(cuentas, grafo) {
    const verificado = Object.keys(grafo).length === cuentas.length && !detectarCiclo(grafo);
    actualizarTelemetriaGrafo(
        verificado ? "Grafo verificado" : "Grafo no verificado",
        cuentas.length
    );
    return verificado;
}
function construirGrafo(cuentas) {
    const entrada = fase1EntradaGrafo(cuentas);
    const error = fase2ValidarGrafo(entrada);
    if (error) {
        actualizarTelemetriaGrafo(error, entrada.length);
        return {};
    }
    return fase3ProcesarGrafo(entrada);
}
grafoCuentas = construirGrafo(catalogoCuentas);
function buscarCuenta(codigo) {
    return catalogoCuentas.find(function(cuenta) {
        return cuenta.codigo === codigo;
    });
}
function recorrerBFS(codigoInicial) {
    if (!grafoCuentas[codigoInicial]) return [];
    const cola = [codigoInicial];
    const visitados = new Set();
    const resultado = [];
    let posicion = 0;
    while (posicion < cola.length) {
        const codigo = cola[posicion++];
        if (visitados.has(codigo)) continue;
        visitados.add(codigo);
        const cuenta = buscarCuenta(codigo);
        if (cuenta) resultado.push(cuenta);
        cola.push(...(grafoCuentas[codigo] || []));
    }
    telemetriaGrafo.recorridos++;
    actualizarTelemetriaGrafo("Recorrido BFS completado", resultado.length);
    return resultado;
}
function validarCuentaNueva(cuenta) {
    if (buscarCuenta(cuenta.codigo)) return "El código ya existe.";
    if (cuenta.padre && !buscarCuenta(cuenta.padre)) return "La cuenta padre no existe.";
    if (cuenta.padre === cuenta.codigo) return "Una cuenta no puede ser su propio padre.";
    const padre = cuenta.padre ? buscarCuenta(cuenta.padre) : null;
    if (padre && padre.permiteMovimientos) {
        return "Una cuenta auxiliar no puede recibir cuentas hijas.";
    }
    return "";
}
function agregarCuenta(cuenta) {
    const error = validarCuentaNueva(cuenta);
    if (error) return error;
    const grafoAnterior = grafoCuentas;
    catalogoCuentas.push(cuenta);
    const grafoPropuesto = construirGrafo(catalogoCuentas);
    if (!fase5VerificarGrafo(catalogoCuentas, grafoPropuesto)) {
        catalogoCuentas.pop();
        grafoCuentas = grafoAnterior;
        return "La relación produciría un grafo inválido.";
    }
    grafoCuentas = grafoPropuesto;
    return "";
}
function obtenerCuentasAuxiliares() {
    return catalogoCuentas.filter(function(cuenta) {
        return cuenta.permiteMovimientos;
    });
}
