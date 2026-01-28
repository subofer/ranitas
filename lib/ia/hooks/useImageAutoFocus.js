/**
 * Hook personalizado para auto-enfoque de imágenes
 * Detecta y recorta automáticamente documentos en imágenes
 */

import { useCallback } from 'react'

export function useImageAutoFocus() {
  const autoEnfocar = useCallback(async (originalFile, originalPreview, setFile, setPreview, preview) => {
    try {
      console.log('🎯 Iniciando auto-enfoque...')
      const img = new Image()
      img.src = originalPreview
      
      await new Promise((resolve) => { img.onload = resolve })
      
      console.log('📏 Tamaño original:', `${img.width}x${img.height}`)
      
      // Para imágenes grandes, analizamos a una resolución reducida para ahorrar tiempo
      const MAX_DIM = 1200
      let scale = 1.0
      let analysisWidth = img.width
      let analysisHeight = img.height

      if (Math.max(img.width, img.height) > MAX_DIM) {
        if (img.width > img.height) {
          scale = MAX_DIM / img.width
        } else {
          scale = MAX_DIM / img.height
        }
        analysisWidth = Math.round(img.width * scale)
        analysisHeight = Math.round(img.height * scale)
        console.log('🔽 Redimensionando para análisis:', `${analysisWidth}x${analysisHeight}`, 'scale:', scale.toFixed(3))
      }

      const analysisCanvas = document.createElement('canvas')
      const aCtx = analysisCanvas.getContext('2d')
      analysisCanvas.width = analysisWidth
      analysisCanvas.height = analysisHeight
      aCtx.drawImage(img, 0, 0, analysisWidth, analysisHeight)

      const imageData = aCtx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height)
      const data = imageData.data

      // Detectar tipo de fondo (muestreo por columnas superiores/inferiores)
      let borderBrightness = 0
      let borderSamples = 0
      for (let x = 0; x < analysisCanvas.width; x += 20) {
        const i1 = (0 * analysisCanvas.width + x) * 4
        const i2 = ((analysisCanvas.height - 1) * analysisCanvas.width + x) * 4
        borderBrightness += (data[i1] + data[i1 + 1] + data[i1 + 2]) / 3
        borderBrightness += (data[i2] + data[i2 + 1] + data[i2 + 2]) / 3
        borderSamples += 2
      }
      borderBrightness /= Math.max(1, borderSamples)
      const fondoOscuro = borderBrightness < 100

      // Buscar bordes con mayor paso para rendimiento
      let minX = analysisCanvas.width, minY = analysisCanvas.height
      let maxX = 0, maxY = 0
      const step = Math.max(2, Math.floor(analysisCanvas.width / 400)) // adaptativo
      let edgePixels = 0

      for (let y = step; y < analysisCanvas.height - step; y += step) {
        for (let x = step; x < analysisCanvas.width - step; x += step) {
          const i = (y * analysisCanvas.width + x) * 4
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3

          const iLeft = (y * analysisCanvas.width + (x - step)) * 4
          const iRight = (y * analysisCanvas.width + (x + step)) * 4
          const iTop = ((y - step) * analysisCanvas.width + x) * 4
          const iBottom = ((y + step) * analysisCanvas.width + x) * 4

          const bLeft = (data[iLeft] + data[iLeft + 1] + data[iLeft + 2]) / 3
          const bRight = (data[iRight] + data[iRight + 1] + data[iRight + 2]) / 3
          const bTop = (data[iTop] + data[iTop + 1] + data[iTop + 2]) / 3
          const bBottom = (data[iBottom] + data[iBottom + 1] + data[iBottom + 2]) / 3

          const gradient = Math.abs(brightness - bLeft) +
                          Math.abs(brightness - bRight) +
                          Math.abs(brightness - bTop) +
                          Math.abs(brightness - bBottom)

          const isEdge = gradient > 80
          const isContent = fondoOscuro
            ? brightness > borderBrightness + 25 || isEdge
            : brightness < borderBrightness - 25 || isEdge

          if (isContent) {
            edgePixels++
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }

      console.log('🔍 Tipo de fondo:', fondoOscuro ? 'OSCURO' : 'CLARO')
      console.log('🖍️ Píxeles de bordes encontrados (analizados a escala):', edgePixels)

      // Mapear coordenadas al tamaño original
      const mapToOriginal = (v) => Math.round(v / scale)

      // Agregar margen en coordenadas escaladas
      const marginX = Math.floor((maxX - minX) * 0.03)
      const marginY = Math.floor((maxY - minY) * 0.03)
      let sMinX = Math.max(0, minX - marginX)
      let sMinY = Math.max(0, minY - marginY)
      let sMaxX = Math.min(analysisCanvas.width, maxX + marginX)
      let sMaxY = Math.min(analysisCanvas.height, maxY + marginY)

      const cropWidth = sMaxX - sMinX
      const cropHeight = sMaxY - sMinY
      const areaPercentage = (cropWidth * cropHeight) / (analysisCanvas.width * analysisCanvas.height)

      console.log('📊 Área detectada (escalada):', `${(areaPercentage * 100).toFixed(1)}%`)

      if (edgePixels > 60 && cropWidth > analysisCanvas.width * 0.08 && cropHeight > analysisCanvas.height * 0.08) {
        // Crop original image using mapped coordinates to preserve quality
        const origCanvas = document.createElement('canvas')
        const origCtx = origCanvas.getContext('2d')
        origCanvas.width = img.width
        origCanvas.height = img.height
        origCtx.drawImage(img, 0, 0)

        const oMinX = mapToOriginal(sMinX)
        const oMinY = mapToOriginal(sMinY)
        const oCropW = mapToOriginal(sMaxX) - oMinX
        const oCropH = mapToOriginal(sMaxY) - oMinY

        const croppedCanvas = document.createElement('canvas')
        const croppedCtx = croppedCanvas.getContext('2d')
        croppedCanvas.width = oCropW
        croppedCanvas.height = oCropH
        croppedCtx.drawImage(origCanvas, oMinX, oMinY, oCropW, oCropH, 0, 0, oCropW, oCropH)

        // Suave mejora de contraste (8%) en original
        const croppedImageData = croppedCtx.getImageData(0, 0, oCropW, oCropH)
        const croppedData = croppedImageData.data
        const contrast = 0.08
        const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100))
        console.log('🔧 Auto-enfoque: contraste aplicado:', contrast, 'factor:', factor.toFixed(3))

        for (let i = 0; i < croppedData.length; i += 4) {
          croppedData[i] = Math.min(255, Math.max(0, factor * (croppedData[i] - 128) + 128))
          croppedData[i + 1] = Math.min(255, Math.max(0, factor * (croppedData[i + 1] - 128) + 128))
          croppedData[i + 2] = Math.min(255, Math.max(0, factor * (croppedData[i + 2] - 128) + 128))
        }

        croppedCtx.putImageData(croppedImageData, 0, 0)

        const applied = await new Promise((resolve) => {
          croppedCanvas.toBlob((blob) => {
            const croppedFile = new File([blob], originalFile.name, { type: originalFile.type })
            const croppedUrl = URL.createObjectURL(blob)

            if (originalPreview !== preview) {
              URL.revokeObjectURL(originalPreview)
            }
            setFile(croppedFile)
            setPreview(croppedUrl)

            console.log('✅ Auto-enfoque aplicado (rápido y escalado)')
            resolve(true)
          }, originalFile.type, 0.95)
        })
        return applied
      } else {
        console.log('⚠️ No se detectó área suficiente para recortar (rápido)')
        return false
      }
    } catch (error) {
      console.error('❌ Error en auto-enfoque:', error)
      return false
    }
  }, [])
  
  return autoEnfocar
}
