PROMPT IDEAL PARA ENTENDER Y MODIFICAR schema.prisma

## PROPÓSITO GENERAL
Schema de base de datos Prisma ORM que define todas las tablas y relaciones del sistema de inventario Ranitas.

## MODELOS PRINCIPALES

### Productos
- id: UUID (PK)
- codigoBarra: String (UNIQUE)
- nombre: String
- descripcion: String (opcional)
- imagen: String (opcional)
- tipoVenta: ENUM (GRANEL, UNIDAD, BULTO)
- size: Float (opcional)
- unidad: String (opcional)
- Relaciones: categorias (many-to-many), precios (1-many), proveedores, presentaciones, detallePedidos

### Categorias
- id: UUID (PK)
- nombre: String (UNIQUE)
- products: Productos[] (relación inversa)

### Contactos (Proveedores/Clientes)
- id: UUID (PK)
- cuit: String (UNIQUE)
- nombre: String (UNIQUE)
- telefono: String
- esProveedor: Boolean
- esMarca: Boolean
- esInterno: Boolean
- Relaciones: direcciones, documentos, emails, productos, pedidos

### Pedidos
- id: UUID (PK)
- numero: String (UNIQUE)
- fecha: DateTime
- idProveedor: String (FK)
- estado: EstadoPedido (PENDIENTE, ENVIADO, RECIBIDO, CANCELADO)
- notas: String (opcional)
- idUsuario: String (FK)
- detallePedidos: DetallePedidos[] (1-many)

### DetallePedidos
- id: UUID (PK)
- idPedido: String (FK)
- idProducto: String (FK)
- cantidad: Float
- precioUnitario: Float
- observaciones: String
- Unique: [idPedido, idProducto]

### Precios
- id: Int (auto-increment PK)
- precio: Float
- idProducto: String (FK)
- createdAt: DateTime
- Historial de precios por producto

### Documentos
- id: UUID (PK)
- numeroDocumento: String
- tipoDocumento: ENUM (FACTURA, REMITO, PRESUPUESTO, CONTEO)
- tipoMovimiento: ENUM (ENTRADA, SALIDA)
- total: Float
- tieneImpuestos: Boolean
- detalle: DetalleDocumento[] (1-many)

### Presentaciones & AgrupacionPresentaciones
- Manejo de diferentes presentaciones de productos
- Agrupación de presentaciones (ej: 6 botellas = 1 caja)

### Direcciones & Geografía
- Provincias, Localidades, Calles
- Direcciones de contactos con relaciones geográficas

## ENUMS IMPORTANTES

```prisma
enum TipoMovimiento {
  ENTRADA  // Compras
  SALIDA   // Ventas
}

enum TipoVenta {
  GRANEL   // Venta al por mayor
  UNIDAD   // Venta unitaria
  BULTO    // Venta por bulto
}

enum TipoDocumento {
  FACTURA
  REMITO
  PRESUPUESTO
  CONTEO
}

enum EstadoPedido {
  PENDIENTE
  ENVIADO
  RECIBIDO
  CANCELADO
}

enum FormaPago {
  EFECTIVO
  TARJETA_CREDITO
  TARJETA_DEBITO
  TRANSFERENCIA
  CHEQUE
  CUENTA_CORRIENTE
}
```

## RELACIONES CLAVE

1. **Productos ↔ Categorias** (many-to-many)
2. **Productos ↔ Precios** (1-many, historial)
3. **Productos ↔ Proveedores** (through ProductoProveedor)
4. **Contactos ↔ Pedidos** (1-many)
5. **Pedidos ↔ DetallePedidos** (1-many, cascade delete)
6. **Contactos ↔ Documentos** (como emisor y receptor)

## CARACTERÍSTICAS

- ✅ PostgreSQL como provider
- ✅ UUIDs para PKs (excepto Precios que usa autoincrement)
- ✅ Timestamps automáticos (createdAt, updatedAt)
- ✅ Relaciones bien definidas
- ✅ Constraints UNIQUE apropiados
- ✅ Enums para tipos fijos
- ✅ Soft deletes no implementados (agregar si necesario)

---

## NUEVAS CARACTERÍSTICAS SUGERIDAS

- [ ] Soft deletes (deletedAt field)
- [ ] Auditoría de cambios
- [ ] Estado de sincronización
- [ ] Campos de metadatos (JSON)
- [ ] Índices de búsqueda full-text
- [ ] Particionamiento por fecha (si hay volumen)
- [ ] Views para reportes comunes
- [ ] Tablas de historial de cambios
