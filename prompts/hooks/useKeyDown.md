PROMPT IDEAL PARA REGENERAR useKeyDown hook

## PROPÓSITO GENERAL
Hook que maneja eventos de teclado con soporte para múltiples keys en un elemento.

## API

### useKeyDown(elementRef, keyHandlers)
- Parámetros:
  - elementRef: React.Ref - Referencia al elemento
  - keyHandlers: object - {keyName: callback}
- Devuelve: void

## FUNCIONALIDADES
- Listener en elemento específico
- Múltiples teclas simultáneamente
- preventDefault automático
- Auto-cleanup

## CASOS DE USO
- Navegación con teclado (↑↓←→)
- Atajos en inputs
- Modales con Esc

---

## NUEVAS CARACTERÍSTICAS

- [ ] Combo keys
- [ ] Long press detection
- [ ] Repeat handling
