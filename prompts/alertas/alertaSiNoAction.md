PROMPT IDEAL PARA REGENERAR alertaSiNoAction.jsx

## PROPÓSITO GENERAL
Alerta genérica SweetAlert2 de confirmación Sí/No reutilizable.

## FUNCIÓN
export const alertaSiNoAcction = async (config) => {...}

## CONFIG ESPERADO
```
{
  title: string,
  text?: string,
  html?: string,
  icon?: 'warning' | 'error' | 'success' | 'info' | 'question',
  confirmButtonText?: string,
  cancelButtonText?: string,
  confirmButtonColor?: string,
  cancelButtonColor?: string
}
```

## RETORNO
Promise con { isConfirmed: boolean }

## CASOS DE USO
- Confirmaciones genéricas
- Alertas de peligro
- Confirmación de acciones

---

## NUEVAS CARACTERÍSTICAS

- [ ] Campos custom
- [ ] Input validation
- [ ] Callbacks
