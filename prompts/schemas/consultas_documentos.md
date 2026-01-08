PROMPT IDEAL PARA CONSULTAS DE DOCUMENTOS (documentos.js)

## PROPÓSITO GENERAL
Funciones server-side para gestionar documentos (facturas, remitos, presupuestos, conteos).

## FUNCIONES PRINCIPALES

### getDocumentos()
- Obtiene todos los documentos
- Include: emisor (contacto), receptor, detalle (productos)
- OrderBy: fecha DESC
- Retorna: array de documentos

### getDocumentoById(id)
- Obtiene documento específico con todos sus detalles
- Include: emisor, receptor, detalleDocumento (productos)

### getDocumentosByContacto(idContacto)
- Obtiene documentos de un contacto específico
- Como emisor O receptor
- OrderBy: fecha DESC

### getDocumentosByTipo(tipoDocumento)
- Obtiene documentos de tipo específico
- Tipos: FACTURA, REMITO, PRESUPUESTO, CONTEO
- Retorna: array filtrado

### getDocumentosByFecha(desde, hasta)
- Obtiene documentos en rango de fechas
- Parámetros: desde (Date), hasta (Date)
- Useful para reportes

### crearDocumento(datos)
- Crea nuevo documento
- Parámetros:
  - numeroDocumento: String (unique + idContacto)
  - tipoDocumento: ENUM
  - tipoMovimiento: ENUM (ENTRADA, SALIDA)
  - idContacto: String (emisor)
  - idDestinatario: String (receptor)
  - fecha: DateTime
  - tieneImpuestos: Boolean
  - total: Float
- Retorna: documento creado

### agregarDetalleDocumento(idDocumento, idProducto, cantidad, precioUnitario)
- Agrega línea a documento
- Parámetros: cantidad, precioUnitario
- Actualiza total del documento
- Relación: Documentos → DetalleDocumento → Productos

### actualizarDocumento(id, datos)
- Actualiza datos del documento
- Campos: fecha, total, tieneImpuestos, notas

### borrarDocumento(id)
- Elimina documento
- Cascade deletes detalleDocumento

## ANALYTICS

### getTotalPorTipo()
- Suma de totales por tipo de documento
- Retorna: {FACTURA: 0, REMITO: 0, ...}

### getTotalPorContacto(idContacto)
- Suma de documentos de contacto

### getDocumentosPendientes()
- Documentos sin confirmar/pendientes de pago

---

## NUEVAS CARACTERÍSTICAS

- [ ] Firmado digital
- [ ] QR en documentos
- [ ] Integración AFIP
- [ ] Nota de crédito automática
- [ ] Generación de remito desde factura
- [ ] Estado de pago
