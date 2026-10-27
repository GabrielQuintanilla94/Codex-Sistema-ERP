# Proceso: grafo de cuentas

**Código:** `js/catalogo/grafo_cuentas.js`

**Invariante:** cada código es único, cada padre existe y el grafo no contiene ciclos.

## Fase 1: recibir catálogo

- **A. Objetivo:** recibir una colección de cuentas.
- **B. Entrada (Zero-Trust):** cualquier valor entregado como catálogo.
- **C. Validación:** todavía no se confía en sus elementos.
- **D. Procesamiento:** usar una lista o una lista vacía.
- **E. Decisión:** continuar con una colección iterable.
- **F. Recuperación:** evitar fallos por valores nulos.
- **G. Verificación:** devolver siempre un arreglo.
- **H. Telemetría:** contar nodos recibidos.

## Fase 2: validar relaciones

- **A. Objetivo:** validar códigos y padres.
- **B. Entrada (Zero-Trust):** colección normalizada.
- **C. Validación:** códigos obligatorios, únicos y padres existentes.
- **D. Procesamiento:** construir un conjunto de códigos.
- **E. Decisión:** aprobar o devolver el primer error.
- **F. Recuperación:** conservar el grafo anterior.
- **G. Verificación:** revisar cada cuenta y relación.
- **H. Telemetría:** registrar aprobación o rechazo.

## Fase 3: construir DAG

- **A. Objetivo:** construir la lista de adyacencia.
- **B. Entrada (Zero-Trust):** cuentas aprobadas.
- **C. Validación:** conectar solamente padres registrados.
- **D. Procesamiento:** crear un nodo por código y agregar hijos.
- **E. Decisión:** representar nodos sin hijos con una lista vacía.
- **F. Recuperación:** devolver una estructura nueva sin alterar la anterior.
- **G. Verificación:** cada cuenta debe aparecer como clave.
- **H. Telemetría:** contar nodos construidos.

## Fase 4: decidir si es acíclico

- **A. Objetivo:** detectar ciclos.
- **B. Entrada (Zero-Trust):** grafo recién construido.
- **C. Validación:** recorrido en profundidad con nodos activos.
- **D. Procesamiento:** visitar cada componente.
- **E. Decisión:** rechazar cuando un nodo activo reaparece.
- **F. Recuperación:** restaurar el grafo anterior al agregar una cuenta.
- **G. Verificación:** cubrir todos los nodos.
- **H. Telemetría:** contar ciclos detectados.

## Fase 5: verificar

- **A. Objetivo:** confirmar que catálogo y grafo coinciden.
- **B. Entrada (Zero-Trust):** cuentas y DAG propuesto.
- **C. Validación:** misma cantidad de nodos y ausencia de ciclos.
- **D. Procesamiento:** comparar las estructuras.
- **E. Decisión:** aceptar solamente un DAG completo.
- **F. Recuperación:** no publicar una estructura inválida.
- **G. Verificación:** ejecutar la comprobación final.
- **H. Telemetría:** guardar el último resultado.

## Comunicación

Expone búsquedas, BFS, validación y alta en memoria. `algoritmia_cuentas.js` controla la persistencia y `catalogo_ui.js` publica el evento después de verificarla.
