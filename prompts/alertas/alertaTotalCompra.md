PROMPT IDEAL PARA REGENERAR alertaTotalCompra.jsx

## PROPÓSITO GENERAL
Alerta SweetAlert2 que muestra resumen de compra como ticket y solicita confirmación de cobro.

## FUNCIÓN
export const alertaTotalCompra = async (action, venta) => {...}

## PROPS
- action: function - Callback al confirmar cobro
- venta: object - {total, productos: [{nombre, cantidad, precio}]}

## FUNCIONALIDADES

### Display
- HTML personalizado que simula ticket
- Tabla con productos
- Subtotal, impuestos, total
- Fuente monoespaciada (Courier New)

### Botones
- Botón azul: Confirmar cobro
- Botón rojo: Cancelar

### Estilos
- Estilo "ticket" con monoespaciado
- Tabla con borders
- Números alineados derecha

## LÓGICA
- Si isConfirmed: llama action(venta)
- Si cancelado: no hace nada

---

## NUEVAS CARACTERÍSTICAS

- [ ] Impresión de ticket
- [ ] QR para factura
- [ ] Múltiples métodos de pago
- [ ] Histórico de ventas
