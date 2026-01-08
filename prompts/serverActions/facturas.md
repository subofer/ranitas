PROMPT IDEAL PARA REGENERAR serverActions/facturas.js

## PROPÓSITO GENERAL
Server actions para operaciones de facturas.

## FUNCIONES PRINCIPALES

### crearFactura(datosFactura)
- Genera factura desde venta
- Parámetros:
  - ventaId: number
  - serie: string (A, B, C)
  - numero: number (secuencial)
  - tipo: enum (A=responsable, B=consumidor, etc)
- Genera:
  - Número secuencial
  - Fecha emisión
  - QR código

### guardarFactura(datosFactura)
- Guarda/actualiza factura

### cancelarFactura(idFactura)
- Cancela factura
- Anula venta asociada

### exportarFactura(idFactura, formato)
- Formato: pdf, excel
- Retorna descargable

### buscarFactura(query)
- Búsqueda por número, fecha, cliente

## Revalidación
- Revalida /facturas

---

## NUEVAS CARACTERÍSTICAS

- [ ] Firmado digital
- [ ] Nota de crédito
- [ ] Remito integrado
- [ ] AFIP integration
