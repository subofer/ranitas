# Auditoría de Login 🔒

Descripción corta:
- Esta feature registra accesos a la página de `login` (visitas) y **todos** los intentos de login (válidos e inválidos) usando el sistema de auditoría existente.

Detalles técnicos:
- Usa el helper de auditoría central en `lib/actions/audit.js` (`createAuditLog` / `auditAction`). ✅
- Dos eventos registrados:
  - `AUTH_LOGIN_PAGE_ACCESS` (level: INFO, category: AUTH): cuando se accede a la página de login (se almacena la IP).
  - `AUTH_LOGIN_ATTEMPT` (level: WARNING | SUCCESS, category: AUTH): cuando se intenta iniciar sesión (se registra si falló o tuvo éxito, username, ip y `userId` cuando aplica).

Configuración:
- Flag de activación: `audit.login.enabled` (tipo: JSON/bool) guardado en la tabla `Setting`.
- Puedes cambiarlo desde la página de **Configuración** en la app o usando el endpoint `/api/settings`.
- Por defecto (seed) se crea con `true` en el `prisma/seed.js`.

Implementación:
- Acceso a la página: `app/(public)/login/page.jsx` (server component) lee la cabecera `x-forwarded-for` / `x-real-ip` y, si `audit.login.enabled` está activado, hace `console.log` y crea un `auditAction` con `AUTH_LOGIN_PAGE_ACCESS`.
- Intentos de login: `lib/sesion/sesion.js` se actualizó para aceptar `{ ip, auditEnabled }` y registrar `AUTH_LOGIN_ATTEMPT` (fallidos y exitosos).

Notas:
- Se reutiliza el sistema de auditoría ya existente para evitar duplicación.
- Los logs de auditoría quedan en la tabla `AuditLog` (modelo Prisma `AuditLog`).

Si necesitas, puedo añadir un filtro en la UI de Auditoría para ver sólo `category: AUTH` o acciones `AUTH_LOGIN_ATTEMPT` y `AUTH_LOGIN_PAGE_ACCESS`.
