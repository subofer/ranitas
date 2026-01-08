PROMPT IDEAL PARA REGENERAR PedidosPorProveedor.jsx

## PROPÓSITO GENERAL
Componente que agrupa y muestra pedidos organizados por proveedor con resumen.

## PROPS
- pedidos: array - Array de todos los pedidos
- filtroEstado?: string - Filtrar por estado (PENDIENTE, ENVIADO, etc)

## FUNCIONALIDADES

### Agrupación
- Agrupa pedidos por proveedor
- Calcula totales por proveedor
- Cuenta productos por proveedor

### Display
- Cards por proveedor con:
  - Nombre proveedor
  - Total de items
  - Total de dinero
  - Lista de pedidos
  - Estado general

### Ordenamiento
- Por total descending
- Opción alfabético

### Filtro
- Por estado de pedido
- Por fechas

## ESTILOS
- Grid o stack de cards
- Resumen destacado
- Colores por estado

---

## NUEVAS CARACTERÍSTICAS

- [ ] Edición bulk
- [ ] Merge pedidos
- [ ] Alertas de vencimiento
- [ ] Calendario de entregas
