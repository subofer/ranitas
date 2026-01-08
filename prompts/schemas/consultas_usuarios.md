PROMPT IDEAL PARA CONSULTAS DE USUARIOS (usuarios.js)

## PROPÓSITO GENERAL
Funciones server-side para gestionar usuarios y autenticación.

## FUNCIONES PRINCIPALES

### getUsuarios()
- Obtiene todos los usuarios
- Include: pedidos creados
- OrderBy: nombre ASC
- Retorna: array de usuarios

### getUsuarioById(id)
- Obtiene usuario específico
- Include: pedidos

### getUsuarioByEmail(email)
- Busca usuario por email
- Retorna: usuario único o null
- Usado en login

### getUsuarioByNombre(nombre)
- Busca usuario por nombre
- Retorna: usuario único o null

### crearUsuario(datos)
- Crea nuevo usuario
- Parámetros:
  - nombre: String (UNIQUE)
  - email: String (UNIQUE)
  - password: String (hasheado con bcrypt)
  - nivel: Int (1=admin, 2=gerente, 3=operario) - default: 1
- Validaciones: email válido, contraseña >= 8 caracteres
- Retorna: usuario creado (SIN password)

### actualizarUsuario(id, datos)
- Actualiza usuario
- Campos: email, nivel, nombre
- NO permite cambiar password desde aquí

### cambiarPassword(idUsuario, passwordAntigua, passwordNueva)
- Cambia contraseña del usuario
- Validación: passwordAntigua correcta
- Validación: passwordNueva >= 8 caracteres
- Retorna: confirmación

### verificarPassword(idUsuario, password)
- Verifica si password es correcto
- Usado en login
- Retorna: boolean

### borrarUsuario(id)
- Elimina usuario
- Validación: no tiene pedidos activos
- O: reasignar pedidos a otro usuario

### verificarPermiso(idUsuario, nivelRequerido)
- Verifica si usuario tiene nivel suficiente
- Retorna: boolean

## NIVELES DE ACCESO

```
nivel 1: ADMIN (acceso total)
nivel 2: GERENTE (acceso a reportes y edición)
nivel 3: OPERARIO (acceso básico, solo ver)
```

## VALIDACIONES

- Nombre único
- Email único y válido
- Contraseña mínimo 8 caracteres
- Nivel válido (1, 2, 3)

---

## NUEVAS CARACTERÍSTICAS

- [ ] 2FA (two-factor authentication)
- [ ] Roles más granulares
- [ ] Auditoría de acciones
- [ ] Bloqueo después N intentos fallidos
- [ ] Expiración de sesión
- [ ] Historial de logins
