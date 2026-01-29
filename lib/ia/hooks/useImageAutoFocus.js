/**
 * Hook personalizado para auto-enfoque de imágenes
 * Detecta y recorta automáticamente documentos en imágenes
 */

import { useCallback } from 'react'
import { addMarginToRect, mapScaledToOriginal, areaPercentage } from '@/src/utils/geometry'

export function useImageAutoFocus() {
  const autoEnfocar = useCallback(async (originalFile, originalPreview, setFile, setPreview, preview) => {
    try {
      const img = new Image()
      img.src = originalPreview
      await new Promise((resolve) => { img.onload = resolve })

      // Para imágenes grandes, analizamos a una resolución reducida para ahorrar tiempo
      const MAX_DIM = 1200
      let scale = 1.0
      let analysisWidth = img.width
      let analysisHeight = img.height

      if (Math.max(img.width, img.height) > MAX_DIM) {
        scale = img.width > img.height ? MAX_DIM / img.width : MAX_DIM / img.height
        analysisWidth = Math.round(img.width * scale)
        analysisHeight = Math.round(img.height * scale)
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

      // Agregar margen en coordenadas escaladas
      const marginX = Math.floor((maxX - minX) * 0.03)
      const marginY = Math.floor((maxY - minY) * 0.03)
      let sMinX = Math.max(0, minX - marginX)
      let sMinY = Math.max(0, minY - marginY)
      let sMaxX = Math.min(analysisCanvas.width, maxX + marginX)
      let sMaxY = Math.min(analysisCanvas.height, maxY + marginY)

      const cropWidth = sMaxX - sMinX
      const cropHeight = sMaxY - sMinY
      const percent = areaPercentage({ x1: sMinX, y1: sMinY, x2: sMaxX, y2: sMaxY }, { width: analysisCanvas.width, height: analysisCanvas.height })

      if (edgePixels > 60 && cropWidth > analysisCanvas.width * 0.08 && cropHeight > analysisCanvas.height * 0.08) {
        // Crop original image using mapped coordinates to preserve quality
        const origCanvas = document.createElement('canvas')
        const origCtx = origCanvas.getContext('2d')
        origCanvas.width = img.width
        origCanvas.height = img.height
        origCtx.drawImage(img, 0, 0)

        const scaledRect = { x1: sMinX, y1: sMinY, x2: sMaxX, y2: sMaxY }
        const oRect = mapScaledToOriginal(scaledRect, scale)
        const oMinX = oRect.x1
        const oMinY = oRect.y1
        const oCropW = oRect.x2 - oRect.x1
        const oCropH = oRect.y2 - oRect.y1

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
            resolve(true)
          }, originalFile.type, 0.95)
        })
        return applied
      } else {
        return false
      }
    } catch (error) {
      return false
    }
  }, [])
  
  return autoEnfocar
}
