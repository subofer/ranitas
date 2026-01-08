PROMPT IDEAL PARA REGENERAR useFiltrarProductosPorValor hook

## PROPÓSITO GENERAL
Hook que filtra productos en tiempo real por múltiples campos usando búsqueda de palabras.

## API

### useFiltrarProductosPorValor(productos, columnas)
- Parámetros:
  - productos: array - Array de productos
  - columnas: array - Nombres de columnas a filtrar
- Devuelve: [cols, productosFiltrados, setFiltro, total, filtrados, filtroActual]

## RETORNOS

### cols
- Array de columnas procesadas
- Cada una con metadatos desde tablaProductosData

### productosFiltrados
- Array de productos después de filtro
- Recalculado con useMemo

### setFiltro(texto)
- Setter para actualizar filtro
- Trigger de recálculo

### total
- Cantidad total de productos (sin filtro)

### filtrados
- Cantidad de productos filtrados

### filtroActual
- Texto actual del filtro

## LÓGICA DE FILTRADO
- Prepara texto de filtro (lowercase, split por espacios)
- Prepara texto de cada campo
- Busca que TODOS los términos estén en ALGÚN campo
- AND logic (todos los términos deben coincidir)

---

## NUEVAS CARACTERÍSTICAS

- [ ] OR logic opcional
- [ ] Fuzzy matching
- [ ] Weights por campo
- [ ] Debounce configurable
