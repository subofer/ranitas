"use client"
import React, { forwardRef } from 'react'
import OptimizedImage from '@/app/components/ia/components/OptimizedImage'

// Presentation-only ImageViewer
// Props:
// - src: image source
// - points: array of { x, y } either in pixels or normalized (0..1). If normalized, they will be converted to % positions.
// - mode: rendering mode (e.g., 'quad', 'points')
// - className: additional classes
function ImageViewer({ src, points = [], mode = 'default', className = '' }, ref) {
  const isNormalized = points && points.length > 0 && points[0].x <= 1 && points[0].y <= 1

  return (
    <div ref={ref} className={`relative ${className}`}>
      <OptimizedImage src={src} alt="" className="w-full h-auto block" draggable={false} />

      {/* Overlay points */}
      {points && points.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {points.map((p, i) => {
            const left = isNormalized ? `${(p.x * 100).toFixed(3)}%` : `${p.x}px`
            const top = isNormalized ? `${(p.y * 100).toFixed(3)}%` : `${p.y}px`
            return (
              <div key={i} style={{ left, top }} className="absolute -translate-x-1/2 -translate-y-1/2">
                <div className="h-3 w-3 rounded-full bg-yellow-400 ring-2 ring-white" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default forwardRef(ImageViewer)
