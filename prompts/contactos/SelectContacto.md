PROMPT IDEAL PARA REGENERAR SelectContacto.jsx

## PROPÓSITO GENERAL
Componente servidor que obtiene contactos y los pasa a cliente para selector dropdown.

## FUNCIONALIDADES
- Server component
- Fetch contactos de BD
- Wrapper alrededor de SelectContactoClient

## PROPS PASADAS A CLIENT
- options: array de contactos
- valueField: "id"
- textField: "nombre"
- ...props

## DATOS ESPERADOS
Contactos con estructura:
```
{
  id: number,
  nombre: string,
  empresa?: string,
  ...otros
}
```

---

## NUEVAS CARACTERÍSTICAS

- [ ] Filtro por empresa
- [ ] Búsqueda por email/teléfono
- [ ] Cache
