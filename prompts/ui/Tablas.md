PROMPT IDEAL PARA REGENERAR Tablas.jsx

## PROPÓSITO GENERAL
Componente genérico de tabla configurable con sorting, paginación y búsqueda.

## PROPS
- data: array - Datos a mostrar
- columns: array - [{key, label, render?}]
- onSort?: function - Callback sorting
- perPage?: number - Items por página
- searchFields?: array - Campos a buscar
- onRowClick?: function - Click en fila
- selectable?: boolean - Permite seleccionar

## FUNCIONALIDADES
- Tabla responsive
- Sorting por columnas
- Paginación integrada
- Búsqueda global
- Selección de filas
- Render custom por celda

---

## NUEVAS CARACTERÍSTICAS

- [ ] Exportación
- [ ] Filtros avanzados
- [ ] Drag reorder cols
- [ ] Freeze columns
