# 📸 Guía de Procesamiento de Imágenes con IA

## Stack Técnico Implementado

- **Next.js 15** (App Router)
- **Vercel AI SDK** (`ai` package v6.0.49)
- **ollama-ai-provider** (v1.2.0)
- **Ollama local** con modelo **Llava** (multimodal)

## 🎯 Funcionalidades

### 1️⃣ Análisis de Facturas 🧾
Extrae automáticamente:
- **Proveedor**: Nombre, CUIT, dirección, teléfono
- **Datos del comprobante**: Tipo, número, fecha, punto de venta
- **Productos**: Descripción, cantidad, precio unitario, subtotales
- **Totales**: Subtotal, IVA, total final

### 2️⃣ Identificación de Productos 📦
Detecta:
- **Identificación**: Nombre, marca, categoría
- **Presentación**: Tipo de envase, cantidad, unidad de medida
- **Información adicional**: Código de barras, ingredientes, vencimiento
- **Recomendación**: Sugerencia de categorización para inventario

### 3️⃣ Análisis General 🔍
Descripción detallada de cualquier imagen con objetos, texto, colores y contexto.

## 🚀 Uso

### Requisitos Previos

```bash
# 1. Instalar Ollama
curl https://ollama.ai/install.sh | sh

# 2. Descargar modelo Llava (multimodal)
ollama pull llava

# 3. Verificar que Ollama esté corriendo
ollama list
```

### Desde la Interfaz

1. Navega a `/ia`
2. Ve a la pestaña **"Analizar Imagen"**
3. Selecciona el tipo de análisis:
   - 🧾 **Factura**: Para extracto de datos estructurados
   - 📦 **Producto**: Para identificación y categorización
   - 🔍 **General**: Para análisis libre
4. Carga la imagen (click o drag & drop)
5. Click en **"Analizar"**

### Desde la API

```javascript
// Ejemplo: Procesar factura
const formData = new FormData()
formData.append('image', fileBlob)
formData.append('model', 'llava')
formData.append('mode', 'factura') // 'producto' | 'general'

const response = await fetch('/api/ai/image', {
  method: 'POST',
  body: formData
})

const data = await response.json()
console.log(data.text) // Resultado del análisis
```

## 📁 Arquitectura de Código

### Backend: `/app/api/ai/image/route.js`

```javascript
import { generateText } from 'ai'
import { ollama } from 'ollama-ai-provider'

// Prompts especializados por tipo
const PROMPTS = {
  factura: '...', // Extracción estructurada
  producto: '...', // Identificación detallada
  general: '...'   // Análisis libre
}

// Procesamiento con Vercel AI SDK
const result = await generateText({
  model: ollama(model),
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: PROMPTS[mode] },
      { type: 'image', image: base64DataUrl }
    ]
  }],
  maxTokens: 2000,
  temperature: 0.3 // Precisión para datos estructurados
})
```

### Frontend: `/app/components/ia/IaImage.jsx`

- **Selector de modo** (factura/producto/general)
- **Preview de imagen** con metadata
- **Botón analizar** con loading state
- **Display de resultados** formateados
- **Manejo de errores** con fallback

## 🎨 Mejoras Visuales

- Cards con sombras y bordes redondeados
- Iconos emoji para cada modo
- Loading states animados
- Preview responsive de imágenes
- Tooltips descriptivos por modo

## 🔧 Configuración Avanzada

### Cambiar Modelo

```bash
# Modelos multimodales recomendados
ollama pull llava:13b    # Más preciso
ollama pull llava:34b    # Máxima precisión
ollama pull bakllava     # Alternativa
```

### Ajustar Temperatura

En `/app/api/ai/image/route.js`:
```javascript
temperature: 0.3  // 0.0 = preciso, 1.0 = creativo
maxTokens: 2000   // Longitud máxima de respuesta
```

## 📊 Resultados Esperados

### Factura
```
**INFORMACIÓN DEL PROVEEDOR:**
- Nombre: ACME Corp S.A.
- CUIT: 30-12345678-9
- Dirección: Av. Siempre Viva 123

**PRODUCTOS:**
1. Arroz integral 1kg - Cant: 10 - $500 c/u - Subtotal: $5000
2. Aceite girasol 900ml - Cant: 5 - $800 c/u - Subtotal: $4000

**TOTALES:**
- Subtotal: $9000
- IVA 21%: $1890
- Total: $10890
```

### Producto
```
**IDENTIFICACIÓN:**
- Nombre: Arroz Integral
- Marca: Gallo Oro
- Categoría: Alimentos > Cereales

**PRESENTACIÓN:**
- Tipo: Bolsa plástica
- Cantidad: 1 kg

**CÓDIGO DE BARRAS:** 7790001234567

**RECOMENDACIÓN:**
Categorizar como "Alimentos/Cereales/Arroz" con presentación "Bolsa 1kg"
```

## 🐛 Troubleshooting

### Error: "No se pudo procesar imagen"
- Verifica que Ollama esté corriendo: `ps aux | grep ollama`
- Reinicia Ollama: `ollama serve`

### Modelo no encontrado
```bash
ollama list  # Ver modelos instalados
ollama pull llava  # Descargar si falta
```

### Respuestas vacías
- Usa modelo más potente: `llava:13b`
- Aumenta `maxTokens` en la configuración
- Verifica calidad de imagen (mínimo 800x600px)

## 🔄 Próximas Mejoras

- [ ] Exportar resultados a JSON estructurado
- [ ] Guardar análisis en base de datos
- [ ] Batch processing de múltiples imágenes
- [ ] OCR mejorado con preprocesamiento
- [ ] Integración directa con módulo de facturas

## 📚 Referencias

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Ollama Models](https://ollama.ai/library)
- [Llava Model](https://ollama.ai/library/llava)
