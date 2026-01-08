PROMPT IDEAL PARA REGENERAR serverActions/categorias.js

## PROPÓSITO GENERAL
Server actions para operaciones CRUD de categorías.

## FUNCIONES PRINCIPALES

### guardarCategoria(formData)
- Crea o actualiza categoría
- Parámetros:
  - nombre: string (requerido, >= 3 caracteres)
  - descripcion: string (opcional)
- Normalización:
  - Nombre: primeras letras mayúsculas
  - Validación con formToObject
- Validaciones:
  - Nombre requerido
  - Mínimo 3 caracteres
- Retorna: {error, msg}

### borrarCategoria(idCategoria)
- Elimina categoría
- Validaciones:
  - No tiene productos asociados
  - O disociar productos primero

### actualizarCategoria(idCategoria, datos)
- Actualiza datos existentes
- Mismo flujo que guardar

## Revalidación
- Revalida /categorias

## Error Handling
- P2008: nombre faltante
- P2009: nombre muy corto
- Custom messages

---

## NUEVAS CARACTERÍSTICAS

- [ ] Bulk delete
- [ ] Merge categorías
- [ ] Historial
- [ ] Colores custom
