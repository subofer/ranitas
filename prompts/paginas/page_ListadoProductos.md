PROMPT IDEAL PARA REGENERAR page.jsx - ListadoProductos Page

## PROPÓSITO GENERAL
Página que lista todos los productos con búsqueda, filtros y vista modal/tabla.

## FUNCIONALIDADES

### Layout
- Header con título "Productos"
- Barra de búsqueda
- Componente PageVerProductos (client component)

### PageVerProductos
- Wrapper con Suspense
- Fallback: "Cargando productos..."
- Render ListadoProductosModerno

### Características
- Tabla de productos (columns: cat, nombre, precio, stock, imagen, acciones)
- Búsqueda global en tiempo real
- Filtros: por categoría, rango precio, stock disponible
- Vistas: tabla / grid
- Paginación

### Acciones
- Editar producto
- Eliminar producto
- Agregar a pedido
- Ver detalles

---

## NUEVAS CARACTERÍSTICAS

- [ ] Exportar PDF/Excel
- [ ] Bulk edit
- [ ] Import productos
- [ ] Historial cambios
