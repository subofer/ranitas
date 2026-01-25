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
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Detectar tipo de fondo
      let borderBrightness = 0
      let borderSamples = 0
      for (let x = 0; x < canvas.width; x += 20) {
        const i1 = (0 * canvas.width + x) * 4
        const i2 = ((canvas.height - 1) * canvas.width + x) * 4
        borderBrightness += (data[i1] + data[i1 + 1] + data[i1 + 2]) / 3
        borderBrightness += (data[i2] + data[i2 + 1] + data[i2 + 2]) / 3
        borderSamples += 2
      }
      borderBrightness /= borderSamples
      
      console.log('🎨 Brillo promedio del borde:', borderBrightness.toFixed(1))
      const fondoOscuro = borderBrightness < 100
      
      // Buscar bordes
      let minX = canvas.width, minY = canvas.height
      let maxX = 0, maxY = 0
      const step = 3
      let edgePixels = 0
      
      for (let y = step; y < canvas.height - step; y += step) {
        for (let x = step; x < canvas.width - step; x += step) {
          const i = (y * canvas.width + x) * 4
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
          
          const iLeft = (y * canvas.width + (x - step)) * 4
          const iRight = (y * canvas.width + (x + step)) * 4
          const iTop = ((y - step) * canvas.width + x) * 4
          const iBottom = ((y + step) * canvas.width + x) * 4
          
          const bLeft = (data[iLeft] + data[iLeft + 1] + data[iLeft + 2]) / 3
          const bRight = (data[iRight] + data[iRight + 1] + data[iRight + 2]) / 3
          const bTop = (data[iTop] + data[iTop + 1] + data[iTop + 2]) / 3
          const bBottom = (data[iBottom] + data[iBottom + 1] + data[iBottom + 2]) / 3
          
          const gradient = Math.abs(brightness - bLeft) + 
                          Math.abs(brightness - bRight) + 
                          Math.abs(brightness - bTop) + 
                          Math.abs(brightness - bBottom)
          
          const isEdge = gradient > 100
          const isContent = fondoOscuro 
            ? brightness > borderBrightness + 30 || isEdge
            : brightness < borderBrightness - 30 || isEdge
          
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
      console.log('🖍️ Píxeles de bordes encontrados:', edgePixels)
      
      // Agregar margen
      const marginX = Math.floor((maxX - minX) * 0.03)
      const marginY = Math.floor((maxY - minY) * 0.03)
      minX = Math.max(0, minX - marginX)
      minY = Math.max(0, minY - marginY)
      maxX = Math.min(canvas.width, maxX + marginX)
      maxY = Math.min(canvas.height, maxY + marginY)
      
      const cropWidth = maxX - minX
      const cropHeight = maxY - minY
      const areaPercentage = (cropWidth * cropHeight) / (canvas.width * canvas.height)
      
      console.log('📊 Área detectada:', `${(areaPercentage * 100).toFixed(1)}%`)
      
      if (edgePixels > 100 && cropWidth > canvas.width * 0.1 && cropHeight > canvas.height * 0.1) {
        const croppedCanvas = document.createElement('canvas')
        const croppedCtx = croppedCanvas.getContext('2d')
        croppedCanvas.width = cropWidth
        croppedCanvas.height = cropHeight
        
        croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
        
        // Mejorar contraste
        const croppedImageData = croppedCtx.getImageData(0, 0, cropWidth, cropHeight)
        const croppedData = croppedImageData.data
        const contrast = 1.08
        const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100))
        
        for (let i = 0; i < croppedData.length; i += 4) {
          croppedData[i] = Math.min(255, Math.max(0, factor * (croppedData[i] - 128) + 128))
          croppedData[i + 1] = Math.min(255, Math.max(0, factor * (croppedData[i + 1] - 128) + 128))
          croppedData[i + 2] = Math.min(255, Math.max(0, factor * (croppedData[i + 2] - 128) + 128))
        }
        
        croppedCtx.putImageData(croppedImageData, 0, 0)
        
        croppedCanvas.toBlob((blob) => {
          const croppedFile = new File([blob], originalFile.name, { type: originalFile.type })
          const croppedUrl = URL.createObjectURL(blob)
          
          if (originalPreview !== preview) {
            URL.revokeObjectURL(originalPreview)
          }
          setFile(croppedFile)
          setPreview(croppedUrl)
          
          console.log('✅ Auto-enfoque aplicado')
        }, originalFile.type, 0.95)
      } else {
        console.log('⚠️ No se detectó área suficiente para recortar')
      }
    } catch (error) {
      console.error('❌ Error en auto-enfoque:', error)
    }
  }, [])
  
  return autoEnfocar
}
