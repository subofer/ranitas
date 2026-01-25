# Refactorización de IaImage.jsx

## Resumen de cambios

Se ha refactorizado el componente `IaImage.jsx` siguiendo las mejores prácticas de desarrollo senior, reduciendo el boilerplate y mejorando la mantenibilidad del código sin alterar funcionalidades ni apariencia.

## Mejoras implementadas

### 1. **Constantes extraídas**
- `DEFAULT_ADJUSTMENTS`: Valores por defecto de ajustes de imagen
- `MODES`: Configuración de modos de análisis
- Funciones de formato: `formatCurrency()`, `formatDate()`

### 2. **Hooks personalizados**
- `useImageAutoFocus()`: Encapsula la lógica de auto-enfoque de imágenes
- `useImageTransformations()`: Maneja las transformaciones de canvas (contraste, brillo, zoom, pan)

### 3. **Componentes extraídos**

#### Componentes de UI reutilizables:
- `CampoEditable`: Campo con edición inline
- `RangeControl`: Control de rango deslizable genérico
- `ImageControlsOverlay`: Overlay de controles de imagen

#### Componentes de presentación:
- `AlertaFacturaDuplicada`: Alerta de factura duplicada
- `ResultadoBusquedaProveedor`: Muestra resultado de búsqueda de proveedor
- `PedidosRelacionados`: Lista de pedidos relacionados
- `EncabezadoFactura`: Encabezado con datos de documento y emisor
- `TotalesFactura`: Sección de totales
- `ProductoItem`: Item individual de producto
- `ListaProductos`: Lista completa de productos con lógica
- `LoadingSkeletons`: Skeletons de carga

### 4. **Mejoras de código**

#### Antes:
- 1393 líneas en un solo componente
- Lógica mezclada con presentación
- Código repetitivo (4 controles de rango idénticos)
- Difícil de mantener y testear

#### Después:
- Componente principal más limpio y enfocado
- Lógica separada en hooks personalizados
- Componentes reutilizables y testeables
- Mejor organización y lectura del código

### 5. **Estructura del archivo**

```
========== CONSTANTES ==========
- Configuración y valores por defecto

========== UTILIDADES ==========
- Funciones de formato

========== HOOKS PERSONALIZADOS ==========
- useImageAutoFocus
- useImageTransformations

========== COMPONENTES ==========
- Componentes de UI
- Componentes de presentación

========== COMPONENTE PRINCIPAL ==========
- IaImage (orquestador principal)
```

## Beneficios

1. **Mantenibilidad**: Cambios en un componente no afectan al resto
2. **Reusabilidad**: Componentes como `RangeControl` se pueden usar en otros lugares
3. **Testabilidad**: Hooks y componentes se pueden testear de forma aislada
4. **Lectura**: Código más limpio y fácil de entender
5. **Performance**: Mejor uso de `useCallback` y `useMemo` donde corresponde
6. **Consistencia**: Patrones consistentes en todo el código

## Archivos

- **Original**: `IaImage.backup.jsx` (respaldo)
- **Refactorizado**: `IaImage.jsx` (activo)

## Verificación

✅ Sin errores de linting
✅ Sin errores de compilación
✅ Funcionalidad preservada
✅ Apariencia sin cambios
