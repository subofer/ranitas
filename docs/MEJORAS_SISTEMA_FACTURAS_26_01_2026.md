# Mejoras al Sistema de Análisis de Facturas y Gestión de Productos
**Fecha:** 26/01/2026

## 🎯 Cambios Implementados

### 1. ✅ Optimización del Procesamiento de Imágenes

**Problema:** El procesamiento agresivo de imágenes (escala de grises, normalización, trim, sharpen) estaba arruinando detalles importantes de las facturas, especialmente en el cuadro de totales.

**Solución:**
- Eliminamos las transformaciones agresivas que degradaban la calidad
- Reducimos el pipeline de 6 pasos a solo 2:
  1. **Redimensionar** a múltiplos de 28 (requerido por Qwen2.5-VL)
  2. **Comprimir** como JPEG de calidad 95% (antes era 85%)
- Cambios en `/app/api/ai/image/route.js`:
  ```javascript
  // ANTES: 6 pasos (greyscale, normalize, trim, resize, sharpen, jpeg 85%)
  // AHORA: 2 pasos (resize, jpeg 95%)
  const optimizedBuffer = await image
    .clone()
    .resize(normalized.width, normalized.height, {
      fit: 'inside',
      kernel: 'lanczos3',
      withoutEnlargement: true
    })
    .jpeg({ quality: 95, progressive: false })
    .toBuffer()
  ```

**Beneficios:**
- ✅ Mejor preservación de detalles en números y textos pequeños
- ✅ Mejor captura de totales, descuentos e impuestos
- ✅ Mantiene compatibilidad con Qwen2.5-VL (múltiplos de 28)

---

### 2. ✅ Mejora del Prompt para Captura Completa de Totales

**Problema:** El prompt no capturaba correctamente descuentos, impuestos detallados, flete, cuenta corriente ni deudas previas.

**Solución:**
- Reescribimos completamente el prompt `factura2` para capturar:
  - ✅ **Descuentos detallados** (por ítem, generales, bonificaciones, notas de crédito)
  - ✅ **Impuestos detallados** (IVA 21%/10.5%/27%, Percepciones IIBB por provincia, Percepciones IVA, Impuestos internos)
  - ✅ **Flete/Transporte** por separado
  - ✅ **Cuenta corriente** (saldo anterior, deuda previa, saldo a favor, estado)
  - ✅ **Pagos** (monto pagado, medio de pago, a quién se pagó)
  - ✅ **Deuda total** calculada (total + deuda_previa - monto_pagado)

**Estructura JSON actualizada:**
```json
{
  "documento": {
    "tipo": "",
    "numero": "",
    "fecha": "DD/MM/AAAA",
    "estado_pago": "PAGADO|PARCIAL|PENDIENTE|ANULADO",
    "monto_pagado": 0,
    "medio_pago": "efectivo|transferencia|cheque|cuenta_corriente|etc",
    "anotaciones_marginales": ""
  },
  "cuenta_corriente": {
    "tiene_cuenta": true|false,
    "deuda_previa": 0,
    "saldo_a_favor": 0,
    "estado": "ACTIVA|INACTIVA|DEBE|A_FAVOR",
    "observaciones": ""
  },
  "items": [...],
  "descuentos": [{
    "tipo": "descuento_general|bonificacion|nota_credito",
    "descripcion": "",
    "monto": 0
  }],
  "impuestos": [{
    "tipo": "IVA|PERCEPCION_IIBB|PERCEPCION_IVA|INTERNOS|OTRO",
    "tasa": 21.0,
    "base_imponible": 0,
    "monto": 0,
    "observaciones": ""
  }],
  "otros_cargos": [{
    "tipo": "FLETE|TRANSPORTE|SEGURO|FINANCIACION|OTRO",
    "descripcion": "",
    "monto": 0
  }],
  "totales": {
    "subtotal_items": 0,
    "descuentos_total": 0,
    "recargos_total": 0,
    "subtotal_neto": 0,
    "impuestos_total": 0,
    "total_calculado": 0,
    "total_impreso": 0,
    "diferencia": 0,
    "detalle_diferencia": "",
    "deuda_total": 0,
    "revisar": false
  }
}
```

---

### 3. ✅ Cambio de Nomenclatura: total_real → total_calculado

**Problema:** El término "total_real" era confuso - no era claro si era el total impreso o el calculado.

**Solución:**
- Renombrado global en todo el sistema:
  - `total_real` → `total_calculado`
  - `subtotal_real` → `subtotal_calculado`
- Archivos modificados:
  - `/app/api/ai/image/route.js` (10 ocurrencias)
  - `/app/components/ia/components/TotalesFactura.jsx` (2 ocurrencias)
  - `/app/components/ia/components/ProductoItem.jsx` (2 ocurrencias)

**Visualización en UI:**
```jsx
<span className="font-bold text-lg">TOTAL (calculado):</span>
<span className="font-black text-2xl">{formatCurrency(totalCalculado ?? 0)}</span>
```

---

### 4. ✅ Sistema de Búsqueda Automática de Productos con Puppeteer

**Funcionalidad:** Sistema completo para buscar información de productos en Google usando Puppeteer y completar automáticamente los datos del schema.

**Archivos creados:**
1. `/lib/ia/buscarProductoConIA.js` - Servicio de búsqueda con Puppeteer
2. `/app/api/productos/buscar-ia/route.js` - API endpoint

**Características:**
- ✅ Búsqueda en Google Shopping primero (mejores resultados para productos)
- ✅ Fallback a búsqueda normal si Shopping no encuentra nada
- ✅ Extracción automática de:
  - Nombre del producto
  - Marca (detectada automáticamente)
  - Categorías (inferidas del contexto)
  - Imágenes
  - Precios de referencia (múltiples tiendas)
- ✅ **Auditoría completa** de todas las búsquedas
- ✅ **Creación automática** de productos en BD si no existen
- ✅ **Creación automática** de marcas y categorías
- ✅ Headless mode (no abre ventana del navegador)

**Uso:**
```javascript
// Buscar información
const info = await buscarProductoConIA({
  nombre: 'Coca Cola',
  marca: 'Coca Cola',
  codigoBarras: '7790742086013'
})

// Buscar y guardar en BD automáticamente
const producto = await buscarYGuardarProducto({
  nombre_producto: 'Coca Cola 500ml',
  descripcion_exacta: 'Bebida cola 500ml',
  tipo_presentacion_nombre: 'UNIDAD',
  presentacion_base: '500ml'
})
```

**API REST:**
```bash
POST /api/productos/buscar-ia
{
  "nombre": "Coca Cola",
  "marca": "Coca Cola",
  "codigoBarras": "7790742086013"
}
```

---

## 📊 Auditorías Agregadas

Se agregaron 2 nuevas acciones de auditoría:

1. **BUSCAR_PRODUCTO_IA**
   - Registra: consulta, cantidad de resultados, producto, marca, categorías
   - Se ejecuta en cada búsqueda exitosa

2. **BUSCAR_PRODUCTO_IA_ERROR**
   - Registra: error, nombre, marca, código de barras
   - Se ejecuta cuando la búsqueda falla

3. **CREAR_PRODUCTO_DESDE_IA**
   - Registra: productoId, nombre, marca, categorías, fuente
   - Se ejecuta al crear un producto automáticamente

---

## 🎯 Flujo Completo de Trabajo

### Escenario: Cargar una factura con productos nuevos

1. **Usuario carga imagen de factura** → Sistema procesa con calidad mejorada
2. **Ollama extrae datos** → Captura totales completos (descuentos, impuestos, flete, cuenta corriente)
3. **Sistema detecta producto nuevo** (ej: "Galletitas Oreo 118g")
4. **Búsqueda automática con Puppeteer:**
   - Busca en Google Shopping: "Galletitas Oreo 118g"
   - Encuentra: marca=Oreo, categoría=Snacks, imágenes, precios
5. **Creación automática:**
   - Marca "Oreo" (si no existe)
   - Categoría "Snacks" (si no existe)
   - Producto "Galletitas Oreo" con presentación "118g"
6. **Auditoría completa:** Registra búsqueda, creación y datos encontrados
7. **Usuario confirma factura** → Stock actualizado, factura guardada

---

## 🔍 Próximos Pasos Sugeridos

1. **Integrar búsqueda automática en el flujo de carga de facturas**
   - Cuando se detecta un producto no encontrado, llamar automáticamente a `buscarYGuardarProducto()`
   - Mostrar modal de confirmación con los datos encontrados
   - Permitir editar antes de guardar

2. **Mejorar detección de presentaciones**
   - Usar regex para extraer mejor "15x 200g" → unidades=15, base=200g
   - Mapear automáticamente a TiposPresentacion del schema

3. **Cache de búsquedas**
   - Guardar resultados de búsquedas por código de barras
   - Evitar búsquedas duplicadas

4. **Enriquecer datos existentes**
   - Script para buscar información de productos existentes sin imágenes/categorías
   - Actualizar automáticamente precios de referencia

---

## ✅ Validación

- ✅ `npm run build` - Exitoso
- ✅ `npm run lint` - Sin errores
- ✅ Todos los cambios documentados
- ✅ Auditorías agregadas a `.github/copilot-instructions.md`
