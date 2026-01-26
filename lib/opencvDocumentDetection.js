/**
 * Detección automática de documentos usando OpenCV.js (procesamiento tradicional)
 * No usa modelos de IA, solo visión por computadora clásica
 */

// Carga dinámica de OpenCV.js
let cv = null
let cvLoadPromise = null

/**
 * Carga OpenCV.js de forma asíncrona
 */
export async function loadOpenCV() {
  if (cv) return cv
  if (cvLoadPromise) return cvLoadPromise
  
  cvLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('OpenCV.js solo funciona en el navegador'))
      return
    }
    
    // Verificar si ya está cargado
    if (window.cv && window.cv.Mat) {
      cv = window.cv
      resolve(cv)
      return
    }
    
    // Crear script tag para cargar OpenCV.js desde CDN
    const script = document.createElement('script')
    script.src = 'https://docs.opencv.org/4.x/opencv.js'
    script.async = true
    
    script.onload = () => {
      // OpenCV.js necesita un momento para inicializarse
      const checkOpenCV = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkOpenCV)
          cv = window.cv
          console.log('✅ OpenCV.js cargado correctamente')
          resolve(cv)
        }
      }, 100)
      
      // Timeout de 10 segundos
      setTimeout(() => {
        clearInterval(checkOpenCV)
        if (!cv) {
          reject(new Error('Timeout cargando OpenCV.js'))
        }
      }, 10000)
    }
    
    script.onerror = () => {
      reject(new Error('Error cargando OpenCV.js desde CDN'))
    }
    
    document.head.appendChild(script)
  })
  
  return cvLoadPromise
}

/**
 * Reordena 4 puntos en orden: Top-Left, Top-Right, Bottom-Right, Bottom-Left
 * @param {Array} points - Array de 4 puntos {x, y}
 * @returns {Array} - Puntos ordenados
 */
function orderPoints(points) {
  // Ordenar por Y (arriba primero)
  const sorted = [...points].sort((a, b) => a.y - b.y)
  
  // Los 2 primeros son top, los 2 últimos son bottom
  const topPoints = sorted.slice(0, 2).sort((a, b) => a.x - b.x)
  const bottomPoints = sorted.slice(2, 4).sort((a, b) => a.x - b.x)
  
  return [
    topPoints[0],     // Top-Left
    topPoints[1],     // Top-Right
    bottomPoints[1],  // Bottom-Right
    bottomPoints[0]   // Bottom-Left
  ]
}

/**
 * Detecta automáticamente los bordes de un documento en una imagen
 * @param {HTMLCanvasElement} canvas - Canvas con la imagen a procesar
 * @returns {Promise<{points: Array, debugCanvas?: HTMLCanvasElement}>} 
 *          - points: Array de 4 puntos {x,y} o null si falla
 *          - debugCanvas: Canvas opcional con visualización del procesamiento
 */
export async function detectDocumentEdges(canvas) {
  console.log('🔍 Iniciando detección automática de documento...')
  
  try {
    // Asegurar que OpenCV.js esté cargado
    const cv = await loadOpenCV()
    
    // 1. Leer imagen del canvas
    const src = cv.imread(canvas)
    console.log('📸 Imagen leída:', src.cols + 'x' + src.rows)
    
    // 2. Convertir a escala de grises
    const gray = new cv.Mat()
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    console.log('⚫ Convertido a escala de grises')
    
    // 3. Aplicar desenfoque Gaussiano para reducir ruido
    const blurred = new cv.Mat()
    const ksize = new cv.Size(5, 5)
    cv.GaussianBlur(gray, blurred, ksize, 0)
    console.log('🌫️ Desenfoque Gaussiano aplicado')
    
    // 4. Detección de bordes con Canny
    const edges = new cv.Mat()
    cv.Canny(blurred, edges, 50, 150, 3, false)
    console.log('🔲 Bordes detectados con Canny')
    
    // 5. Dilatar bordes para conectar líneas fragmentadas
    const dilated = new cv.Mat()
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5))
    cv.dilate(edges, dilated, kernel)
    console.log('🔳 Bordes dilatados')
    
    // 6. Encontrar contornos
    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)
    console.log(`📊 Encontrados ${contours.size()} contornos`)
    
    // 7. Buscar el contorno más grande con 4 esquinas
    let maxArea = 0
    let bestContourIndex = -1
    let bestApprox = null
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const area = cv.contourArea(contour)
      
      // Filtrar contornos muy pequeños (menos del 10% del área total)
      const minArea = (src.cols * src.rows) * 0.1
      if (area < minArea) continue
      
      // Aproximar el contorno a un polígono
      const approx = new cv.Mat()
      const perimeter = cv.arcLength(contour, true)
      cv.approxPolyDP(contour, approx, 0.02 * perimeter, true)
      
      // Buscar contornos con exactamente 4 puntos (cuadrilátero)
      if (approx.rows === 4 && area > maxArea) {
        maxArea = area
        bestContourIndex = i
        if (bestApprox) bestApprox.delete()
        bestApprox = approx
      } else {
        approx.delete()
      }
    }
    
    console.log(`🎯 Mejor contorno: índice ${bestContourIndex}, área ${maxArea}`)
    
    let detectedPoints = null
    
    if (bestApprox && maxArea > 0) {
      // Extraer los 4 puntos del contorno
      const points = []
      for (let i = 0; i < bestApprox.rows; i++) {
        const point = {
          x: bestApprox.data32S[i * 2],
          y: bestApprox.data32S[i * 2 + 1]
        }
        points.push(point)
      }
      
      // Ordenar puntos
      detectedPoints = orderPoints(points)
      console.log('✅ Documento detectado con 4 esquinas:', detectedPoints)
    } else {
      console.warn('⚠️ No se pudo detectar un documento con 4 esquinas')
    }
    
    // Crear canvas de debug (opcional)
    let debugCanvas = null
    if (detectedPoints) {
      debugCanvas = document.createElement('canvas')
      debugCanvas.width = src.cols
      debugCanvas.height = src.rows
      
      // Dibujar imagen original
      const debug = src.clone()
      
      // Dibujar el contorno detectado
      const color = new cv.Scalar(0, 255, 0, 255) // Verde
      const contourVec = new cv.MatVector()
      if (bestApprox) contourVec.push_back(bestApprox)
      cv.drawContours(debug, contourVec, 0, color, 3)
      
      // Dibujar los puntos
      detectedPoints.forEach((pt, idx) => {
        cv.circle(debug, new cv.Point(pt.x, pt.y), 10, new cv.Scalar(255, 0, 0, 255), -1)
        cv.putText(debug, String(idx + 1), new cv.Point(pt.x + 15, pt.y + 15), 
                   cv.FONT_HERSHEY_SIMPLEX, 1, new cv.Scalar(255, 255, 0, 255), 2)
      })
      
      cv.imshow(debugCanvas, debug)
      debug.delete()
      contourVec.delete()
    }
    
    // Limpiar memoria
    src.delete()
    gray.delete()
    blurred.delete()
    edges.delete()
    dilated.delete()
    kernel.delete()
    contours.delete()
    hierarchy.delete()
    if (bestApprox) bestApprox.delete()
    
    return {
      points: detectedPoints,
      debugCanvas
    }
    
  } catch (error) {
    console.error('❌ Error en detección automática:', error)
    return { points: null, error: error.message }
  }
}

/**
 * Aplica transformación de perspectiva para enderezar el documento
 * @param {HTMLCanvasElement} sourceCanvas - Canvas con la imagen original
 * @param {Array} points - 4 puntos ordenados (TL, TR, BR, BL)
 * @returns {Promise<HTMLCanvasElement>} - Canvas con documento enderezado
 */
export async function warpPerspective(sourceCanvas, points) {
  console.log('🔄 Aplicando transformación de perspectiva...')
  
  try {
    const cv = await loadOpenCV()
    
    // Validar puntos
    if (!points || points.length !== 4) {
      throw new Error('Se requieren exactamente 4 puntos')
    }
    
    // Ordenar puntos por si acaso
    const orderedPoints = orderPoints(points)
    
    // Calcular dimensiones del documento enderezado
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
    const widthTop = dist(orderedPoints[0], orderedPoints[1])
    const widthBottom = dist(orderedPoints[3], orderedPoints[2])
    const heightLeft = dist(orderedPoints[0], orderedPoints[3])
    const heightRight = dist(orderedPoints[1], orderedPoints[2])
    
    const maxWidth = Math.max(widthTop, widthBottom)
    const maxHeight = Math.max(heightLeft, heightRight)
    
    console.log('📐 Dimensiones destino:', maxWidth, 'x', maxHeight)
    
    // Definir puntos fuente (documento torcido)
    const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      orderedPoints[0].x, orderedPoints[0].y, // TL
      orderedPoints[1].x, orderedPoints[1].y, // TR
      orderedPoints[2].x, orderedPoints[2].y, // BR
      orderedPoints[3].x, orderedPoints[3].y  // BL
    ])
    
    // Definir puntos destino (rectángulo perfecto)
    const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,                    // TL
      maxWidth - 1, 0,         // TR
      maxWidth - 1, maxHeight - 1, // BR
      0, maxHeight - 1         // BL
    ])
    
    // Calcular matriz de transformación de perspectiva
    const M = cv.getPerspectiveTransform(srcPoints, dstPoints)
    
    // Leer imagen fuente
    const src = cv.imread(sourceCanvas)
    
    // Aplicar transformación
    const dst = new cv.Mat()
    const dsize = new cv.Size(maxWidth, maxHeight)
    cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())
    
    // Crear canvas de salida
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = maxWidth
    outputCanvas.height = maxHeight
    cv.imshow(outputCanvas, dst)
    
    console.log('✅ Transformación de perspectiva completada')
    
    // Limpiar memoria
    src.delete()
    dst.delete()
    M.delete()
    srcPoints.delete()
    dstPoints.delete()
    
    return outputCanvas
    
  } catch (error) {
    console.error('❌ Error en transformación de perspectiva:', error)
    throw error
  }
}
