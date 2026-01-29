# 🎯 Guía Rápida: Detección Automática de Documentos

## ✅ ¿Qué se implementó?

Se agregó **detección automática de bordes de documentos** usando OpenCV.js al sistema de crop manual de facturas.

## 📁 Archivos Modificados/Creados

### Nuevos:
- **`/lib/opencvDocumentDetection.js`** - Lógica de detección con OpenCV.js
- **`/OPENCV_DETECTION_DOCS.md`** - Documentación técnica completa
- **`/public/opencv-test.html`** - Página de prueba standalone

### Modificados:
- **`/app/components/ia/ManualVertexCropper.jsx`** - Botón "Detectar automáticamente"

## 🚀 Cómo Probar

### Opción 1: Dentro de la Aplicación

1. Ejecutar el servidor:
   ```bash
   npm run dev
   ```

2. Ir a la sección de carga de facturas (IA)

3. Cargar una imagen de factura

4. Hacer clic en el botón de crop (tijeras ✂️)

5. En el modal, hacer clic en **"🤖 Detectar automáticamente"**

6. Esperar 3-5 segundos mientras OpenCV.js se descarga y procesa

7. Si la detección funciona:
   - ✅ Aparecerán 4 puntos en las esquinas del documento
   - Puedes ajustarlos manualmente arrastrándolos
   - Haz clic en "Comparar crop" para ver preview
   - Confirma con "Aplicar crop y continuar"

8. Si la detección falla:
   - ⚠️ Aparecerá un mensaje amarillo
   - Haz clic manual en las 4 esquinas del documento

### Opción 2: Página de Prueba Standalone

1. Ejecutar el servidor:
   ```bash
   npm run dev
   ```

2. Ir a: **http://localhost:3000/opencv-test.html**

3. Hacer clic en "📦 Cargar OpenCV.js" (esperar ~5 seg)

4. Seleccionar una imagen de factura con el botón de file input

5. Hacer clic en "🔍 Detectar Documento"

6. Ver los resultados:
   - **Izquierda**: Imagen original
   - **Derecha**: Documento detectado con contorno verde y puntos numerados
   - **Log**: Información detallada del procesamiento

## 🔍 Qué Observar

### En la Consola del Navegador:
```
🔍 Iniciando detección automática de documento...
📸 Imagen leída: 1920x1080
⚫ Convertido a escala de grises
🌫️ Desenfoque Gaussiano aplicado
🔲 Bordes detectados con Canny
🔳 Bordes dilatados
📊 Encontrados 23 contornos
🎯 Mejor contorno: índice 5, área 1847520
✅ Documento detectado con 4 esquinas
```

### En la UI:
- Estado "🔄 Detectando..." mientras procesa
- Puntos azules numerados (1, 2, 3, 4) en las esquinas
- Posibilidad de arrastrarlos para ajustar
- Botón "Reset" para volver a intentar

## 📊 Casos de Prueba Recomendados

### ✅ Casos que DEBERÍAN funcionar:
- Factura en papel blanco sobre fondo oscuro
- Factura escaneada en PDF → screenshot
- Ticket de compra rectangular
- Documento con bordes bien definidos
- Buena iluminación y contraste

### ⚠️ Casos que PUEDEN fallar:
- Documento muy arrugado
- Fondo muy texturizado (ej: mesa de madera con vetas)
- Iluminación muy pobre o con sombras
- Documento con borde del mismo color que el fondo
- Múltiples documentos en la misma imagen

### 🔧 Qué hacer si falla:
1. Usar el modo manual (hacer clic en 4 esquinas)
2. Intentar con mejor iluminación
3. Asegurar que el documento sea el objeto más grande en la imagen
4. Evitar sombras fuertes

## 🎓 Pipeline Técnico

```
Imagen → Escala de grises → Blur Gaussiano → Canny Edge Detection
                                                      ↓
Canvas resultado ← Homografía ← Ordenar puntos ← Filtrar (4 vértices)
                                                      ↓
                                              Encontrar contornos
```

## 📚 Documentación Adicional

- **Documentación técnica completa**: `OPENCV_DETECTION_DOCS.md`
- **Código fuente OpenCV**: `lib/opencvDocumentDetection.js`
- **Componente UI**: `app/components/ia/ManualVertexCropper.jsx`

## 🐛 Troubleshooting

### "Error cargando OpenCV.js desde CDN"
- Verificar conexión a internet
- Revisar consola del navegador para errores CORS
- Intentar recargar la página

### "No se pudo detectar el documento automáticamente"
- Esto es NORMAL en algunos casos
- Usar el modo manual como fallback
- Ver sugerencias en "Casos que PUEDEN fallar"

### La detección es muy lenta
- Primera vez carga ~8MB de OpenCV.js (se cachea)
- Procesamiento típico: 1-3 segundos
- En imágenes muy grandes puede tomar más tiempo

## 💡 Tips

- **Primera detección**: Más lenta por descarga de OpenCV.js
- **Siguientes detecciones**: Más rápidas (librería en caché)
- **Modo manual siempre disponible**: No depende de la detección automática
- **Puntos ajustables**: Siempre puedes arrastrar para perfeccionar
- **Reset limpia todo**: Puedes reintentar la detección

## 🎯 Próximos Pasos

Si quieres mejorar la detección:
1. Ajustar parámetros en `lib/opencvDocumentDetection.js`:
   - Umbrales Canny (actualmente 50-150)
   - Tamaño de kernel de blur (actualmente 5x5)
   - Tolerancia de aproximación (actualmente 2%)
   - Área mínima (actualmente 10%)

2. Agregar pre-procesamiento adicional:
   - Corrección de iluminación
   - Aumento de contraste adaptativo
   - Rotación automática

3. Implementar detección adaptativa:
   - Intentar con varios sets de parámetros
   - Scoring de calidad de detección
   - Auto-selección del mejor resultado
