PROMPT IDEAL PARA REGENERAR layout.jsx (Paginas Layout)

## PROPÓSITO GENERAL
Layout compartido para todas las páginas de la app con navegación y estructura.

## COMPONENTES

### NavBar Vertical
- Sidebar con menuList
- Links de navegación
- User menu

### NavBar Horizontal
- Header superior
- Logo/título
- Busca global (opcional)
- User menu

### Main Content
- {children} - contenido de página
- Padding y márgenes
- Responsive

### Footer
- Info empresa
- Links rápidos
- Copyright

## ESTRUCTURA
- Top: NavBarHorizontal
- Left: NavBarVertical (desktop, collapsible mobile)
- Center: main > {children}
- Bottom: footer

## ESTILOS
- Colores tema (gray-800, gray-700)
- Responsive: hidden navbar en mobile
- Sticky headers

---

## NUEVAS CARACTERÍSTICAS

- [ ] Tema claro/oscuro
- [ ] Breadcrumbs
- [ ] Notificaciones toast
