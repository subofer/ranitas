"use client"

/**
 * Componente GuideBox - Selector/Guía reutilizable para el cropper
 * Props:
 * - guide: { x, y, width, height, type, label }
 * - color: objeto con { fill, stroke }
 * - selected: boolean - si está siendo arrastrado
 * - onCornerDrag: (corner, dx, dy) => void
 */
export default function GuideBox({ guide, color, ctx, isActive = false }) {
  if (!guide || guide.type !== 'box') return null
  
  // Dibujar el rectángulo de la guía
  ctx.strokeStyle = color.stroke
  ctx.lineWidth = isActive ? 3 : 2
  ctx.setLineDash([8, 4])
  ctx.strokeRect(guide.x, guide.y, guide.width, guide.height)
  ctx.setLineDash([])
  
  // Dibujar círculos grandes en las esquinas (puntos de control)
  const cornerRadius = 14
  ctx.fillStyle = color.stroke
  
  const corners = [
    { x: guide.x, y: guide.y }, // nw
    { x: guide.x + guide.width, y: guide.y }, // ne
    { x: guide.x, y: guide.y + guide.height }, // sw
    { x: guide.x + guide.width, y: guide.y + guide.height }, // se
  ]
  
  corners.forEach(corner => {
    ctx.beginPath()
    ctx.arc(corner.x, corner.y, cornerRadius, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 3
    ctx.stroke()
  })
  
  // Dibujar label si existe
  if (guide.label) {
    ctx.fillStyle = color.stroke
    ctx.font = 'bold 14px system-ui'
    const metrics = ctx.measureText(guide.label)
    const padding = 8
    const labelWidth = metrics.width + padding * 2
    const labelHeight = 26
    
    let labelX = guide.x
    let labelY = guide.y - labelHeight - 6
    
    // Ajustar posición si se sale del canvas
    if (labelY < 0) {
      labelY = guide.y + guide.height + 6
    }
    if (labelX + labelWidth > ctx.canvas.width) {
      labelX = ctx.canvas.width - labelWidth - 4
    }
    
    // Fondo del label
    ctx.fillStyle = color.stroke
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight)
    
    // Texto del label
    ctx.fillStyle = 'white'
    ctx.textBaseline = 'middle'
    ctx.fillText(guide.label, labelX + padding, labelY + labelHeight / 2)
  }
}

/**
 * Detectar si un punto (x, y) está sobre una esquina de la guía
 * @returns { corner: 'nw'|'ne'|'sw'|'se' } | null
 */
export function detectCornerHit(x, y, guide, hitSize = 22) {
  const corners = [
    { x: guide.x, y: guide.y, name: 'nw' },
    { x: guide.x + guide.width, y: guide.y, name: 'ne' },
    { x: guide.x, y: guide.y + guide.height, name: 'sw' },
    { x: guide.x + guide.width, y: guide.y + guide.height, name: 'se' },
  ]
  
  for (let corner of corners) {
    if (Math.abs(x - corner.x) <= hitSize && Math.abs(y - corner.y) <= hitSize) {
      return corner.name
    }
  }
  
  return null
}

/**
 * Obtener cursor apropiado para una esquina
 */
export function getCursorForCorner(cornerName) {
  const cursors = {
    'nw': 'nw-resize',
    'ne': 'ne-resize',
    'sw': 'sw-resize',
    'se': 'se-resize',
  }
  return cursors[cornerName] || 'default'
}

/**
 * Redimensionar guía desde una esquina específica
 */
export function resizeGuideFromCorner(guide, cornerName, newX, newY, cropBounds) {
  const updatedGuide = { ...guide }
  const minSize = 30
  
  // Guardar valores originales
  const originalX = guide.x
  const originalY = guide.y
  const originalWidth = guide.width
  const originalHeight = guide.height
  
  // Límites del crop
  const minX = cropBounds.x
  const minY = cropBounds.y
  const maxX = cropBounds.x + cropBounds.width
  const maxY = cropBounds.y + cropBounds.height
  
  switch (cornerName) {
    case 'nw': // Esquina superior izquierda
      const nwNewX = Math.max(minX, Math.min(newX, originalX + originalWidth - minSize))
      const nwNewY = Math.max(minY, Math.min(newY, originalY + originalHeight - minSize))
      updatedGuide.width = originalWidth + (originalX - nwNewX)
      updatedGuide.height = originalHeight + (originalY - nwNewY)
      updatedGuide.x = nwNewX
      updatedGuide.y = nwNewY
      break
      
    case 'ne': // Esquina superior derecha
      const neNewY = Math.max(minY, Math.min(newY, originalY + originalHeight - minSize))
      updatedGuide.width = Math.max(minSize, Math.min(maxX - originalX, newX - originalX))
      updatedGuide.height = originalHeight + (originalY - neNewY)
      updatedGuide.y = neNewY
      break
      
    case 'sw': // Esquina inferior izquierda
      const swNewX = Math.max(minX, Math.min(newX, originalX + originalWidth - minSize))
      updatedGuide.width = originalWidth + (originalX - swNewX)
      updatedGuide.height = Math.max(minSize, Math.min(maxY - originalY, newY - originalY))
      updatedGuide.x = swNewX
      break
      
    case 'se': // Esquina inferior derecha
      updatedGuide.width = Math.max(minSize, Math.min(maxX - originalX, newX - originalX))
      updatedGuide.height = Math.max(minSize, Math.min(maxY - originalY, newY - originalY))
      break
  }
  
  return updatedGuide
}
