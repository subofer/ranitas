PROMPT IDEAL PARA REGENERAR PaginationControls.jsx

## PROPÓSITO GENERAL
Componente de controles de paginación con prev/next y selector de items por página.

## PROPS
- pagina: number - Página actual (1-indexed)
- totalPaginas: number - Total de páginas
- perPage: number - Items por página
- total: number - Total de items
- onPageChange: function - Callback al cambiar página
- onPerPageChange: function - Callback al cambiar perPage
- loading: boolean - Deshabilita botones

## FUNCIONALIDADES PRINCIPALES

### Navegación
- Botón Previous (deshabilitado si pagina === 1)
- Botón Next (deshabilitado si pagina === totalPaginas)
- Display "Mostrando X a Y de Z resultados"

### Responsive
- Vista móvil: Botones inline horizontales (Anterior/Siguiente)
- Vista desktop: Info de rango + selector de perPage

### Selector perPage
- Select con opciones: [10, 25, 50, 100]
- Trigger onPerPageChange

## ESTILOS
- Fondo blanco con border-top
- Botones gray con hover
- Rounded 8px
- Shadow suave

---

## NUEVAS CARACTERÍSTICAS

- [ ] Ir a página específica
- [ ] Inputs numéricos de rango
- [ ] Totales de página
- [ ] Keyboard shortcuts
