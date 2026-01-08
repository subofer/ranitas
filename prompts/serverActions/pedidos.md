PROMPT IDEAL PARA REGENERAR serverActions/pedidos.js

## PROPÓSITO GENERAL
Server actions para operaciones CRUD de pedidos.

## FUNCIONES PRINCIPALES

### crearNuevoPedido(datosPedido)
- Crea pedido nuevo
- Parámetros:
  - proveedorId: number
  - productos: array
  - observaciones: string (opcional)
  - fechaEntrega: date (opcional)
- Retorna: {success, pedido}

### cambiarEstadoPedido(idPedido, nuevoEstado)
- Actualiza estado
- Estados: PENDIENTE, ENVIADO, RECIBIDO, CANCELADO
- Retorna: {success, pedido}

### agregarProductoAPedido(idPedido, producto)
- Agrega producto existente a pedido
- Valida disponibilidad

### eliminarPedido(idPedido)
- Elimina pedido (o solo marca cancelado)
- Requiere confirmar si tiene items

### crearPedidosAutomaticos()
- Crea pedidos para productos con stock bajo
- Agrupa por proveedor

## Revalidación
- Revalida /pedidos y home

---

## NUEVAS CARACTERÍSTICAS

- [ ] Asignación automática de proveedor
- [ ] Notificaciones
- [ ] Historial estados
- [ ] Seguimiento de entregas
