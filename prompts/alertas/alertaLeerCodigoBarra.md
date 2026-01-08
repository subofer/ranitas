PROMPT IDEAL PARA REGENERAR alertaLeerCodigoBarra.jsx

## PROPÓSITO GENERAL
Alerta SweetAlert2 que muestra código de barras leído y solicita confirmación.

## FUNCIÓN
export const alertaLeerCodigoBarra = async (codigo, action) => {...}

## PROPS
- codigo: string - Código leído del scanner
- action: function - Callback si confirma

## FUNCIONALIDADES

### Display
- Título: "Codigo leido:"
- Body: muestra código
- Texto monoespaciado para códigos

### Botones
- Botón azul: Aceptar (confirmButtonColor: '#3085d6')
- Botón rojo: Cancelar (cancelButtonColor: '#d33')

## LÓGICA
- Si isConfirmed: llama action(codigo)
- Si cancelado: no hace nada

---

## NUEVAS CARACTERÍSTICAS

- [ ] Búsqueda automática del producto
- [ ] Historial de códigos
- [ ] Copy automático
- [ ] Validación de formato
