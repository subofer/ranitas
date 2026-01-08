PROMPT IDEAL PARA REGENERAR serverActions/productos.js

## PROPÓSITO GENERAL
Server actions para operaciones CRUD de productos.

## FUNCIONES PRINCIPALES

### guardarProducto(formData)
- Crea o actualiza producto
- Parámetros:
  - codigoBarra: string
  - descripcion: string
  - unidad: string
  - imagen: string (base64 o URL)
  - size: number
  - nombre: string (normalizado mayúsculas)
  - categorias: array de {id}
  - precioVenta: number
  - precioCosto: number
  - stock: number

### Transformaciones
- Nombre: primeras letras mayúsculas
- Size: parseFloat
- Categorías: manejo de relaciones many-to-many

### Validaciones
- Nombre requerido
- Código barras único
- Stock >= 0
- Precios válidos

### Revalidación
- Revalida /cargarProductos

---

## NUEVAS CARACTERÍSTICAS

- [ ] Validación de imagen
- [ ] Slug automático
- [ ] Historial de cambios
- [ ] Bulk operations
