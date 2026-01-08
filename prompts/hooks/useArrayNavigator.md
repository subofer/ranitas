PROMPT IDEAL PARA REGENERAR useArrayNavigator hook

## PROPÓSITO GENERAL
Hook que navega arrays con teclas (↑↓) como en listas seleccionables.

## API

### useArrayNavigator(array, onSelect = null)
- Parámetros:
  - array: array - Array de items
  - onSelect: function - Callback al seleccionar
- Devuelve: { currentIndex, current, goUp, goDown, select, reset }

## RETORNOS

### currentIndex
- Índice del item actual

### current
- Item actualmente seleccionado

### goUp()
- Navega arriba (decrementa índice)

### goDown()
- Navega abajo (incrementa índice)

### select()
- Selecciona item actual (llama onSelect)

### reset()
- Vuelve a índice 0

## FUNCIONALIDADES
- Navegación con ↑↓
- Wrap around (de fin a inicio)
- Callback al seleccionar
- Reset

---

## NUEVAS CARACTERÍSTICAS

- [ ] Keyboard auto-bind
- [ ] Page Up/Down
- [ ] Home/End
- [ ] Filterable list
