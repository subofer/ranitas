PROMPT IDEAL PARA CONSULTAS DE PRESENTACIONES (presentaciones.js)

## PROPÓSITO GENERAL
Funciones server-side para gestionar presentaciones y agrupaciones de productos.

## FUNCIONES PRINCIPALES

### getPresentaciones()
- Obtiene todas las presentaciones
- Include: producto, tipoPresentacion, agrupaciones (contenidas y contenedoras)
- OrderBy: createdAt DESC

### getPresentacionesByProducto(idProducto)
- Obtiene presentaciones de producto específico
- Include: tipoPresentacion, agrupaciones
- Retorna: array de presentaciones

### getPresentacionById(id)
- Obtiene presentación específica
- Include: producto, tipoPresentacion, todas las agrupaciones

### crearPresentacion(datos)
- Crea nueva presentación
- Parámetros:
  - nombre: String
  - productoId: String
  - tipoPresentacionId: String
  - cantidad: Float
  - unidadMedida: String (kg, L, m, etc)
  - contenidoPorUnidad: Float (opcional)
  - unidadContenido: String (opcional)
- Retorna: presentación creada

### actualizarPresentacion(id, datos)
- Actualiza presentación
- Campos: nombre, cantidad, unidades, contenido

### borrarPresentacion(id)
- Elimina presentación
- Cascade deletes agrupaciones

## AGRUPACIONES (Presentaciones compuestas)

### crearAgrupacion(idPresentacionContenida, idPresentacionContenedora, cantidad)
- Define que X presentaciones componen 1 presentación mayor
- Ejemplo: 6 botellas (0.5L cada) = 1 caja (3L)
- Parámetros:
  - idPresentacionContenida: String (la pequeña)
  - idPresentacionContenedora: String (la grande)
  - cantidad: Float (cuántas pequeñas)
- Unique: [idPresentacionContenida, idPresentacionContenedora]

### actualizarAgrupacion(id, cantidad)
- Actualiza cantidad de relación

### borrarAgrupacion(id)
- Elimina agrupación

### convertirUnidades(idPresentacionOrigen, idPresentacionDestino, cantidad)
- Convierte cantidad entre presentaciones
- Calcula: cantidad * factor de conversión
- Useful para: stock en diferentes unidades

## VALIDACIONES

- Producto existe
- TipoPresentacion existe
- Cantidad > 0
- Agrupación sin ciclos (A→B→C pero no C→A)

---

## NUEVAS CARACTERÍSTICAS

- [ ] Conversión automática de stock
- [ ] Historial de conversiones
- [ ] Validación de ciclos automática
- [ ] Bulk operations
