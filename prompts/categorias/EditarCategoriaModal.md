PROMPT IDEAL PARA REGENERAR EditarCategoriaModal.jsx

## PROPÓSITO GENERAL
Modal para editar datos de una categoría existente.

## PROPS
- categoria: object - {id, nombre, ...otros campos}
- isOpen: boolean - Control de visibilidad
- onClose: function - Cierra modal
- onSave: async function - Guarda cambios
- loading: boolean - Estado de carga

## FUNCIONALIDADES

### Formulario
- Input para nombre
- Otros campos de categoría (si aplica)
- Validación

### Modal
- Header con título "Editar Categoría"
- Close button (X)
- Footer con Cancel/Guardar

### Lógica
- onClick Guardar: llama onSave con datos actualizados
- Validación antes de enviar
- Loading state en botón
- OnSuccess: cierra modal
- OnError: muestra error

## ESTILOS
- Modal centered
- Rounded-lg con shadow
- Tailwind forms

---

## NUEVAS CARACTERÍSTICAS

- [ ] Eliminación inline
- [ ] Histórico de cambios
- [ ] Preview de productos
