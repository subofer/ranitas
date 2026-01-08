PROMPT IDEAL PARA CONSULTAS DE PRODUCTOS (productos.js)

## PROPÓSITO GENERAL
Funciones server-side para consultar y manipular productos en la base de datos.

## FUNCIONES PRINCIPALES

### ultimoPrecioDelProducto(idDelProducto)
- Obtiene el último precio registrado de un producto
- Retorna: {id, precio, createdAt, idProducto}
- OrderBy: createdAt DESC, take: 1

### nuevoPrecioProducto(idDelProducto, nuevoPrecio)
- Registra un nuevo precio para un producto
- Parámetros: idDelProducto, nuevoPrecio (Float)
- Crea registro en tabla Precios

### getProductosPaginados(skip, take, filter, categoryFilter)
- Obtiene productos paginados con búsqueda y filtro
- Parámetros:
  - skip: número de registros a saltar (default: 0)
  - take: cantidad a traer (default: 50)
  - filter: búsqueda por nombre, código barras o descripción
  - categoryFilter: filtro por categoría (LIKE insensitive)
- Include: categorias, precios (últimas), proveedores, presentaciones
- Retorna: array de productos con total count

### getProductosByCategoria(categoryId)
- Obtiene productos filtrados por categoría
- Relación many-to-many

### getProducto(id)
- Obtiene producto específico con ALL inclusions
- Include: categorias, precios, proveedores, presentaciones, documentos

### buscarProductoByCodigoDeBarras(codigo)
- Búsqueda rápida por código de barras
- Return: producto exacto o null

### getProductosConStockBajo(minimoStock)
- Obtiene productos donde stock < minimo
- Para alertas de reposición

## BÚSQUEDAS ESPECIALES

### getProductosAgrupadosPorProveedor()
- Agrupa productos por proveedor
- Útil para crear pedidos automáticos

### getProductosPorProveedor(proveedorId)
- Productos de proveedor específico
- Include: datos de relación ProductoProveedor

## VALIDACIONES

- Códigos de barras únicos
- Precios siempre > 0
- Categorías válidas (existen)
- Proveedores válidos

---

## NUEVAS CARACTERÍSTICAS

- [ ] Búsqueda full-text
- [ ] Filtros avanzados (rango precios, stock)
- [ ] Historial de cambios de precios
- [ ] Recomendaciones (más vendidos)
- [ ] Analytics de productos
