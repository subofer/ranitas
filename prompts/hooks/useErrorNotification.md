PROMPT IDEAL PARA REGENERAR useErrorNotification hook

## PROPÓSITO GENERAL
Hook personalizado que proporciona sistema de notificaciones de error con Context API.

## FUNCIONES PRINCIPALES

### ErrorNotificationProvider (componente)
- Componente wrapper para la app
- Proporciona context a toda la app
- Estado: notifications array

### useErrorNotification hook
- Se usa dentro de componentes
- Devuelve: { showError, closeError, notifications }

## API

### showError(message, duration = 5000)
- Parámetros:
  - message: string - Texto del error
  - duration: number - Tiempo antes de auto-cerrar (0 = no auto-cierra)
- Devuelve: id (número) para referencia

### closeError(id)
- Cierra notificación específica
- Parámetro: id del error

### notifications
- Array de errores actuales
- Cada uno tiene: {id, message, duration}

## FUNCIONALIDADES
- Stack de errores
- Auto-cierre después de duration
- Cierre manual
- Context integrado
- Error boundary

---

## NUEVAS CARACTERÍSTICAS

- [ ] Tipos de notificación (success, warning, info)
- [ ] Posiciones personalizables
- [ ] Sonidos
- [ ] Persistencia
- [ ] Prioridades
