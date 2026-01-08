PROMPT IDEAL PARA CONSULTAS DE PROVEEDORES (proveedores.js)

## PROPÓSITO GENERAL
Funciones server-side especializadas para gestionar proveedores (subset de contactos).

## FUNCIONES PRINCIPALES

### getProveedores()
- Obtiene todos los contactos marcados como proveedores
- Where: esProveedor = true
- Include: direcciones, emails, cuentaBancaria, productos, pedidos
- OrderBy: nombre ASC
- Retorna: array de proveedores

### getProveedorById(id)
- Obtiene proveedor específico con todos sus datos
- Include: direcciones, emails, cuentaBancaria, productos (ProductoProveedor), pedidos

### crearProveedor(datos)
- Crea nuevo proveedor (es contacto con esProveedor=true)
- Parámetros:
  - cuit: String (UNIQUE)
  - nombre: String (UNIQUE)
  - telefono: String
  - iva: String
  - direcciones: [{calle, número, localidad, provincia}]
  - emails: [email1, email2]
  - cuentaBancaria: {banco, cbu, alias}
  - diasPago: Int (plazo en días)
  - persona: String (contacto)
- Retorna: proveedor creado

### actualizarProveedor(id, datos)
- Actualiza datos del proveedor
- Campos: teléfono, iva, persona, diasPago, etc

### borrarProveedor(id)
- Elimina proveedor
- Validación: no tiene pedidos activos
- O: cancelar/completar todos primero

### getProductosDelProveedor(idProveedor)
- Obtiene productos que ofrece este proveedor
- Include: código del proveedor (ProductoProveedor.codigo)
- Útil para: crear pedidos

### getPedidosDelProveedor(idProveedor)
- Obtiene pedidos realizados a este proveedor
- Include: detallePedidos
- OrderBy: fecha DESC

### getEstadisticasProveedor(idProveedor)
- Calcula estadísticas:
  - totalCompras (sum)
  - totalProductos (count)
  - pedidosPendientes (count where estado=PENDIENTE)
  - diasPromedioPago
  - calificacion (rating)

## RELACIONES ESPECIALES

### agregarProductoAlProveedor(idProveedor, idProducto, codigo)
- Asocia producto con proveedor
- código: código del producto según el proveedor

### actualizarCodigoProductoProveedor(idProveedor, idProducto, nuevoCodigo)
- Actualiza código del producto para este proveedor

### desasociarProductoDelProveedor(idProveedor, idProducto)
- Quita relación producto-proveedor

## VALIDACIONES

- CUIT válido
- Nombre único
- Si tiene pedidos: no puede borrarse sin cancelarlos
- Teléfono formato válido
- Email válido

---

## NUEVAS CARACTERÍSTICAS

- [ ] Calificación de proveedor
- [ ] Seguimiento de pagos
- [ ] Comparativa de precios
- [ ] Historial de entregas
- [ ] Alertas de vencimiento
- [ ] Reportes de desempeño
