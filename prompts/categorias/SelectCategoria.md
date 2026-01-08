PROMPT IDEAL PARA REGENERAR SelectCategoria.jsx

## PROPÓSITO GENERAL
Componente servidor que obtiene categorías y las pasa a SelectCategoriaClient para selector dropdown.

## FUNCIONALIDADES
- Server component ("use server" implícito)
- Fetch categorías de BD
- Wrapper alrededor de SelectCategoriaClient

## PROPS PASADAS A CLIENT
- options: array de categorías
- valueField: "id"
- textField: "nombre"
- ...props: cualquier otra prop

## DATOS ESPERADOS
Categorías con estructura:
```
{
  id: number,
  nombre: string,
  ...otros campos
}
```

## MANEJO DE ERRORES
- Try/catch en consulta
- Si no hay datos: empty array

---

## NUEVAS CARACTERÍSTICAS

- [ ] Filtro por activa
- [ ] Ordenamiento custom
- [ ] Cache de datos
