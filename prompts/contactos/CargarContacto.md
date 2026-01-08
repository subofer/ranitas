PROMPT IDEAL PARA REGENERAR CargarContacto.jsx

## PROPÓSITO GENERAL
Modal para crear o editar un contacto con formulario.

## PROPS
- isOpen: boolean - Control visibilidad
- onClose: function - Cierra modal
- onSave: async function - Guarda contacto
- contacto?: object - Contacto a editar (opcional)
- loading: boolean - Estado de carga

## FUNCIONALIDADES

### Formulario
- Input nombre (requerido)
- Input empresa
- Input email
- Input teléfono
- Input dirección (si aplica)
- Input notas

### Modal
- Header: "Nuevo Contacto" o "Editar Contacto"
- Close button
- Footer: Cancel/Guardar

### Lógica
- Validación: nombre requerido
- OnSave: envía datos al servidor
- Auto-cierra en éxito
- Muestra errores

## ESTILOS
- Modal centered
- Rounded-lg
- Formulario limpio

---

## NUEVAS CARACTERÍSTICAS

- [ ] Duplicar contacto
- [ ] Búsqueda automática de empresa
- [ ] Validación de email
