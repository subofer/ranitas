PROMPT IDEAL PARA REGENERAR SelectUnidades.jsx

## PROPÓSITO GENERAL
Componente servidor que obtiene unidades de medida y las pasa a cliente para selector.

## FUNCIONALIDADES
- Server component
- Fetch unidades de BD
- Wrapper alrededor de SelectUnidadesClient

## PROPS PASADAS A CLIENT
- options: array de unidades
- valueField: "id"
- textField: "nombre"
- ...props

## DATOS ESPERADOS
Unidades con estructura:
```
{
  id: number,
  nombre: string,
  abreviatura: string,
  ...otros
}
```

---

## NUEVAS CARACTERÍSTICAS

- [ ] Búsqueda por abreviatura
- [ ] Conversión entre unidades
- [ ] Cache
