PROMPT IDEAL PARA REGENERAR useParentForm hook

## PROPÓSITO GENERAL
Hook que detecta el formulario padre y se suscribe a eventos reset y change.

## API

### useParentForm()
- Sin parámetros
- Devuelve: { refPadre, reset }

## RETORNOS

### refPadre
- useRef que se debe asignar a un elemento dentro del form
- Se usa para encontrar el form más cercano

### reset
- boolean que cambia cuando se dispara evento reset
- Se puede usar como dependency para reaccionar

## FUNCIONALIDADES
- Busca form más cercano hacia arriba
- Escucha evento 'reset'
- Escucha evento 'change'
- Auto-cleanup de listeners
- Estado compartido de reset

## CASOS DE USO
- Reset de inputs cuando se resetea el form
- Sincronización de componentes
- Propagación de eventos

---

## NUEVAS CARACTERÍSTICAS

- [ ] Validación on change
- [ ] Dirty state tracking
- [ ] Form data collection
- [ ] Submit handling
