PROMPT IDEAL PARA REGENERAR useViewportHeight hook

## PROPÓSITO GENERAL
Hook que obtiene altura disponible de viewport considerando header/footer.

## API

### useViewportHeight(subtractHeight = 0)
- Parámetro: subtractHeight - altura adicional a restar (px)
- Devuelve: { height, setHeightRef }

## RETORNOS

### height
- Altura disponible calculada (px)

### setHeightRef(ref)
- Asigna ref al elemento para medir

## FUNCIONALIDADES
- Calcula altura disponible
- Considera posición fixed/absolute
- Actualiza en resize
- Útil para elementos full-height

## CASOS DE USO
- Tablas que ocupan toda la pantalla
- Modales responsivos
- Layouts con espacios fijos

---

## NUEVAS CARACTERÍSTICAS

- [ ] Dynamic margin calculation
- [ ] Animation smooth
- [ ] CSS variable update
