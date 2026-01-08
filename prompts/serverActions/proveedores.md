PROMPT IDEAL PARA REGENERAR serverActions/proveedores.js

## PROPÓSITO GENERAL
Server actions para operaciones CRUD de proveedores.

## FUNCIONES PRINCIPALES

### guardarProveedor(formData)
- Crea o actualiza proveedor
- Parámetros:
  - nombre: string (requerido)
  - email: string
  - telefono: string
  - direccion: string
  - ciudad: string
  - provincia: string
  - codigoPostal: string
  - contacto: string
  - diasPago: number (plazo en días)
  - activo: boolean

### borrarProveedor(idProveedor)
- Elimina proveedor
- Validación: no tiene pedidos activos

### actualizarEstadoProveedor(idProveedor, activo)
- Activa/desactiva proveedor

### buscarProveedor(query)
- Búsqueda por nombre

## Revalidación
- Revalida /proveedores

---

## NUEVAS CARACTERÍSTICAS

- [ ] Ranking de proveedores
- [ ] Seguimiento de pagos
- [ ] Calificación de servicio
- [ ] Historial precios
