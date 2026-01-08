PROMPT IDEAL PARA REGENERAR CrearPedidoAutomatico.jsx

## PROPÓSITO GENERAL
Modal para confirmar creación automática de pedidos para productos con stock bajo.

## PROPS
- productosPorProveedor: array - [{proveedor, productos: []}]
- onClose: function - Cierra modal
- onCrear: async function - Crea los pedidos

## FUNCIONALIDADES

### Display
- Muestra total de productos a pedir
- Muestra total de proveedores
- Resumen por proveedor
- Tabla detallada de productos

### Modal
- Header con icono magic
- Info "Generar pedidos para stock bajo"
- Close button (X)
- Footer con botones Cancel/Crear

### Lógica
- onClick Crear: llama onCrear()
- Mientras carga: loading state en botón
- OnSuccess: cierra modal
- OnError: muestra error

## ESTILOS
- Modal centered fixed inset-0
- Background semitransparente
- Rounded-xl con shadow-xl
- Header con border-b

---

## NUEVAS CARACTERÍSTICAS

- [ ] Preview de costos
- [ ] Filtro por proveedor
- [ ] Selección individual
- [ ] Validación de stock mínimo
