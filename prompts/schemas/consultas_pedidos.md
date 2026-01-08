PROMPT IDEAL PARA CONSULTAS DE PEDIDOS (pedidos.js)

## PROPÓSITO GENERAL
Funciones server-side para gestionar pedidos a proveedores.

## FUNCIONES PRINCIPALES

### getPedidos()
- Obtiene todos los pedidos con detalles completos
- Include: proveedor, usuario, detallePedidos (con productos)
- OrderBy: createdAt DESC
- Retorna: array de pedidos

### getPedidoById(id)
- Obtiene un pedido específico
- Include: proveedor, usuario, detallePedidos con productos
- Retorna: pedido único o null

### getPedidosByProveedor(idProveedor)
- Obtiene pedidos de proveedor específico
- Include: usuario, detallePedidos con productos
- Útil para vista "Pedidos por Proveedor"

### crearPedido(datosPedido)
- Crea nuevo pedido
- Parámetros:
  - numero: String (secuencial)
  - fecha: DateTime
  - idProveedor: String
  - idUsuario: String
  - notas: String (opcional)
- Retorna: pedido creado

### agregarProductoAPedido(idPedido, idProducto, cantidad, precioUnitario)
- Agrega producto al detalle de pedido
- Validación: producto no existe ya en pedido
- Unique constraint: [idPedido, idProducto]

### actualizarEstadoPedido(idPedido, nuevoEstado)
- Cambio de estado del pedido
- Estados válidos: PENDIENTE, ENVIADO, RECIBIDO, CANCELADO
- Actualiza updatedAt

### eliminarPedido(idPedido)
- Elimina pedido (cascade deletes detallePedidos)
- Validación: estado != RECIBIDO

### getProductosAgrupadosPorProveedor()
- Agrupa productos por proveedor para crear pedidos automáticos
- Filtra por stock bajo
- Retorna: {proveedor, productos}

### crearPedidosAutomaticos()
- Crea pedidos automáticos para stock bajo
- Por cada proveedor: 1 pedido con sus productos
- Estados: PENDIENTE
- Retorna: array de pedidos creados

## VALIDACIONES

- Proveedor existe
- Usuario existe
- Producto existe en catálogo
- Estado válido
- Cantidad > 0
- Fecha válida

## RELACIONES

- Pedidos → Contactos (proveedor)
- Pedidos → Usuarios (quién crea)
- Pedidos → DetallePedidos → Productos

---

## NUEVAS CARACTERÍSTICAS

- [ ] Historiales de cambios de estado
- [ ] Notificaciones de estado
- [ ] Seguimiento de entregas
- [ ] Predicción de costos
- [ ] Alertas de vencimiento
