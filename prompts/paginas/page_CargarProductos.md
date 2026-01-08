PROMPT IDEAL PARA REGENERAR page.jsx - CargarProductos Page

## PROPÓSITO GENERAL
Página para crear y cargar nuevos productos al inventario.

## FUNCIONALIDADES

### Formulario de Producto
- Nombre (requerido)
- Descripción
- Categoría (SelectCategoria)
- Unidad (SelectUnidades)
- Código de barras
- Precio de costo
- Precio de venta
- Stock inicial
- Imagen/foto
- Proveedor (SelectProveedor)

### Validaciones
- Campos requeridos
- Validación de números
- Código barras único
- Stock mínimo definible

### Acciones
- Guardar producto (server action)
- Limpiar formulario
- Cancelar/volver
- Captura de foto (opcional)

### Comportamiento
- Success: muestra confirmación y limpia form
- Error: muestra alerta con mensaje
- Loading state en botón guardar

---

## NUEVAS CARACTERÍSTICAS

- [ ] Importar CSV
- [ ] Duplicar producto
- [ ] Template de productos
- [ ] Precios automáticos
