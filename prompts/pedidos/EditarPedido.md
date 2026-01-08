PROMPT IDEAL PARA REGENERAR EditarPedido.jsx

## PROPÓSITO GENERAL
Modal para editar datos de un pedido existente (cantidad, observaciones, estado).

## PROPS
- pedido: object - {id, proveedor, productos: [{...}], estado}
- isOpen: boolean - Control visibilidad
- onClose: function - Cierra modal
- onSave: async function - Guarda cambios
- onDelete: async function - Elimina pedido
- loading: boolean - Estado carga

## FUNCIONALIDADES

### Formulario
- Select de estado (PENDIENTE, ENVIADO, RECIBIDO, CANCELADO)
- Editar cantidades de productos
- Observaciones/notas
- Fecha de entrega esperada (si aplica)

### Acciones
- Guardar cambios
- Eliminar pedido (con alerta)
- Cancelar

### Lógica
- Validación de cantidades (> 0)
- OnSave: envía datos al servidor
- OnDelete: alerta de confirmación
- Auto-cierra en éxito

## ESTILOS
- Modal centered
- Tabla de productos editables

---

## NUEVAS CARACTERÍSTICAS

- [ ] Histórico de cambios
- [ ] Timeline de estado
- [ ] Múltiples proveedores
- [ ] Proyección de costos
