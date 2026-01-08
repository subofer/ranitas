PROMPT IDEAL PARA REGENERAR NavBarHorizontal.jsx

## PROPÓSITO GENERAL
Barra de navegación horizontal con menús desplegables y soporte para navegación por teclado.

## FUNCIONALIDADES

### Estructura
- Menú principal horizontal (menuListHorizontal)
- Submenús desplegables
- UserMenu en esquina derecha

### Navegación por Teclado
- ArrowRight: Próximo menú
- ArrowLeft: Menú anterior
- ArrowDown/ArrowUp: Navegar submenú
- Enter: Seleccionar
- Esc: Cerrar menú

### Comportamiento
- ActiveMenuIndex: menú principal seleccionado
- ActiveSubMenuIndex: submenú seleccionado
- isNavActive: control del menú
- Wrap around en los bordes

### Temas
- Fondo gris oscuro (bg-gray-800)
- Items gris oscuro (bg-gray-700)
- Hover y active con colores oscuros

## ESTILOS
- zIndex: 9998 para overlay
- Responsive
- Menús desplegables

---

## NUEVAS CARACTERÍSTICAS

- [ ] Búsqueda en menú
- [ ] Favoritos/atajos
- [ ] Tema claro/oscuro
- [ ] Collapsar en mobile
