# Organización Modular del Código - IA Components

## 📁 Estructura de Archivos Creada

```
lib/
├── formatters.js                    # Utilidades de formato compartidas
└── ia/
    ├── constants.js                 # Constantes de IA
    └── hooks/
        ├── index.js                 # Exportación centralizada de hooks
        ├── useImageAutoFocus.js     # Hook de auto-enfoque de imágenes
        └── useImageTransformations.js # Hook de transformaciones de imagen

app/components/ia/
├── IaImage.jsx                      # Componente principal (simplificado)
├── IaPromp.jsx                      # Componente principal de prompts
└── components/
    ├── index.js                     # Exportación centralizada
    ├── CampoEditable.jsx            # Campo editable inline
    ├── RangeControl.jsx             # Control de rango
    ├── ImageControlsOverlay.jsx     # Overlay de controles de imagen
    ├── AlertaFacturaDuplicada.jsx   # Alerta de duplicados
    ├── ResultadoBusquedaProveedor.jsx # Resultado de búsqueda
    ├── PedidosRelacionados.jsx      # Lista de pedidos
    ├── EncabezadoFactura.jsx        # Encabezado de factura
    ├── TotalesFactura.jsx           # Totales de factura
    ├── ProductoItem.jsx             # Item de producto
    ├── ListaProductos.jsx           # Lista de productos
    └── LoadingSkeletons.jsx         # Skeletons de carga
```

## 🎯 Beneficios de la Reorganización

### 1. **Reutilización de Código**
- ✅ Utilidades de formato compartidas (`formatters.js`)
- ✅ Hooks personalizados reutilizables
- ✅ Componentes independientes y testeables

### 2. **Mantenibilidad**
- ✅ Archivos pequeños y enfocados (promedio 50-150 líneas)
- ✅ Responsabilidad única por archivo
- ✅ Fácil navegación y búsqueda

### 3. **Escalabilidad**
- ✅ Estructura clara para agregar nuevos componentes
- ✅ Importaciones centralizadas con archivos index
- ✅ Separación entre lógica (hooks) y presentación (componentes)

### 4. **Reducción de Tamaño**
- ❌ Antes: IaImage.jsx con **1375 líneas**
- ✅ Ahora: IaImage.jsx con **~450 líneas** + componentes modulares

## 📊 Comparativa de Tamaños

| Archivo | Antes | Después | Reducción |
|---------|-------|---------|-----------|
| IaImage.jsx | 1375 líneas | ~450 líneas | 67% |
| IaPromp.jsx | 164 líneas | ~200 líneas (más organizado) | Refactorizado |

## 🔧 Utilidades Compartidas Unificadas

### `lib/formatters.js`
Funciones de formato usadas en múltiples partes de la app:
- `formatCurrency()` - Formato de moneda argentina
- `formatDate()` - Formato de fecha
- `formatDateTime()` - Formato de fecha y hora
- `formatPercentage()` - Formato de porcentaje

**Archivos actualizados para usar utilidades compartidas:**
- ✅ `app/components/ia/IaImage.jsx`
- ✅ `app/(paginas)/facturas/page.jsx`
- 🔄 Pendientes: `app/(paginas)/pendientes/page.jsx`, `app/(paginas)/audit/page.jsx`

### `lib/ia/constants.js`
Constantes específicas de IA:
- `DEFAULT_ADJUSTMENTS` - Ajustes por defecto de imagen
- `MODES` - Modos de análisis

### `lib/ia/hooks/`
Hooks personalizados de IA:
- `useImageAutoFocus` - Lógica de auto-enfoque (150 líneas)
- `useImageTransformations` - Transformaciones de canvas (45 líneas)

## 🎨 Componentes Separados

### Componentes de UI Genéricos
- **CampoEditable**: Campo con edición inline (75 líneas)
- **RangeControl**: Control de rango deslizable (30 líneas)
- **ImageControlsOverlay**: Panel de controles de imagen (95 líneas)

### Componentes de Factura
- **AlertaFacturaDuplicada**: Alerta de duplicados (25 líneas)
- **ResultadoBusquedaProveedor**: Card de proveedor (50 líneas)
- **PedidosRelacionados**: Lista de pedidos (40 líneas)
- **EncabezadoFactura**: Header de factura (85 líneas)
- **TotalesFactura**: Sección de totales (45 líneas)
- **ProductoItem**: Item de producto (145 líneas)
- **ListaProductos**: Contenedor de productos (45 líneas)

### Componentes de Estado
- **LoadingSkeletons**: Skeletons animados (15 líneas)

## 📝 Patrón de Importación

### Antes (sin organizar):
```javascript
// Todo en un archivo gigante
const formatCurrency = (value) => ...
const formatDate = (date) => ...
function useImageAutoFocus() { ... }
function CampoEditable() { ... }
// ... 1000+ líneas más
```

### Después (organizado):
```javascript
// Importaciones limpias y organizadas
import { formatCurrency, formatDate } from '@/lib/formatters'
import { DEFAULT_ADJUSTMENTS, MODES } from '@/lib/ia/constants'
import { useImageAutoFocus, useImageTransformations } from '@/lib/ia/hooks'
import {
  CampoEditable,
  ImageControlsOverlay,
  AlertaFacturaDuplicada,
  // ... otros componentes
} from './components'
```

## 🚀 Próximos Pasos Sugeridos

1. **Actualizar archivos restantes** para usar `formatters.js`:
   - `app/(paginas)/pendientes/page.jsx`
   - `app/(paginas)/audit/page.jsx`

2. **Crear más utilidades compartidas**:
   - `lib/validators.js` - Validaciones comunes
   - `lib/helpers.js` - Funciones helper generales

3. **Extraer más componentes comunes**:
   - Botones reutilizables
   - Cards genéricos
   - Modales

4. **Tests unitarios**:
   - Ahora es más fácil testear cada componente por separado
   - Hooks personalizados son testeables independientemente

## ✅ Verificación

- ✅ Sin errores de compilación
- ✅ Sin errores de linting
- ✅ Funcionalidad preservada
- ✅ Importaciones correctas
- ✅ Estructura clara y mantenible

## 📦 Archivos de Respaldo

- `app/components/ia/IaImage.backup.jsx` - Primera versión refactorizada
- `app/components/ia/IaImage.backup-v2.jsx` - Versión antes de modularizar
- `app/components/ia/IaPromp.backup.jsx` - Versión original de IaPromp
