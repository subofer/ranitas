# 📚 Índice de Utilidades y Componentes Compartidos

## Utilidades (`lib/`)

### 📊 `lib/formatters.js`
Funciones de formato para toda la aplicación.

**Exporta:**
- `formatCurrency(value)` - Formatea números como moneda argentina
- `formatDate(date)` - Formatea fechas (ej: "24/01/2026")
- `formatDateTime(date)` - Formatea fecha y hora
- `formatPercentage(value, isDecimal)` - Formatea porcentajes

**Uso:**
```javascript
import { formatCurrency, formatDate } from '@/lib/formatters'

formatCurrency(1234.56) // "$1.234,56"
formatDate(new Date()) // "24/01/2026"
```

---

### 🤖 `lib/ia/constants.js`
Constantes para procesamiento de imágenes con IA.

**Exporta:**
- `DEFAULT_ADJUSTMENTS` - Ajustes por defecto de imagen
- `MODES` - Modos de análisis (factura, producto, general)

**Uso:**
```javascript
import { DEFAULT_ADJUSTMENTS, MODES } from '@/lib/ia/constants'
```

---

### 🎣 `lib/ia/hooks/`
Hooks personalizados para IA.

#### `useImageAutoFocus()`
Auto-enfoca y recorta documentos en imágenes.
```javascript
import { useImageAutoFocus } from '@/lib/ia/hooks'

const autoEnfocar = useImageAutoFocus()
await autoEnfocar(file, preview, setFile, setPreview)
```

#### `useImageTransformations(preview, imgRef, canvasRef, ajustes)`
Aplica transformaciones a imágenes (contraste, brillo, zoom, pan).
```javascript
import { useImageTransformations } from '@/lib/ia/hooks'

const aplicar = useImageTransformations(preview, imgRef, canvasRef, ajustes)
aplicar()
```

---

## Componentes IA (`app/components/ia/components/`)

### 🎨 Componentes de UI

#### `<CampoEditable />`
Campo editable inline con auditoría.
```jsx
<CampoEditable 
  valor={data.nombre}
  path="nombre"
  tipo="text"
  formatear={formatCurrency}
  onUpdate={handleUpdate}
/>
```

#### `<RangeControl />`
Control de rango deslizable.
```jsx
<RangeControl
  label="Contraste"
  icon="🎨"
  value={100}
  onChange={(e) => setValue(e.target.value)}
  min={0}
  max={200}
  color="blue"
/>
```

#### `<ImageControlsOverlay />`
Overlay de controles de imagen.
```jsx
<ImageControlsOverlay
  ajustes={ajustes}
  setAjustes={setAjustes}
  onApply={aplicar}
  onReset={resetear}
  onCancel={cancelar}
/>
```

---

### 📄 Componentes de Factura

#### `<AlertaFacturaDuplicada />`
Muestra alerta si la factura está duplicada.
```jsx
<AlertaFacturaDuplicada factura={facturaDuplicada} />
```

#### `<ResultadoBusquedaProveedor />`
Resultado de búsqueda de proveedor.
```jsx
<ResultadoBusquedaProveedor proveedorEncontrado={proveedor} />
```

#### `<PedidosRelacionados />`
Lista de pedidos relacionados.
```jsx
<PedidosRelacionados pedidos={pedidos} />
```

#### `<EncabezadoFactura />`
Encabezado con datos de documento y emisor.
```jsx
<EncabezadoFactura 
  documento={data.documento}
  emisor={data.emisor}
  proveedorEncontrado={proveedor}
  CampoEditable={CampoEditableWrapper}
/>
```

#### `<TotalesFactura />`
Sección de totales.
```jsx
<TotalesFactura 
  totales={data.totales}
  CampoEditable={CampoEditableWrapper}
/>
```

#### `<ProductoItem />`
Item individual de producto.
```jsx
<ProductoItem 
  producto={item}
  index={i}
  productosBuscados={busquedas}
  buscandoDatos={loading}
  CampoEditable={CampoEditableWrapper}
/>
```

#### `<ListaProductos />`
Lista completa de productos.
```jsx
<ListaProductos 
  items={data.items}
  productosBuscados={busquedas}
  buscandoDatos={loading}
  CampoEditable={CampoEditableWrapper}
/>
```

---

### ⏳ Componentes de Estado

#### `<LoadingSkeletons />`
Skeletons de carga animados.
```jsx
<LoadingSkeletons />
```

---

## 📦 Importación Centralizada

Todos los componentes se pueden importar desde el índice:

```javascript
import {
  CampoEditable,
  RangeControl,
  ImageControlsOverlay,
  AlertaFacturaDuplicada,
  ResultadoBusquedaProveedor,
  PedidosRelacionados,
  EncabezadoFactura,
  TotalesFactura,
  ProductoItem,
  ListaProductos,
  LoadingSkeletons
} from '@/app/components/ia/components'
```

O hooks:

```javascript
import { useImageAutoFocus, useImageTransformations } from '@/lib/ia/hooks'
```

---

## 🔍 Dónde Usar Qué

### Necesitas formatear moneda/fecha?
→ `import { formatCurrency, formatDate } from '@/lib/formatters'`

### Trabajas con imágenes de IA?
→ `import { useImageAutoFocus } from '@/lib/ia/hooks'`

### Necesitas controles de imagen?
→ `import { ImageControlsOverlay, RangeControl } from '@/app/components/ia/components'`

### Mostrando datos de factura?
→ `import { EncabezadoFactura, TotalesFactura, ListaProductos } from '@/app/components/ia/components'`

### Campo editable con auditoría?
→ `import { CampoEditable } from '@/app/components/ia/components'`
