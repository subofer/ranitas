PROMPT IDEAL PARA REGENERAR usePantalla hook

## PROPÓSITO GENERAL
Hook que detecta tamaño de pantalla y breakpoints responsivos.

## API

### usePantalla()
- Sin parámetros
- Devuelve: { ancho, alto, isMobile, isTablet, isDesktop, esMovil }

## RETORNOS

### ancho
- Ancho de la ventana en pixels

### alto
- Alto de la ventana en pixels

### isMobile
- boolean - Pantalla menor a 768px

### isTablet
- boolean - Entre 768px y 1024px

### isDesktop
- boolean - Mayor a 1024px

### esMovil
- boolean - Alias para isMobile

## FUNCIONALIDADES
- Actualiza en resize
- Debounce de eventos
- Breakpoints Tailwind
- SSR safe

---

## NUEVAS CARACTERÍSTICAS

- [ ] Custom breakpoints
- [ ] Orientation detection
- [ ] DPI detection
