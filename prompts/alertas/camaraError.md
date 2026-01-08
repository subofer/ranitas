PROMPT IDEAL PARA REGENERAR camaraError.jsx

## PROPÓSITO GENERAL
Alerta de error cuando fallan permisos o acceso a cámara.

## PROPS
- error: Error - Objeto de error
- action?: function - Callback retry

## FUNCIONALIDADES

### Display
- Mensaje de error descriptivo
- Icono camera-slash
- Instrucciones para otorgar permisos

### Tipos de error
- PermissionDenied
- NotFoundError (sin cámara)
- NotAllowedError (usuario rechazó)
- Otros

### Botones
- Reintentar (si applicable)
- Cerrar

---

## NUEVAS CARACTERÍSTICAS

- [ ] Links a settings
- [ ] Debugging info
- [ ] Historial errores
