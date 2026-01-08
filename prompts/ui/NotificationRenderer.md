PROMPT IDEAL PARA REGENERAR NotificationRenderer.jsx

## PROPÓSITO GENERAL
Componente que renderiza todas las notificaciones de error del sistema usando ErrorNotification.

## FUNCIONALIDADES
- Lee array de notificaciones del contexto
- Renderiza cada una como ErrorNotification
- Maneja cierre individual

## COMPORTAMIENTO
- Cliente únicamente ('use client')
- Usa useErrorNotification hook
- Loop map sobre notifications
- Key por notification.id

## ESTRUCTURA
- Fragment wrapper <>
- Map de array notifications
- ErrorNotification con props: message, duration, onClose

## ESTILOS
- Sin estilos propios (delegado a ErrorNotification)

---

## NUEVAS CARACTERÍSTICAS

- [ ] Animation transitions
- [ ] Grouping de errores similares
- [ ] Sonidos
- [ ] Categories de errors
