# Sistema de Alias para Proveedores

## Descripción General

Sistema que permite vincular nombres escaneados (que no se encontraron) con proveedores existentes, creando aliases para mejorar el reconocimiento automático en futuras cargas de facturas.

## Problema Resuelto

Cuando el OCR lee mal el nombre de un proveedor (ej: "VALMAIRA S.A." en vez de "Valmaira SA"), el sistema no lo encuentra en la base de datos. Antes, el usuario debía crear un proveedor duplicado o editar manualmente. Ahora puede vincular ese nombre con el proveedor correcto.

## Arquitectura Implementada

### 1. Base de Datos

#### Modelo `AliasContacto`
```prisma
model AliasContacto {
  id           String       @id @default(cuid())
  createdAt    DateTime     @default(now())
  contactoId   String
  contacto     Contactos    @relation(fields: [contactoId], references: [id], onDelete: Cascade)
  alias        String       @unique
  fuente       FuenteAlias  @default(MANUAL)
  activo       Boolean      @default(true)
  observaciones String?
  creadoPor    String?

  @@index([contactoId])
  @@index([alias])
}

enum FuenteAlias {
  MANUAL        // Creado manualmente por usuario
  IA_SCAN       // Detectado automáticamente por IA al escanear
  IMPORTACION   // Importado desde archivo externo
}
```

#### Relaciones
- `Contactos.aliases` → `AliasContacto[]` (relación uno a muchos)
- Cada proveedor puede tener múltiples aliases
- Los aliases son únicos en toda la base de datos

### 2. Server Actions

**Archivo:** `/prisma/serverActions/aliasActions.js`

#### Funciones Principales

##### `buscarContactoPorNombreOAlias(nombreOAlias, soloProveedores)`
Busca un contacto por su nombre, nombre fantasía o alias.
```javascript
// Retorna: { contacto, metodo: 'nombre' | 'nombreFantasia' | 'alias' }
```

##### `crearAliasContacto({ contactoId, alias, fuente, observaciones, creadoPor })`
Crea un nuevo alias para un contacto con validación:
- Verifica que el contacto existe
- Valida que el alias no esté vacío
- Comprueba que no exista otro alias igual
- Registra auditoría

##### `vincularNombreEscaneadoConContacto({ nombreEscaneado, contactoId, observaciones, userId })`
Función especializada para vincular nombres detectados por IA:
- Crea alias con fuente `IA_SCAN`
- Registra observaciones automáticas
- Genera auditoría completa

##### `desactivarAliasContacto(aliasId, userId)`
Desactiva un alias sin eliminarlo:
- Mantiene el registro histórico
- Registra quién y cuándo lo desactivó

### 3. Modificaciones en Búsqueda de Proveedores

**Archivo:** `/prisma/serverActions/facturaActions.js`

La función `buscarProveedor()` ahora busca en:
1. Nombre exacto
2. Nombre fantasía exacto
3. **Aliases activos** (NUEVO)
4. CUIT

```javascript
// Retorna:
{
  proveedor: { ...datosProveedor },
  confianza: 0.95,
  metodo: 'alias', // 'nombre', 'nombreFantasia', 'cuit', o 'alias'
  alternativas: [...]
}
```

Los aliases tienen **prioridad alta** en el cálculo de similitud (bonus 2x en match exacto).

### 4. Componentes UI

#### `ModalVincularProveedor.jsx`

Modal para vincular un nombre escaneado con un proveedor existente.

**Props:**
- `nombreEscaneado`: Nombre detectado por IA que no se encontró
- `isOpen`: Control de visibilidad
- `onCancelar`: Callback al cancelar
- `onVinculado`: Callback al vincular exitosamente `({ proveedor, alias })`

**Funcionalidades:**
- Lista todos los proveedores disponibles
- Búsqueda en tiempo real por nombre, fantasía o CUIT
- Selección visual con checkmark
- Campo de observaciones pre-llenado
- Loading states y manejo de errores
- Llamada a `vincularNombreEscaneadoConContacto()`

#### Modificaciones en `SelectorProveedorSimilar.jsx`

Se agregó:
- Import de `ModalVincularProveedor`
- Estado `mostrarModalVincular`
- Handler `handleProveedorVinculado`
- Botón "🔗 Vincular con Existente" en el footer
- Instancia del modal con props configurados

### 5. API Endpoint

**Archivo:** `/app/api/contactos/route.js`

#### `GET /api/contactos`

Query params:
- `?tipo=proveedor` → Filtra solo proveedores
- `?tipo=cliente` → Filtra solo clientes
- Sin parámetro → Todos los contactos

Retorna:
```json
{
  "ok": true,
  "contactos": [
    {
      "id": "...",
      "nombre": "Valmaira SA",
      "nombreFantasia": "Valmaira",
      "cuit": "30123456789",
      "proveedor": true,
      "cliente": false,
      "marca": false
    }
  ]
}
```

## Flujo de Usuario

### Escenario: Nombre escaneado no encontrado

1. **Usuario carga factura con cámara/upload**
2. **IA procesa y detecta:** "VALMAIRA S.A."
3. **Sistema busca proveedor:**
   - Busca por nombre ❌
   - Busca por nombre fantasía ❌
   - Busca por CUIT ❌
   - Busca por aliases ❌
4. **Se muestra SelectorProveedorSimilar** con:
   - Mensaje: "El proveedor detectado no está registrado"
   - Nombre escaneado destacado
   - Lista de contactos similares (si hay)
   - 3 botones:
     - 🔗 **Vincular con Existente**
     - ➕ Crear Nuevo Contacto
     - ✓ Asociar con [seleccionado]
5. **Usuario hace clic en "Vincular con Existente"**
6. **Se abre ModalVincularProveedor:**
   - Muestra: "VALMAIRA S.A." en banner amarillo
   - Lista de todos los proveedores
   - Buscador en tiempo real
7. **Usuario busca "Valmaira"** → Aparece "Valmaira SA"
8. **Usuario selecciona "Valmaira SA"** → Se marca con ✓
9. **Usuario hace clic en "🔗 Vincular Proveedor"**
10. **Sistema:**
    - Crea alias: `{ alias: "VALMAIRA S.A.", contactoId: "...", fuente: "IA_SCAN" }`
    - Registra auditoría
    - Cierra modal
    - Llama `onVinculado({ proveedor, alias })`
11. **Próxima vez que se escanee "VALMAIRA S.A.":**
    - Búsqueda encuentra alias activo
    - Retorna proveedor "Valmaira SA" automáticamente ✅

## Auditoría

Cada operación con aliases genera un registro en `AuditLog`:

### Crear Alias
```javascript
{
  accion: "CREAR_ALIAS_CONTACTO",
  detalles: {
    aliasId: "...",
    contactoId: "...",
    contactoNombre: "Valmaira SA",
    alias: "VALMAIRA S.A.",
    fuente: "IA_SCAN",
    observaciones: "..."
  },
  userId: "..."
}
```

### Desactivar Alias
```javascript
{
  accion: "DESACTIVAR_ALIAS_CONTACTO",
  detalles: {
    aliasId: "...",
    contactoId: "...",
    alias: "VALMAIRA S.A.",
    motivoDesactivacion: "..."
  },
  userId: "..."
}
```

## Consideraciones de Diseño

### Unicidad de Aliases
- Un alias solo puede apuntar a un contacto
- Si se intenta crear un alias duplicado, se rechaza
- Esto evita ambigüedades en la búsqueda

### Soft Delete
- Los aliases se desactivan (`activo: false`) en vez de eliminarse
- Mantiene el histórico para auditoría
- Los aliases inactivos no se usan en búsquedas

### Fuentes de Aliases
- **MANUAL**: Creado por usuario en interfaz (futuro)
- **IA_SCAN**: Detectado automáticamente al escanear facturas
- **IMPORTACION**: Desde archivos CSV/Excel (futuro)

### Observaciones
- Campo libre para notas del usuario
- Se pre-llena automáticamente con: "Nombre detectado por IA al escanear factura: '[nombre]'"
- El usuario puede modificarlo o agregar más info

## Mejoras Futuras

1. **Panel de Gestión de Aliases**
   - Vista de todos los aliases por proveedor
   - Activar/desactivar desde UI
   - Estadísticas de uso

2. **Sugerencias Automáticas**
   - Al crear alias, sugerir aliases similares existentes
   - Evitar duplicados semánticos ("VALMAIRA S.A." vs "Valmaira SA")

3. **Aprendizaje por Uso**
   - Registrar frecuencia de uso de cada alias
   - Priorizar aliases más usados en búsqueda

4. **Normalización Automática**
   - Al crear alias, normalizar (quitar puntos, mayúsculas, etc)
   - Detectar variaciones comunes automáticamente

5. **Exportar/Importar Aliases**
   - Backup de aliases configurados
   - Compartir entre instancias del sistema

6. **Alertas de Conflictos**
   - Notificar si un nombre escaneado es muy similar a varios proveedores
   - Sugerir revisión manual

## Testing

### Casos de Prueba

1. **Crear alias simple**
   - Escanear factura con nombre no encontrado
   - Vincular con proveedor existente
   - Verificar creación en BD

2. **Búsqueda por alias**
   - Crear alias manualmente en BD
   - Escanear factura con ese nombre
   - Verificar que encuentra el proveedor automáticamente

3. **Alias duplicado**
   - Intentar crear alias que ya existe
   - Verificar que se rechaza con error

4. **Desactivar alias**
   - Crear alias activo
   - Desactivarlo
   - Verificar que no se usa en búsquedas

5. **Prioridad de búsqueda**
   - Crear proveedor "Valmaira SA"
   - Crear alias "VALMAIRA" para ese proveedor
   - Buscar "VALMAIRA"
   - Verificar que retorna el proveedor con `metodo: 'alias'`

## Archivos Modificados/Creados

### Creados
- `/app/components/ia/components/ModalVincularProveedor.jsx`
- `/prisma/serverActions/aliasActions.js`
- `/prisma/migrations/20260126053948_agregar_alias_contactos/migration.sql`

### Modificados
- `/prisma/schema.prisma` (modelo AliasContacto, enum FuenteAlias)
- `/app/components/ia/SelectorProveedorSimilar.jsx` (integración modal)
- `/app/components/ia/components/index.js` (export)
- `/app/api/contactos/route.js` (GET endpoint)
- `/prisma/serverActions/facturaActions.js` (búsqueda por alias)

## Migración Aplicada

```bash
npx prisma migrate dev --name agregar_alias_contactos
```

Estado: ✅ Aplicada exitosamente

## Conclusión

El sistema de aliases permite que el OCR imperfecto no sea un bloqueante para la carga automática de facturas. Los usuarios pueden vincular rápidamente nombres escaneados con proveedores existentes, y el sistema aprende de estas vinculaciones para mejorar la precisión en futuras cargas.
