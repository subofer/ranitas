PROMPT IDEAL PARA REGENERAR useMyParams hook

## PROPÓSITO GENERAL
Hook que obtiene parámetros de URL y proporciona utilities para working con ellos.

## API

### useMyParams()
- Sin parámetros
- Devuelve: { params, setParam, clearParam, getParam }

## RETORNOS

### params
- object con todos los parámetros

### setParam(key, value)
- Actualiza parámetro en URL
- Usa router.push

### clearParam(key)
- Elimina parámetro de URL

### getParam(key, defaultValue)
- Obtiene valor de parámetro

## FUNCIONALIDADES
- Lectura de query params
- Actualización de URL
- Parsing automático
- History management

---

## NUEVAS CARACTERÍSTICAS

- [ ] Array params
- [ ] JSON params
- [ ] History back support
- [ ] Validation
