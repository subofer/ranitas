PROMPT IDEAL PARA REGENERAR page.jsx - Pedidos Page

## PROPÓSITO GENERAL
Página que gestiona pedidos con vistas agrupadas por proveedor o lista normal.

## FUNCIONALIDADES

### Estado
- pedidos: array de pedidos
- productosPorProveedor: datos agrupados
- loading: boolean
- vistaAgrupada: toggle entre vistas

### Datos
- Fetch getPedidos()
- Fetch getProductosAgrupadosPorProveedor()
- Promise.all() para parallelizar

### Vistas
- Vista por Proveedor: agrupa con PedidosPorProveedor
- Vista Normal: lista con ListaPedidos

### Acciones
- Toggle vista (botón Agrupar/Desagrupar)
- Crear Pedido Automático (modal CrearPedidoAutomatico)
- Editar pedido
- Eliminar pedido (con alerta)
- Exportar pedido

### Botones
- Crear Pedido (abre modal)
- Crear Automático (stock bajo)
- Refresh datos

---

## NUEVAS CARACTERÍSTICAS

- [ ] Filtros por estado
- [ ] Calendario de entregas
- [ ] Alerts de vencimiento
- [ ] Analytics
