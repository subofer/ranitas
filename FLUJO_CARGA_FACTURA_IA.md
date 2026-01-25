# Flujo de Carga de Factura con IA

## Resumen Ejecutivo

Este documento describe el flujo completo de trabajo para la carga de facturas utilizando IA, desde la captura de imagen hasta el registro en el sistema, incluyendo el manejo de alias de productos por proveedor.

## Objetivos del Sistema

1. **Automatizar la captura**: Usar IA para extraer datos de imágenes de facturas
2. **Gestión de Alias**: Mantener mapeo entre productos del proveedor y productos internos
3. **Proceso Manual de Mapeo**: El usuario decide cuándo y cómo mapear productos
4. **Stock Parcial**: Permitir guardar facturas con productos sin mapear
5. **Trazabilidad**: Mantener registro de productos pendientes de clasificación

---

## Flujo Actual (Antes de Cambios)

### 1. Captura de Factura (IaImage.jsx)
- Usuario sube imagen de factura
- IA analiza y extrae datos (Ollama)
- Sistema busca proveedor automáticamente
- **PROBLEMA**: Se crean alias automáticamente sin intervención del usuario
- Muestra productos inferidos

### 2. Carga Manual (/compras - CargarFacturaClient.jsx)
- Usuario selecciona proveedor
- Carga alias del proveedor
- Para cada ítem:
  - Busca alias existente
  - Si no existe, permite crear alias manualmente
  - Si alias no tiene producto, permite mapear
  - Si no hay producto, marca como "descripcionPendiente"
- Guarda factura
- Productos mapeados → actualiza stock
- Productos sin mapear → quedan pendientes

### 3. Sistema de Alias (aliasesProveedor.js)
- `upsertAliasPresentacionProveedor`: Crea/actualiza alias
- `getAliasesProveedor`: Obtiene aliases de un proveedor
- Modelo: `ProveedorSkuAlias`
  - proveedorId
  - sku
  - nombreEnProveedor
  - productoId (nullable)
  - presentacionId (nullable)

---

## Nuevo Flujo Propuesto

### FASE 1: Análisis IA de Factura

#### IaImage.jsx - Captura y Extracción
```
1. Usuario sube imagen
2. IA extrae datos:
   - Proveedor (CUIT, nombre)
   - Número de factura
   - Fecha
   - Items:
     * código/SKU
     * descripción
     * cantidad
     * precio unitario
     * subtotal
   - Totales
3. Sistema busca proveedor en BD
4. Para cada item, busca alias EXISTENTES:
   - Por SKU del proveedor
   - Por descripción del proveedor
5. NO CREA NADA automáticamente
```

#### Visualización de Resultados

**Items CON alias mapeado:**
```jsx
🟢 Aceite de Girasol 1.5L
   └─ Mapeado a: Aceite Girasol Cocinero 1.5L [Presentación: Botella 1.5L]
   Precio: $1.250,00 | Cantidad: 12
```

**Items CON alias SIN mapear:**
```jsx
🟡 Aceite Mezcla 900ml
   └─ Alias guardado sin producto asociado
   [Mapear producto] [Ver detalles]
   Precio: $980,00 | Cantidad: 24
```

**Items SIN alias:**
```jsx
⚪ Arroz Integral 1kg
   └─ Producto no registrado
   [Crear alias] [Agregar producto]
   Precio: $850,00 | Cantidad: 18
```

---

### FASE 2: Acciones del Usuario

#### A. Para Items SIN Alias
**Opción 1: Crear Alias (sin mapear)**
- Click en [Crear alias]
- Se guarda en BD:
  ```javascript
  {
    proveedorId: "xxx",
    sku: "ARR-INT-1KG",
    nombreEnProveedor: "Arroz Integral 1kg",
    productoId: null,
    presentacionId: null
  }
  ```
- Item pasa a estado "🟡 CON alias SIN mapear"

**Opción 2: Agregar Producto Nuevo**
- Click en [Agregar producto]
- Redirige a `/productos` (ABM)
- Pre-completa formulario con datos de factura:
  ```javascript
  {
    nombre: "Arroz Integral",
    cantidad_recipiente: 1,
    unidad_medida: "kg",
    // Otros campos inferibles
  }
  ```
- Usuario completa datos faltantes
- Guarda producto
- Regresa a factura
- Permite mapear el alias al nuevo producto

#### B. Para Items CON Alias SIN Mapear
**Opción 1: Mapear a Producto Existente**
- Click en [Mapear producto]
- Abre modal (el que ya existe en CargarFacturaClient.jsx)
- Usuario busca y selecciona:
  - Producto
  - Presentación
- Sistema actualiza alias:
  ```javascript
  {
    ...aliasExistente,
    productoId: "producto_id",
    presentacionId: "presentacion_id"
  }
  ```
- Item pasa a estado "🟢 Mapeado"

**Opción 2: Crear Producto Nuevo**
- Mismo flujo que opción A2

#### C. Para Items CON Alias Mapeado
- ✅ Listos para guardar
- Se computarán en stock al guardar factura

---

### FASE 3: Guardar Factura

#### Botón "Guardar Factura"

Al hacer click, el sistema:

1. **Valida datos obligatorios:**
   - Proveedor identificado
   - Fecha de factura
   - Al menos un item

2. **Construye objeto para guardar:**
```javascript
{
  idProveedor: proveedorId,
  numeroDocumento: numeroFactura,
  fecha: fechaFactura,
  tipoDocumento: tipoInferido,
  estado: "IMPAGA",
  tieneImpuestos: true/false,
  detalles: items.map(item => ({
    aliasId: item.aliasId || null,
    idProducto: item.productoId || null,
    presentacionId: item.presentacionId || null,
    descripcionPendiente: !item.productoId ? item.descripcion : null,
    cantidad: item.cantidad,
    precioUnitario: item.precio_unitario,
    descuento: item.descuento || 0
  }))
}
```

3. **Llama a `guardarFacturaCompra`** (ya existe)

4. **Resultado:**
   - Items mapeados → stock actualizado
   - Items sin mapear → guardados como "pendientes"
   - Factura registrada en BD
   - Auditoría creada

5. **Mensaje al usuario:**
```
✅ Factura guardada exitosamente

📊 Resumen:
- 8 productos con stock actualizado
- 3 productos sin mapear (pendientes)

[Ver factura] [Ver pendientes]
```

---

### FASE 4: Vista de Artículos Sin Listar

Nueva página: `/articulos-sin-listar` o `/pendientes`

#### Tabla Similar a Listado de Archivos

**Columnas:**
- ID Factura
- Fecha
- Proveedor
- Descripción (como viene del proveedor)
- SKU/Código
- Cantidad
- Precio Unitario
- Subtotal
- Estado (Sin Mapear / Revisado / Descartado)
- Acciones

**Funcionalidades:**
- Filtrar por proveedor
- Filtrar por estado
- Buscar por descripción
- Ordenar por fecha, proveedor, etc.

**Acciones por Fila:**
- [Mapear] → Abre modal de mapeo
- [Crear Producto] → Va a ABM con datos precargados
- [Descartar] → Marca como descartado (no es un producto real)
- [Ver Factura Original] → Abre la factura completa

**Vista de Detalles:**
```
Descripción: ACEITE MEZCLA 900ML
SKU Proveedor: ACE-MEZ-900
Proveedor: Distribuidora La Economía S.A.
Precio Histórico: $980 (última compra)
Facturas donde aparece: 3
  - FC-0001-00012345 (12/01/2026) x24 unidades
  - FC-0001-00012298 (05/01/2026) x36 unidades
  - FC-0001-00012187 (28/12/2025) x12 unidades

[Mapear a producto existente] [Crear nuevo producto]
```

---

## Estructura de Datos

### ProveedorSkuAlias
```prisma
model ProveedorSkuAlias {
  id                String          @id @default(cuid())
  proveedorId       String
  proveedor         Contacto        @relation(fields: [proveedorId], references: [id])
  sku               String          // Código del proveedor
  nombreEnProveedor String          // Descripción del proveedor
  productoId        String?         // NULL si no está mapeado
  producto          Producto?       @relation(fields: [productoId], references: [id])
  presentacionId    String?         // NULL si no está mapeado
  presentacion      Presentacion?   @relation(fields: [presentacionId], references: [id])
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  @@unique([proveedorId, sku])
}
```

### DocumentoDetalle (modificado)
```prisma
model DocumentoDetalle {
  id                    String         @id @default(cuid())
  documentoId           String
  documento             Documento      @relation(fields: [documentoId], references: [id])
  aliasId               String?        // Referencia al alias
  alias                 ProveedorSkuAlias? @relation(fields: [aliasId], references: [id])
  productoId            String?        // NULL si no está mapeado
  producto              Producto?      @relation(fields: [productoId], references: [id])
  presentacionId        String?        // NULL si no está mapeado
  presentacion          Presentacion?  @relation(fields: [presentacionId], references: [id])
  descripcionPendiente  String?        // Guardamos descripción si no hay mapeo
  cantidad              Float
  precioUnitario        Float
  descuento             Float          @default(0)
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
}
```

---

## Componentes a Modificar

### 1. IaImage.jsx
**Cambios:**
- ❌ REMOVER: Llamadas automáticas a `procesarItemFactura`
- ✅ AGREGAR: Búsqueda de aliases existentes (solo lectura)
- ✅ AGREGAR: Componente visual con indicadores de estado
- ✅ AGREGAR: Botones de acción por item
- ✅ AGREGAR: Modal de mapeo de alias
- ✅ AGREGAR: Botón "Guardar Factura"
- ✅ AGREGAR: Función para preparar y enviar datos

### 2. ProductoItem.jsx (nuevo componente)
**Responsabilidades:**
- Mostrar estado del item (🟢/🟡/⚪)
- Mostrar datos del item
- Mostrar producto mapeado (si existe)
- Botones de acción según estado
- Expandir/colapsar detalles

### 3. AliasActions.jsx (nuevo componente)
**Responsabilidades:**
- [Crear alias] para items sin alias
- [Mapear producto] para alias sin mapear
- [Agregar producto] para crear nuevo
- Integración con modal de mapeo existente

### 4. ModalMapeoAlias.jsx
**Origen:** Extraer de CargarFacturaClient.jsx
**Responsabilidades:**
- Buscar producto
- Seleccionar presentación
- Confirmar mapeo
- Actualizar alias en BD

### 5. ListaProductosPendientes.jsx (nuevo)
**Ubicación:** Nueva página o sección
**Responsabilidades:**
- Tabla de productos sin mapear
- Filtros y búsqueda
- Acciones en lote
- Exportar a Excel

---

## Server Actions

### Nuevas/Modificadas

#### buscarAliasPorProveedor.js
```javascript
/**
 * Busca aliases existentes para items de factura
 */
export async function buscarAliasesPorItems({ proveedorId, items }) {
  const resultados = []
  
  for (const item of items) {
    const alias = await prisma.proveedorSkuAlias.findFirst({
      where: {
        proveedorId,
        OR: [
          { sku: item.codigo },
          { nombreEnProveedor: { contains: item.descripcion, mode: 'insensitive' } }
        ]
      },
      include: {
        producto: true,
        presentacion: true
      }
    })
    
    resultados.push({
      item,
      alias,
      mapeado: !!(alias?.productoId && alias?.presentacionId),
      tieneAlias: !!alias
    })
  }
  
  return resultados
}
```

#### crearAliasSimple.js
```javascript
/**
 * Crea alias SIN mapear producto
 */
export async function crearAliasSimple({ proveedorId, sku, nombreEnProveedor }) {
  return await prisma.proveedorSkuAlias.create({
    data: {
      proveedorId,
      sku,
      nombreEnProveedor,
      productoId: null,
      presentacionId: null
    }
  })
}
```

#### mapearAliasAProducto.js
```javascript
/**
 * Actualiza alias con mapeo a producto/presentación
 */
export async function mapearAliasAProducto({ aliasId, productoId, presentacionId }) {
  return await prisma.proveedorSkuAlias.update({
    where: { id: aliasId },
    data: {
      productoId,
      presentacionId
    }
  })
}
```

#### obtenerArticulosSinMapear.js
```javascript
/**
 * Obtiene todos los detalles de documentos sin producto mapeado
 */
export async function obtenerArticulosSinMapear({ proveedorId, estado }) {
  return await prisma.documentoDetalle.findMany({
    where: {
      productoId: null,
      descripcionPendiente: { not: null },
      documento: {
        proveedor: proveedorId ? { id: proveedorId } : undefined
      }
    },
    include: {
      documento: {
        include: {
          proveedor: true
        }
      },
      alias: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}
```

---

## Casos de Uso

### Caso 1: Factura con todos los productos conocidos
1. Usuario sube factura
2. IA extrae 10 items
3. Todos tienen alias mapeado (🟢)
4. Usuario revisa datos
5. Click en "Guardar Factura"
6. Stock actualizado para los 10 productos
7. ✅ Listo

### Caso 2: Factura con productos nuevos
1. Usuario sube factura
2. IA extrae 8 items
3. 5 tienen alias mapeado (🟢)
4. 3 no tienen alias (⚪)
5. Usuario crea alias para los 3 (🟡)
6. Usuario mapea 2 de los 3 (🟢)
7. 1 queda sin mapear (🟡)
8. Click en "Guardar Factura"
9. Stock actualizado para 7 productos
10. 1 producto queda pendiente
11. ⚠️ Mensaje: "1 producto sin mapear"

### Caso 3: Producto no existe en sistema
1. Usuario sube factura
2. Item "Quinoa Orgánica 500g" no tiene alias
3. Usuario click en [Agregar producto]
4. Redirige a `/productos`
5. Formulario precargado:
   - Nombre: "Quinoa Orgánica"
   - Recipiente: 500g
6. Usuario completa: categoría, marca, etc.
7. Guarda producto
8. Regresa a factura
9. Sistema pregunta: ¿Mapear alias a este producto?
10. Usuario confirma
11. Alias mapeado (🟢)
12. Guarda factura normalmente

---

## Beneficios del Nuevo Flujo

### Para el Usuario
- ✅ **Control total**: Decide qué y cuándo mapear
- ✅ **Flexibilidad**: Puede guardar facturas parcialmente procesadas
- ✅ **Trazabilidad**: Ve historial de productos sin clasificar
- ✅ **Eficiencia**: No pierde tiempo en productos no recurrentes

### Para el Sistema
- ✅ **Datos limpios**: Solo se mapea lo que realmente corresponde
- ✅ **Auditoría completa**: Todo queda registrado
- ✅ **Stock parcial**: No bloquea facturas por falta de mapeos
- ✅ **Escalabilidad**: Fácil agregar nuevos proveedores

### Para el Negocio
- ✅ **Facturación rápida**: No depende de catalogación completa
- ✅ **Reportes precisos**: Distingue productos mapeados vs pendientes
- ✅ **Análisis de compras**: Ve qué compra cada proveedor
- ✅ **Decisiones informadas**: Stats sobre productos más comprados sin catalogar

---

## Próximos Pasos

1. ✅ Commit del trabajo actual
2. 📝 Documentar flujo (este archivo)
3. 🔧 Modificar IaImage.jsx (remover auto-creación)
4. 🎨 Crear componentes visuales (indicadores de estado)
5. 🔗 Integrar modal de mapeo
6. 💾 Implementar guardar factura desde IA
7. 📊 Crear vista de artículos sin listar
8. ✅ Testing completo
9. 📚 Documentar para usuarios

---

## Notas Técnicas

### Performance
- Búsqueda de aliases: indexar por `proveedorId` + `sku`
- Cache de aliases por proveedor en frontend
- Lazy loading en tabla de pendientes

### Seguridad
- Validar proveedorId antes de crear alias
- Evitar duplicados (unique constraint)
- Auditoría de todos los cambios

### UX
- Loading states claros
- Confirmaciones para acciones destructivas
- Atajos de teclado para acciones frecuentes
- Tooltips explicativos

---

**Fecha creación:** 25/01/2026  
**Autor:** Sistema IA + Documentación del flujo actual  
**Versión:** 1.0  
**Estado:** Diseño aprobado - Pendiente implementación
