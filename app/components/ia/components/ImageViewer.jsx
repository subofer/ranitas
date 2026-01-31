"use client"
import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react'
import OptimizedImage from '@/app/components/ia/components/OptimizedImage'
import { normalizePointFromRect, normalizedToContainerPixels } from '../utils/cropUtils'

// Presentation-only ImageViewer
// Props:
// - src: image source
// - points: array of { x, y } either in pixels or normalized (0..1). If normalized, they will be converted to % positions.
// - mode: rendering mode (e.g., 'quad', 'points')
// - className: additional classes
// - cropMode: if true, allow clicking to add points
// - onPointAdd: callback when a point is added (receives {x, y} in pixels)
// - zoom: current zoom level
// - pan: current pan {x, y}
function ImageViewer({ src, points = [], mode = 'default', className = '', cropMode = false, onPointAdd, onPointUpdate, zoom = 1, pan = {x: 0, y: 0}, imageRef }, ref) {
  const isNormalized = points && points.length > 0 && points[0].x <= 1 && points[0].y <= 1
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })
  const localImageRef = useRef(null)
  const [draggedPointIndex, setDraggedPointIndex] = useState(null)

  console.log('ImageViewer render:', { cropMode, points: points.length, onPointAdd: !!onPointAdd, zoom, pan })

  // Get container dimensions after mount
  useEffect(() => {
    // Use the displayed image dimensions (offsetWidth/offsetHeight) so overlays match rendered image
    const updateDimensions = () => {
      if (localImageRef?.current) {
        // Save unscaled image dimensions (original image coordinate space)
        const containerWidth = localImageRef.current.offsetWidth / zoom
        const containerHeight = localImageRef.current.offsetHeight / zoom

        console.log('Setting container (unscaled) dimensions to:', { containerWidth, containerHeight, zoom })

        setContainerDimensions({
          width: containerWidth,
          height: containerHeight
        })
      } else if (ref?.current) {
        // Fallback to container size
        const containerWidth = ref.current.clientWidth
        const containerHeight = ref.current.clientHeight
        setContainerDimensions({ width: containerWidth, height: containerHeight })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [ref, zoom, localImageRef])

  // Also update dimensions when image loads
  useEffect(() => {
    if (localImageRef?.current) {
      const updateImageDimensions = () => {
        if (localImageRef.current) {
          const containerWidth = localImageRef.current.offsetWidth / zoom
          const containerHeight = localImageRef.current.offsetHeight / zoom

          setContainerDimensions({
            width: containerWidth,
            height: containerHeight
          })
        }
      }
      updateImageDimensions()
    }
  }, [localImageRef, ref, zoom])

  // Handle clicks on the image when in crop mode
  const handleImageClick = (e) => {
    // Don't add new points if we're dragging
    if (draggedPointIndex !== null) return

    console.log('ImageViewer handleImageClick called:', { cropMode, onPointAdd, event: e.type, target: e.target.tagName })
    if (!cropMode || !onPointAdd) {
      console.log('Crop mode not active or no onPointAdd, returning')
      return
    }

    // Find the image element within the container
    const img = e.currentTarget.querySelector('img')
    if (!img) {
      console.log('No image found in container')
      return
    }

    const rect = img.getBoundingClientRect()

    // Debug: log detailed information
    console.log('=== COORDINATE CALCULATION DEBUG ===')
    console.log('Event:', { clientX: e.clientX, clientY: e.clientY })
    console.log('Rect:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    console.log('Image natural:', { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight })
    console.log('Image displayed:', { offsetWidth: img.offsetWidth, offsetHeight: img.offsetHeight })
    console.log('Transform:', { zoom, pan })

    // CORRECTED APPROACH: getBoundingClientRect() gives us the bounds of the transformed image
    // To get normalized coordinates, we need to account for the zoom scaling
    const normalized = normalizePointFromRect(e.clientX, e.clientY, rect)
    if (!normalized) return
    const { x, y } = normalized

    console.log('=== DETAILED COORDINATE CALCULATION ===')
    console.log('Raw click:', { clientX: e.clientX, clientY: e.clientY })
    console.log('Rect bounds:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    console.log('Relative position:', { rawX, rawY })
    console.log('Zoom correction:', { zoom, rectWidthDivZoom: rect.width / zoom, rectHeightDivZoom: rect.height / zoom })
    console.log('Normalized before clamp:', { normalizedX, normalizedY })
    console.log('Final normalized:', { x, y })
    console.log('Container dimensions:', containerDimensions)
    console.log('=== END DETAILED DEBUG ===')

    onPointAdd({ x, y })
  }

  // Handle dragging points
  const handlePointMouseDown = (e, index) => {
    e.stopPropagation() // Prevent triggering handleImageClick
    setDraggedPointIndex(index)
  }

  // Update dragged point position
  const updateDraggedPoint = useCallback((e) => {
    if (draggedPointIndex === null) return

    const img = localImageRef.current
    if (!img) {
      console.log('No image ref for drag update')
      return
    }

    const rect = img.getBoundingClientRect()
    console.log('=== DRAG COORDINATE CALCULATION DEBUG ===')
    console.log('Event:', { clientX: e.clientX, clientY: e.clientY })
    console.log('Rect:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    console.log('Image natural:', { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight })
    console.log('Image displayed:', { offsetWidth: img.offsetWidth, offsetHeight: img.offsetHeight })
    console.log('Transform:', { zoom, pan })

    // CORRECTED APPROACH: getBoundingClientRect() gives us the bounds of the transformed image
    // To get normalized coordinates, we need to account for the zoom scaling
    const normalized = normalizePointFromRect(e.clientX, e.clientY, rect)
    if (!normalized) return
    const { x, y } = normalized

    console.log('Drag corrected calculation:', { x, y, rectWidth: rect.width, rectHeight: rect.height, zoom })
    console.log('=== END DRAG DEBUG ===')

    if (onPointUpdate) {
      onPointUpdate(draggedPointIndex, { x, y })
    }
  }, [draggedPointIndex, zoom, pan, onPointUpdate])

  // Stop dragging
  const stopDragging = useCallback(() => {
    setDraggedPointIndex(null)
  }, [])

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (draggedPointIndex !== null) {
      console.log('Adding drag listeners for point:', draggedPointIndex)
      document.addEventListener('mousemove', updateDraggedPoint)
      document.addEventListener('mouseup', stopDragging)
      return () => {
        console.log('Removing drag listeners')
        document.removeEventListener('mousemove', updateDraggedPoint)
        document.removeEventListener('mouseup', stopDragging)
      }
    }
  }, [draggedPointIndex, updateDraggedPoint, stopDragging])

  return (
    <div 
      ref={ref} 
      className={`relative ${className}`}
      onClick={handleImageClick}
      style={{ cursor: draggedPointIndex !== null ? 'grabbing' : cropMode ? 'crosshair' : 'default' }}
    >
      <OptimizedImage 
        ref={localImageRef}
        src={src} 
        alt="" 
        className="w-full h-auto block" 
        draggable={false}
        style={{
          transform: `translate(${pan.x / zoom}px, ${pan.y / zoom}px) scale(${zoom})`,
          transformOrigin: 'top left'
        }}
      />

      {/* Overlay points and polygon */}
      {points && points.length > 0 && (
        <>
          {/* Debug info */}
          <div className="absolute top-0 left-0 bg-black bg-opacity-50 text-white text-xs p-1 z-50">
            Image: {localImageRef?.current ? `${Math.round(localImageRef.current.offsetWidth)}x${Math.round(localImageRef.current.offsetHeight)}` : '0x0'} |
            Zoom: {zoom} |
            Pan: {pan.x.toFixed(0)},{pan.y.toFixed(0)}
          </div>

          {/* Dark overlay with polygon cutout */}
          {points.length >= 3 && (() => {
            const imgRect = localImageRef?.current?.getBoundingClientRect()
            const containerRect = ref?.current?.getBoundingClientRect()
            if (!imgRect || !containerRect) return null
            const maskId = `polygon-mask-${Math.random().toString(36).substr(2, 9)}`
            const polygonPoints = points.map(p => {
              const pos = normalizedToContainerPixels(p, imgRect, containerRect)
              if (!pos) return '0,0'
              return `${pos.x},${pos.y}`
            }).join(' ')

            return (
              <div className="absolute inset-0 pointer-events-none z-20">
                <svg className="absolute inset-0 w-full h-full">
                  <defs>
                    <mask id={maskId}>
                      <rect width="100%" height="100%" fill="white" />
                      <polygon points={polygonPoints} fill="black" />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="black" mask={`url(#${maskId})`} opacity="0.75" />
                </svg>
              </div>
            )
          })()}
          
          {/* Polygon lines */}
          {points.length > 1 && (
            <div 
              className="absolute inset-0 pointer-events-none z-30"
            >
              <svg className="absolute inset-0 w-full h-full">
                {/* Draw lines between consecutive points using absolute pixel coords */}
                {(() => {
                  const imgRect = localImageRef?.current?.getBoundingClientRect()
                  const containerRect = ref?.current?.getBoundingClientRect()
                  if (!imgRect || !containerRect) return null

                  return points.map((p, i) => {
                    if (i === 0) return null
                    const prev = points[i - 1]
                    const prevPos = normalizedToContainerPixels(prev, imgRect, containerRect)
                    const currPos = normalizedToContainerPixels(p, imgRect, containerRect)
                    if (!prevPos || !currPos) return null

                    return (
                      <line
                        key={`line-${i}`}
                        x1={prevPos.x}
                        y1={prevPos.y}
                        x2={currPos.x}
                        y2={currPos.y}
                        stroke="#2563eb"
                        strokeWidth="3"
                        opacity="0.8"
                      />
                    )
                  })
                })()}

                {/* Close the polygon if we have 4 points */}
                {points.length === 4 && (() => {
                  const imgRect = localImageRef?.current?.getBoundingClientRect()
                  const containerRect = ref?.current?.getBoundingClientRect()
                  if (!imgRect || !containerRect) return null

                  const firstPos = normalizedToContainerPixels(points[0], imgRect, containerRect)
                  const lastPos = normalizedToContainerPixels(points[3], imgRect, containerRect)
                  if (!firstPos || !lastPos) return null

                  return (
                    <line
                      x1={lastPos.x}
                      y1={lastPos.y}
                      x2={firstPos.x}
                      y2={firstPos.y}
                      stroke="#2563eb"
                      strokeWidth="3"
                      opacity="0.8"
                    />
                  )
                })()}
              </svg>
            </div>
          )}
          
          {/* Interactive Points - OUTSIDE pointer-events-none container */}
          {(() => {
            const imgRect = localImageRef?.current?.getBoundingClientRect()
            const containerRect = ref?.current?.getBoundingClientRect()
            if (!imgRect || !containerRect) return null

            return points.map((p, i) => {
              const pos = normalizedToContainerPixels(p, imgRect, containerRect)
              if (!pos) return null

              const left = `${pos.x}px`
              const top = `${pos.y}px`

              return (
                <div
                  key={i}
                  style={{ left, top }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move hover:scale-110 transition-transform z-40"
                  onMouseDown={(e) => handlePointMouseDown(e, i)}
                >
                  <div className="h-4 w-4 rounded-full bg-blue-900 ring-2 ring-white shadow-lg" />
                </div>
              )
            })
          })()}
        </>
      )}
    </div>
  )
}

export default forwardRef(ImageViewer)
