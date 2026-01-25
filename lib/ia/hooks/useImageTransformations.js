/**
 * Hook personalizado para aplicar transformaciones a imágenes
 * Maneja contraste, brillo, saturación, zoom y pan
 */

import { useCallback } from 'react'

export function useImageTransformations(preview, imgOriginalRef, canvasRef, ajustes) {
  const aplicarTransformaciones = useCallback(() => {
    if (!preview || !imgOriginalRef.current) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const img = imgOriginalRef.current
    
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    ctx.filter = `
      contrast(${ajustes.contraste}%)
      brightness(${ajustes.brillo}%)
      saturate(${ajustes.saturacion}%)
    `
    
    const escala = ajustes.zoom
    const offsetX = ajustes.panX * canvas.width
    const offsetY = ajustes.panY * canvas.height
    
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(escala, escala)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)
    ctx.translate(offsetX, offsetY)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.restore()
  }, [ajustes, preview, canvasRef, imgOriginalRef])
  
  return aplicarTransformaciones
}
