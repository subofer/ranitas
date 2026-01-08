PROMPT IDEAL PARA REGENERAR SelectCategoriaClient.jsx

## PROPÓSITO GENERAL
Cliente de SelectCategoria que renderiza dropdown con categorías usando FilterSelect.

## PROPS
- options: array - Array de categorías [{id, nombre}]
- valueField: string - Campo para value ("id")
- textField: string - Campo para label ("nombre")
- value: string/number - Valor seleccionado
- onChange: function - Callback al cambiar
- label: string - Label del select
- placeholder: string - Placeholder

## FUNCIONALIDADES
- Client component
- Usa FilterSelect internamente
- Mapea options a formato esperado
- Delega búsqueda a FilterSelect

## ESTILOS
- Hereda de FilterSelect

---

## NUEVAS CARACTERÍSTICAS

- [ ] Multi-select
- [ ] Creación inline
- [ ] Colores por categoría
