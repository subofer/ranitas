# Cambios: Pendientes de corrección + Presentaciones en Pedidos

Fecha: 2026-01-15

## Objetivo
- Empezar a implementar el concepto “no cortar el flujo por datos faltantes”, registrando tareas correctivas para resolver después.
- Preparar el flujo de **Pedidos** para poder referenciar una **presentación** específica (igual que en Facturas, donde ya existe `presentacionId` / `unidadVenta`).

## Cambios en Base de Datos (Prisma)

### 1) Nuevo modelo `CorreccionPendiente`
- Archivo: prisma/schema.prisma
- Se agregaron:
  - Enums `CorreccionPendienteEstado` (`ABIERTO` / `RESUELTO`)
  - Enums `CorreccionPendienteTipo` (`MAPEAR_ITEM_FACTURA`, `ALIAS_PRESENTACION_PROVEEDOR`, `DATO_FALTANTE`)
  - Modelo `CorreccionPendiente` con:
    - `titulo`, `descripcion`
    - `entidadTipo`, `entidadId`, `contexto`
    - `payload` (JSON) para guardar el “contexto suficiente” y poder ejecutar la acción luego
    - campos de resolución (`resueltoAt`, `resueltoPor`, `notasResolucion`)
    - índices por `estado`, `tipo`, `createdAt`

### 2) `DetallePedidos` ahora soporta `presentacionId`
- Archivo: prisma/schema.prisma
- Se agregó:
  - `presentacionId String?`
  - relación `presentacion Presentaciones?`
  - lado inverso `Presentaciones.detallePedidos`.
- Se actualizó el unique:
  - Antes: `@@unique([idPedido, idProducto])`
  - Ahora: `@@unique([idPedido, idProducto, presentacionId])`

### 3) Migración aplicada
- Carpeta: prisma/migrations/20260115120000_add_pendientes_y_presentacion_en_pedidos/
- Nota: `prisma migrate dev` no pudo correr en modo no-interactivo (limitación del entorno), así que la migración se creó como SQL y se aplicó con:
  - `prisma migrate deploy`
  - `prisma generate`

## Server Actions

### Pendientes
- Archivo: prisma/serverActions/pendientes.js
- Acciones:
  - `crearPendiente({...})`: crea un pendiente sin romper el flujo si falla auditoría
  - `resolverPendiente(id, { notas })`: marca como RESUELTO
  - `getPendientes({ estado })`: lista pendientes por estado
  - `aplicarPendienteFacturaItem(idPendiente, { idProducto, presentacionId })`:
    - Crea el `DetalleDocumento` asociado al documento original
    - Ajusta stock (suelto vs cerrado según `presentacionId` y unidad base)
    - Guarda historial de precio (`Precios`) cuando corresponde
    - Marca el pendiente como RESUELTO guardando referencia al detalle creado

### Alias por proveedor/presentación
- Archivo: prisma/serverActions/aliasesProveedor.js
- Acciones (ya creadas para enganchar luego en UI/facturas/proveedor):
  - `upsertAliasPresentacionProveedor(...)`
  - `getAliasesProveedor(...)`

## Ajustes en Pedidos (consulta/DB)
- Archivo: prisma/consultas/pedidos.js
- Cambios:
  - Se incluyen `presentacion` en los includes de `getPedidos`, `getPedidoById`, `getPedidosByProveedor`.
  - Al crear pedidos (`crearPedido`) y al agregar items (`agregarProductoAPedido`):
    - se intenta setear `presentacionId` automáticamente a la **unidad base** del producto (si existe) o a la primera presentación disponible.
  - El update de cantidad (`actualizarCantidadDetallePedido`) se adaptó a la nueva unique.
    - Si no llega `presentacionId`, actualiza el primer match por `idPedido + idProducto` (fallback compatibilidad).

## UI

### Nueva pantalla: /pendientes
- Archivo: app/(paginas)/pendientes/page.jsx
- MVP de listado y resolución:
  - filtro Abiertos/Resueltos
  - botón “Resolver” para pendientes abiertos
  - botón “Aplicar” para pendientes `MAPEAR_ITEM_FACTURA` (selección de producto + presentación)

### Facturas: no cortar flujo por ítems no mapeados
- Archivo: app/components/formularios/CargarFacturaClient.jsx
- Se agregó el campo `descripcionPendiente` en cada renglón.
- Si un renglón no tiene producto seleccionado pero tiene `descripcionPendiente`/cantidad/precio, al guardar:
  - Se crea el documento con las líneas válidas
  - Se genera un `CorreccionPendiente` por cada línea no mapeada (tipo `MAPEAR_ITEM_FACTURA`) con payload suficiente para aplicar luego

- Backend: prisma/serverActions/documentos.js
  - Genera pendientes dentro de la transacción cuando existen renglones sin `idProducto`.

## Verificación
- Se corrió `npm run build` y compiló OK.

## Pendiente (siguiente etapa)
- Conectar creación automática de pendientes desde flujos reales (por ejemplo: carga de factura cuando falta mapping/alias).
- Integrar edición/visualización de alias por proveedor + presentación en:
  - productos por proveedor
  - pedidos
  - carga de facturas
- Mejorar el flujo de pedidos para permitir seleccionar presentación explícitamente (UI) y evitar ambigüedad cuando un producto tiene múltiples presentaciones.
