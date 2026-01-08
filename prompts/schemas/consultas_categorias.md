PROMPT IDEAL PARA CONSULTAS DE CATEGORÍAS (categorias.js)

## PROPÓSITO GENERAL
Funciones server-side para gestionar categorías de productos.

## FUNCIONES PRINCIPALES

### getCategorias()
- Obtiene todas las categorías
- Include: relaciones de productos (opcional)
- OrderBy: nombre ASC
- Retorna: array de categorías

### getCategoriasConteo()
- Obtiene categorías con contador de productos
- Include: _count: { products: true }
- Útil para mostrar "Electrónica (45)"
- Retorna: array con conteos

### getCategoriaById(id)
- Obtiene categoría específica
- Include: products
- Retorna: categoría única

### crearCategoria(nombre, descripcion?)
- Crea nueva categoría
- Parámetro: nombre (requerido, >= 3 caracteres)
- Validación: nombre único
- Normalización: primeras letras mayúsculas
- Retorna: categoría creada

### actualizarCategoria(id, datos)
- Actualiza datos de categoría
- Campos actualizables: nombre, descripcion
- Validaciones: nombre único

### borrarCategoria(id)
- Elimina categoría
- Validación: no tiene productos asociados
- O: desasociar productos primero
- Retorna: confirmación

### buscarCategoria(query)
- Búsqueda por nombre (LIKE insensitive)
- Retorna: array de matches

## VALIDACIONES

- Nombre requerido
- Nombre mínimo 3 caracteres
- Nombre único (UNIQUE constraint)
- Si tiene productos: no puede borrarse sin desasociar

## RELACIONES

- Categorias → Productos (many-to-many)

---

## NUEVAS CARACTERÍSTICAS

- [ ] Jerarquía (sub-categorías)
- [ ] Colores personalizados
- [ ] Ordenamiento custom
- [ ] Merge de categorías
- [ ] Historial de cambios
