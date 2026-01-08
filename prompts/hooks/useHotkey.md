PROMPT IDEAL PARA REGENERAR useHotkey hook

## PROPÓSITO GENERAL
Hook que detecta combinaciones de teclas y ejecuta callbacks.

## API

### useHotkey(keys, ref = null, handleKeyDown = null, focusRequired = false)
- Parámetros:
  - keys: array - Array de teclas (ej: ['Control', 'S'])
  - ref: React.Ref - Referencia al elemento (opcional)
  - handleKeyDown: function - Callback al presionar
  - focusRequired: boolean - Requiere que ref esté focused
- Devuelve: ref para asignar al elemento

## FUNCIONALIDADES

### Teclas soportadas
- Letras: 'A', 'B', etc
- Números: '0', '1', etc
- Modificadores: 'Control', 'Shift', 'Alt'
- Especiales: 'Enter', 'Escape', 'ArrowUp', etc

### Lógica
- TODAS las teclas deben estar presionadas
- AND logic (Ctrl+S = Control Y S)
- preventDefault automático
- Focus al elemento si ref disponible

### Casos
- Sin ref: escucha en todo el documento
- Con ref + focusRequired=true: solo si ref tiene focus
- Con ref + focusRequired=false: siempre escucha

## CASOS DE USO
- Ctrl+S para guardar
- Esc para cerrar modal
- ArrowUp/Down para navegar

---

## NUEVAS CARACTERÍSTICAS

- [ ] Secuencias de teclas
- [ ] Debounce
- [ ] Timeout
- [ ] Historial de hotkeys
- [ ] Conflicto detection
