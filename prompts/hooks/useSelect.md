PROMPT IDEAL PARA REGENERAR useSelect hook

## PROPÓSITO GENERAL
Hook que maneja estado de selección en componentes Select/FilterSelect.

## API

### useSelect(initialValue = '', onChange = null)
- Parámetros:
  - initialValue: string | number - Valor inicial
  - onChange: function - Callback al cambiar
- Devuelve: { value, setValue, reset }

## RETORNOS

### value
- Valor actualmente seleccionado

### setValue(newValue)
- Actualiza valor
- Llama onChange si existe

### reset()
- Vuelve a initialValue

## FUNCIONALIDADES
- Manejo de estado de select
- Callbacks con onChange
- Reset a valor inicial
- Sincronización con props

---

## NUEVAS CARACTERÍSTICAS

- [ ] Validación
- [ ] Async loading
- [ ] Multi-select
- [ ] Favorite options
