PROMPT IDEAL PARA REGENERAR ExportarPedido.jsx

## PROPÓSITO GENERAL
Componente para exportar pedido a CSV, Excel o PDF.

## PROPS
- pedido: object - {id, proveedor, productos, total}
- formato?: string - "csv" | "excel" | "pdf"

## FUNCIONALIDADES

### Formatos soportados
- CSV: separado por comas
- Excel: XLSX con formato
- PDF: documento formateado

### Datos a exportar
- Encabezado: número pedido, proveedor, fecha
- Tabla de productos: código, nombre, cantidad, precio
- Totales: subtotal, impuestos, total

### UI
- Dropdown o botones para seleccionar formato
- Botón descargar
- Icono de descarga

## LÓGICA
- Genera archivo con nombre: "pedido_[id]_[fecha].[ext]"
- Descarga automática
- Error handling

---

## NUEVAS CARACTERÍSTICAS

- [ ] Template personalizado
- [ ] Envío por email
- [ ] Cloud storage
- [ ] Historial de exportaciones
