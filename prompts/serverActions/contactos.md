PROMPT IDEAL PARA REGENERAR serverActions/contactos.js

## PROPÓSITO GENERAL
Server actions para operaciones CRUD de contactos.

## FUNCIONES PRINCIPALES

### guardarContacto(formData)
- Crea o actualiza contacto
- Parámetros:
  - nombre: string (requerido)
  - empresa: string
  - email: string (valida formato)
  - telefono: string
  - direccion: string
  - notas: string (opcional)
- Validaciones:
  - Nombre requerido
  - Email válido (si existe)
  - Teléfono formato válido

### borrarContacto(idContacto)
- Elimina contacto
- Manejo de relaciones

### buscarContacto(query)
- Búsqueda por nombre/email
- Retorna matches

## Revalidación
- Revalida /contactos

---

## NUEVAS CARACTERÍSTICAS

- [ ] Duplicado detection
- [ ] Merge contactos
- [ ] Import CSV
- [ ] Sincronización
