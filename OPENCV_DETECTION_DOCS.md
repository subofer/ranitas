# Sistema de Detección Automática de Documentos con OpenCV.js

## 📋 Descripción

Se ha implementado un sistema de detección automática de bordes para facturas y documentos usando **OpenCV.js** con procesamiento tradicional de visión por computadora (sin IA/Deep Learning).

## 🎯 Funcionalidades Implementadas

### 1. **Archivo: `/lib/opencvDocumentDetection.js`**

Contiene las funciones principales:

#### `loadOpenCV()`
- Carga dinámica de OpenCV.js desde CDN
- Sistema de promesas con caché para evitar cargas múltiples
- Timeout de 10 segundos con manejo de errores
- Verificación automática de disponibilidad

#### `detectDocumentEdges(canvas)`
Pipeline completo de detección:

1. **Conversión a escala de grises** (`cv.cvtColor`)
2. **Desenfoque Gaussiano** (`cv.GaussianBlur` con kernel 5x5)
   - Reduce ruido y mejora detección de bordes
3. **Detección de bordes Canny** (`cv.Canny` con umbrales 50-150)
   - Identifica contornos principales del documento
4. **Dilatación** (`cv.dilate` con kernel 5x5)
   - Conecta líneas fragmentadas
5. **Búsqueda de contornos** (`cv.findContours`)
   - Encuentra todos los contornos en la imagen
6. **Filtrado inteligente**:
   - Descarta contornos < 10% del área total
   - Aproxima cada contorno con `cv.approxPolyDP` (2% de tolerancia)
   - Busca el contorno más grande con exactamente 4 vértices
7. **Ordenamiento de puntos** (TL, TR, BR, BL)
8. **Canvas de debug opcional** con visualización de contornos y puntos

**Retorna:**
```javascript
{
  points: [{x, y}, {x, y}, {x, y}, {x, y}] | null,
  debugCanvas: HTMLCanvasElement | undefined,
  error: string | undefined
}
```

#### `warpPerspective(sourceCanvas, points)`
- Aplica transformación de perspectiva para enderezar el documento
- Calcula dimensiones óptimas basándose en distancias de bordes
- Usa `cv.getPerspectiveTransform` y `cv.warpPerspective`
- Retorna un `HTMLCanvasElement` con el documento rectificado

### 2. **Componente: `/app/components/ia/ManualVertexCropper.jsx`**

Modificaciones realizadas:

#### Estados agregados:
```javascript
const [detectando, setDetectando] = useState(false)
const [errorDeteccion, setErrorDeteccion] = useState(null)
```

#### Función `detectarAutomaticamente()`:
- Ejecuta `detectDocumentEdges()` sobre el canvas actual
- Convierte coordenadas detectadas a la escala del canvas de visualización
- Actualiza los puntos automáticamente si detecta 4 esquinas
- Maneja errores con mensajes amigables al usuario
- Si falla, el usuario puede usar el modo manual

#### UI actualizada:
- **Botón "🤖 Detectar automáticamente"**:
  - Ubicado en el header del modal
  - Deshabilitado mientras detecta o cuando ya hay 4 puntos
  - Estado visual de carga ("🔄 Detectando...")
  - Estilo distintivo (púrpura) para destacar la función
- **Mensaje de ayuda actualizado**: Sugiere usar detección automática
- **Mensaje de error**: Se muestra en amarillo si la detección falla
- **Botón "Reset"**: Limpia también el error de detección

## 🔧 Pipeline de Uso

### Flujo Normal (Con Detección Automática):
1. Usuario carga imagen en `IaImage.jsx`
2. Hace clic en botón de crop manual
3. Se abre `ManualVertexCropper`
4. **Usuario hace clic en "🤖 Detectar automáticamente"**
5. Sistema ejecuta pipeline de OpenCV:
   - Escala de grises → Blur → Canny → Dilatación → Contornos
6. Si tiene éxito: Los 4 puntos aparecen automáticamente
7. Usuario puede ajustar arrastrando los puntos si es necesario
8. Hace clic en "Comparar crop" para ver preview
9. Confirma con "✂️ Aplicar crop y continuar"

### Flujo Alternativo (Si Detección Falla):
1. Sistema muestra mensaje: "⚠️ No se pudo detectar el documento automáticamente. Usa el modo manual."
2. Usuario hace clic manualmente en las 4 esquinas del documento
3. Continúa con el flujo normal desde el paso 7

## 📊 Parámetros Técnicos

### Detección de Bordes (Canny)
- **Umbral inferior**: 50
- **Umbral superior**: 150
- **Tamaño de apertura**: 3

### Desenfoque Gaussiano
- **Kernel**: 5x5
- **Sigma**: 0 (auto-calculado)

### Dilatación
- **Kernel**: 5x5 rectangular
- **Iteraciones**: 1

### Filtros de Contornos
- **Área mínima**: 10% del área total de la imagen
- **Tolerancia de aproximación**: 2% del perímetro
- **Vértices requeridos**: Exactamente 4

## 🎨 Visualización de Debug

Cuando la detección es exitosa, se genera un canvas de debug con:
- Contorno detectado en **verde** (grosor 3px)
- Puntos numerados con círculos **azules** rellenos
- Números amarillos (1, 2, 3, 4) indicando cada esquina
- Canvas completo con imagen original de fondo

## ⚡ Optimizaciones

- **Carga lazy**: OpenCV.js solo se descarga cuando el usuario hace clic en "Detectar"
- **Caché de librería**: Una vez cargado, se reutiliza en futuras detecciones
- **Limpieza de memoria**: Todas las matrices de OpenCV se liberan con `.delete()`
- **Timeout configurado**: Evita bloqueos indefinidos
- **Manejo de errores**: Try/catch en cada paso crítico

## 🚨 Limitaciones y Casos de Fallo

La detección automática puede fallar en:
- Documentos con fondos muy texturizados o con patrones
- Imágenes muy borrosas o con poca iluminación
- Documentos arrugados o muy deformados
- Fondos con otros rectángulos más grandes que el documento
- Imágenes con mucho ruido

En estos casos, el usuario siempre puede usar el **modo manual** haciendo clic en las 4 esquinas.

## 🔍 Logs de Consola

El sistema registra información detallada en consola:

```
🔍 Iniciando detección automática de documento...
📸 Imagen leída: 1920x1080
⚫ Convertido a escala de grises
🌫️ Desenfoque Gaussiano aplicado
🔲 Bordes detectados con Canny
🔳 Bordes dilatados
📊 Encontrados 23 contornos
🎯 Mejor contorno: índice 5, área 1847520
✅ Documento detectado con 4 esquinas: [{x: 120, y: 85}, ...]
```

## 🧪 Testing Manual

Para probar la detección:

1. Cargar una factura en `IaImage.jsx`
2. Hacer clic en el icono de crop (tijeras)
3. En el modal, hacer clic en "🤖 Detectar automáticamente"
4. Observar logs en consola para ver el proceso
5. Si funciona, ajustar puntos manualmente si es necesario
6. Si falla, hacer clic manual en las 4 esquinas

## 📦 Dependencias

- **OpenCV.js** (cargado desde CDN):
  - URL: `https://docs.opencv.org/4.x/opencv.js`
  - Versión: 4.x
  - Tamaño: ~8MB (carga única, cacheada por navegador)

## 🔐 Seguridad

- Sin envío de datos a servidores externos
- Procesamiento 100% en el navegador del cliente
- No requiere GPU ni recursos especiales
- Compatible con todos los navegadores modernos

## 🎯 Próximas Mejoras Posibles

- [ ] Parámetros ajustables (umbrales Canny, kernel blur, etc.)
- [ ] Modo de debug visual en tiempo real
- [ ] Detección adaptativa según tipo de documento
- [ ] Pre-procesamiento adicional para documentos difíciles
- [ ] Historial de parámetros que funcionaron bien
- [ ] Detección multi-documento en una sola imagen
