PROMPT IDEAL PARA REGENERAR useBuscarEnGoogle hook

## PROPÓSITO GENERAL
Hook que realiza búsquedas en Google y parsea resultados.

## API

### useBuscarEnGoogle(searchTerm, enabled = true)
- Parámetros:
  - searchTerm: string - Término a buscar
  - enabled: boolean - Habilitar búsqueda
- Devuelve: { results, loading, error, refetch }

## RETORNOS

### results
- Array de resultados formateados
- Cada uno: {title, url, snippet}

### loading
- boolean durante búsqueda

### error
- Mensaje de error o null

### refetch()
- Realiza búsqueda nuevamente

## FUNCIONALIDADES
- Búsqueda en Google
- Parsing de resultados
- Caché de resultados
- Error handling
- Loading state

---

## NUEVAS CARACTERÍSTICAS

- [ ] Filtros avanzados
- [ ] Debounce búsqueda
- [ ] Historial
- [ ] Favoritos
