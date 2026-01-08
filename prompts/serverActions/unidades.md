PROMPT IDEAL PARA REGENERAR serverActions/unidades.js

## PROPÓSITO GENERAL
Server actions para operaciones CRUD de unidades de medida.

## FUNCIONES PRINCIPALES

### guardarUnidad(formData)
- Crea o actualiza unidad
- Parámetros:
  - nombre: string (requerido, ej: "kilogramo")
  - abreviatura: string (requerido, ej: "kg")
  - simbolo: string (ej: "㎏")
- Validaciones:
  - Nombre y abreviatura únicos
  - Mínimo 2 caracteres

### borrarUnidad(idUnidad)
- Elimina unidad
- Validación: no tiene productos

### buscarUnidad(query)
- Búsqueda por nombre o abreviatura

## Conversiones
- Tabla de conversiones (kg → g, m → cm, etc)
- Si aplica agregar

## Revalidación
- Revalida /unidades

---

## NUEVAS CARACTERÍSTICAS

- [ ] Conversión automática
- [ ] Presets estándar
- [ ] Sistemas (métrico, imperial)
