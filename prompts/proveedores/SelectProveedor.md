PROMPT IDEAL PARA REGENERAR SelectProveedor.jsx

## PROPÓSITO GENERAL
Componente servidor que obtiene proveedores y los pasa a cliente para selector.

## FUNCIONALIDADES
- Server component
- Fetch proveedores de BD
- Wrapper alrededor de SelectProveedorClient

## PROPS PASADAS A CLIENT
- options: array de proveedores
- valueField: "id"
- textField: "nombre"
- ...props

## DATOS ESPERADOS
Proveedores con estructura:
```
{
  id: number,
  nombre: string,
  ...otros
}
```

---

## NUEVAS CARACTERÍSTICAS

- [ ] Filtro activos/inactivos
- [ ] Ordenamiento alfabético
- [ ] Cache
