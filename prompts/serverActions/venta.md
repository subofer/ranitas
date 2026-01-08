PROMPT IDEAL PARA REGENERAR serverActions/venta.js

## PROPÓSITO GENERAL
Server actions para operaciones de ventas/POS.

## FUNCIONES PRINCIPALES

### crearVenta(datosVenta)
- Registra nueva venta
- Parámetros:
  - productos: array[{id, cantidad, precioVenta}]
  - clienteId: number (opcional)
  - metodoPago: enum
  - descuento: number (opcional)
  - observaciones: string
- Lógica:
  - Descontar stock
  - Generar número factura
  - Calcular totales (IVA)
  - Registrar en tabla ventas

### actualizarStockProducto(idProducto, cantidad)
- Decrementa stock después venta
- Validación: stock suficiente

### generarFactura(idVenta)
- Genera factura PDF
- Retorna PDF o URL descarga

### devolverVenta(idVenta)
- Anula venta anterior
- Restaura stock
- Crea nota de crédito

## Revalidación
- Revalida /venta, /facturas, home

---

## NUEVAS CARACTERÍSTICAS

- [ ] Integración fiscal
- [ ] Reportes diarios
- [ ] Análisis de ventas
- [ ] Proyecciones
