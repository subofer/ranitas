PROMPT IDEAL PARA REGENERAR alertaCrearCodigoDeBarras.jsx

## PROPÓSITO GENERAL
Alerta para crear/asignar código de barras a un producto.

## PROPS
- producto: object - {id, nombre, codigoBarras?}
- action: function - Callback al confirmar

## FUNCIONALIDADES

### Display
- Muestra producto
- Input para ingresar código
- Opción generar automático

### Botones
- Confirmar
- Cancelar

### Lógica
- Valida formato código (números)
- Chequea duplicados
- Si confirma: llama action(producto, codigo)

---

## NUEVAS CARACTERÍSTICAS

- [ ] Generar automático
- [ ] QR embed
- [ ] Historial códigos anteriores
