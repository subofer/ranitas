/**
 * Hook personalizado para aplicar transformaciones a imágenes
 * Maneja contraste, brillo, saturación, zoom y pan
 */

import { useCallback } from 'react'

export function useImageTransformations(preview, imgOriginalRef, canvasRef, ajustes, zoom, pan) {
  const aplicarTransformaciones = useCallback(() => {
    if (!preview || !imgOriginalRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const img = imgOriginalRef.current

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Aplicar filtros básicos
    ctx.filter = `
      contrast(${ajustes.contraste}%)
      brightness(${ajustes.brillo}%)
      saturate(${ajustes.saturacion}%)
    `

    const escala = typeof zoom === 'number' ? zoom : (ajustes.zoom || 1)
    const offsetX = (pan?.x ?? (ajustes.panX || 0)) * canvas.width
    const offsetY = (pan?.y ?? (ajustes.panY || 0)) * canvas.height

    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(escala, escala)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)
    ctx.translate(offsetX, offsetY)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    // Obtener datos para convoluciones (afilar / bordes)
    const afilar = Number(ajustes.afilar || 0)
    const bordes = Number(ajustes.bordes || 0)

    if ((afilar > 0 || bordes > 0) && canvas.width > 0 && canvas.height > 0) {
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        let data = imageData.data

        // Helper: aplicar kernel de convolución
        const applyKernel = (srcData, width, height, kernel, factor = 1) => {
          const out = new Uint8ClampedArray(srcData.length)
          const kSize = Math.sqrt(kernel.length)
          const half = Math.floor(kSize / 2)

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              let r = 0, g = 0, b = 0
              for (let ky = -half; ky <= half; ky++) {
                for (let kx = -half; kx <= half; kx++) {
                  const ix = Math.min(width - 1, Math.max(0, x + kx))
                  const iy = Math.min(height - 1, Math.max(0, y + ky))
                  const idx = (iy * width + ix) * 4
                  const kval = kernel[(ky + half) * kSize + (kx + half)]
                  r += srcData[idx] * kval
                  g += srcData[idx + 1] * kval
                  b += srcData[idx + 2] * kval
                }
              }
              const outIdx = (y * width + x) * 4
              out[outIdx] = Math.min(255, Math.max(0, r * factor))
              out[outIdx + 1] = Math.min(255, Math.max(0, g * factor))
              out[outIdx + 2] = Math.min(255, Math.max(0, b * factor))
              out[outIdx + 3] = srcData[(y * width + x) * 4 + 3]
            }
          }
          return out
        }

        const width = canvas.width
        const height = canvas.height

        // Primero aplicar afilado (sharpen) si corresponde
        if (afilar > 0) {
          // s normalizado en 0..1
          const s = Math.min(1, afilar / 100)
          // Base kernel sharpen
          // kernel: 0 -1 0 / -1 5 -1 / 0 -1 0, ajustado por s
          const center = 1 + 4 * s
          const neg = s
          const kernel = [0, -neg, 0, -neg, center, -neg, 0, -neg, 0]

          const sharpened = applyKernel(data, width, height, kernel, 1)
          // Recombinar: simple reemplazo de canales
          for (let i = 0; i < data.length; i++) {
            if ((i + 1) % 4 === 0) continue
            data[i] = sharpened[i]
          }
        }

        // Luego aplicar detector de bordes (Laplacian) y mezclar
        if (bordes > 0) {
          const bFactor = Math.min(1, bordes / 100)
          const lap = [-1, -1, -1, -1, 8, -1, -1, -1, -1]
          const edges = applyKernel(data, width, height, lap, 1)

          // Mezclar bordes: sumarlos (positive) para resaltar contornos
          for (let i = 0; i < data.length; i += 4) {
            // compute magnitude from edges (use red channel)
            const e = Math.abs(edges[i])
            const blend = Math.min(255, Math.round(e * bFactor))
            data[i] = Math.min(255, data[i] + blend)
            data[i + 1] = Math.min(255, data[i + 1] + blend)
            data[i + 2] = Math.min(255, data[i + 2] + blend)
          }
        }

        // Poner de nuevo en canvas
        ctx.putImageData(new ImageData(data, width, height), 0, 0)
      } catch (e) {
        console.warn('Error aplicando afilado/bordes en canvas:', e)
      }
    }
  }, [ajustes, preview, canvasRef, imgOriginalRef, zoom, pan])

  return aplicarTransformaciones
}
