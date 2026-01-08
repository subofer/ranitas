PROMPT IDEAL PARA REGENERAR useFormControl hook

## PROPÓSITO GENERAL
Hook que proporciona control completo de inputs y validación de formularios.

## API

### useFormControl(initialValue = '', validate = null)
- Parámetros:
  - initialValue: string - Valor inicial
  - validate: function - Función de validación
- Devuelve: { value, setValue, error, setError, reset, isDirty }

## RETORNOS

### value
- Valor actual del input

### setValue(newValue)
- Actualiza valor
- Ejecuta validación si existe

### error
- Mensaje de error o null

### setError(msg)
- Establece error manualmente

### reset()
- Vuelve a initialValue y limpia error

### isDirty
- boolean si el valor cambió

## FUNCIONALIDADES
- Estado del input
- Validación
- Error handling
- Dirty tracking
- Reset

---

## NUEVAS CARACTERÍSTICAS

- [ ] Touch tracking
- [ ] Custom async validation
- [ ] Debounced validation
- [ ] Multiple validators
