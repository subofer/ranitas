"use client"
import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react'
import OptimizedImage from '@/app/components/ia/components/OptimizedImage'

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
    if (ref?.current) {
      const updateDimensions = () => {
        if (ref.current) {
          // Use container dimensions directly - assume image fills container
          const containerWidth = ref.current.clientWidth
          const containerHeight = ref.current.clientHeight
          
          console.log('Setting container dimensions to:', { containerWidth, containerHeight, zoom })
          
          setContainerDimensions({
            width: containerWidth,
            height: containerHeight
          })
        }
      }
      updateDimensions()
      // Also listen for resize events
      window.addEventListener('resize', updateDimensions)
      return () => window.removeEventListener('resize', updateDimensions)
    }
  }, [ref, zoom])

  // Also update dimensions when image loads
  useEffect(() => {
    if (localImageRef?.current) {
      const updateImageDimensions = () => {
        if (localImageRef.current) {
          // When image loads, ensure container dimensions are up to date
          if (ref?.current) {
            const containerWidth = ref.current.clientWidth
            const containerHeight = ref.current.clientHeight

            
            setContainerDimensions({
              width: containerWidth,
              height: containerHeight
            })
          }
        }
      }
      updateImageDimensions()
    }
  }, [localImageRef, ref])

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
    const rawX = e.clientX - rect.left
    const rawY = e.clientY - rect.top
    const normalizedX = rawX / (rect.width / zoom)
    const normalizedY = rawY / (rect.height / zoom)
    const x = Math.max(0, Math.min(1, normalizedX))
    const y = Math.max(0, Math.min(1, normalizedY))

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
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width / zoom)))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height / zoom)))

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

          {/* Dark overlay with polygon cutout - DISABLED FOR DEBUG */}
          {false && points.length >= 3 && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="absolute inset-0 w-full h-full">
                {(() => {
                  const maskId = `polygon-mask-${Math.random().toString(36).substr(2, 9)}`;
                  const polygonPoints = points.map(p => `${p.x * 100}% ${p.y * 100}%`).join(' ');
                  console.log('Creating mask with points:', polygonPoints);
                  return (
                    <>
                      <defs>
                        <mask id={maskId}>
                          <rect width="100%" height="100%" fill="white" />
                          <polygon points={polygonPoints} fill="black" />
                        </mask>
                      </defs>
                      <rect width="100%" height="100%" fill="black" mask={`url(#${maskId})`} />
                    </>
                  );
                })()}
              </svg>
            </div>
          )}
          
          {/* Polygon lines */}
          {points.length > 1 && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="absolute inset-0 w-full h-full">
                {/* Draw lines between consecutive points */}
                {points.map((p, i) => {
                  if (i === 0) return null // Don't draw line for first point
                  const prev = points[i - 1]
                  
                  // Get image dimensions for calculations
                  const img = localImageRef?.current
                  const imgRect = img ? img.getBoundingClientRect() : null
                  const baseWidth = imgRect ? imgRect.width / zoom : containerDimensions.width || 100
                  const baseHeight = imgRect ? imgRect.height / zoom : containerDimensions.height || 100
                  
                  const prevX = prev.x * baseWidth * zoom + pan.x / zoom
                  const prevY = prev.y * baseHeight * zoom + pan.y / zoom
                  const currX = p.x * baseWidth * zoom + pan.x / zoom
                  const currY = p.y * baseHeight * zoom + pan.y / zoom
                  
                  return (
                    <line
                      key={`line-${i}`}
                      x1={`${prevX}px`}
                      y1={`${prevY}px`}
                      x2={`${currX}px`}
                      y2={`${currY}px`}
                      stroke="#2563eb"
                      strokeWidth="3"
                      opacity="0.8"
                    />
                  )
                })}
                {/* Close the polygon if we have 4 points */}
                {points.length === 4 && (() => {
                  const first = points[0]
                  const last = points[3]
                  
                  // Get image dimensions for calculations
                  const img = localImageRef?.current
                  const imgRect = img ? img.getBoundingClientRect() : null
                  const baseWidth = imgRect ? imgRect.width / zoom : containerDimensions.width || 100
                  const baseHeight = imgRect ? imgRect.height / zoom : containerDimensions.height || 100
                  
                  const firstX = first.x * baseWidth * zoom + pan.x / zoom
                  const firstY = first.y * baseHeight * zoom + pan.y / zoom
                  const lastX = last.x * baseWidth * zoom + pan.x / zoom
                  const lastY = last.y * baseHeight * zoom + pan.y / zoom
                  
                  return (
                    <line
                      x1={`${lastX}px`}
                      y1={`${lastY}px`}
                      x2={`${firstX}px`}
                      y2={`${firstY}px`}
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
          {points.map((p, i) => {
            // Calculate position considering zoom and pan transformations
            // Use consistent base dimensions
            const img = localImageRef?.current
            const imgRect = img ? img.getBoundingClientRect() : null
            const baseWidth = imgRect ? imgRect.width / zoom : containerDimensions.width || 100
            const baseHeight = imgRect ? imgRect.height / zoom : containerDimensions.height || 100
            
            const scaledX = p.x * baseWidth * zoom + pan.x / zoom
            const scaledY = p.y * baseHeight * zoom + pan.y / zoom
            
            const left = `${scaledX}px`
            const top = `${scaledY}px`
            
            return (
              <div 
                key={i} 
                style={{ left, top }} 
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move hover:scale-110 transition-transform z-10"
                onMouseDown={(e) => handlePointMouseDown(e, i)}
              >
                <div className="h-4 w-4 rounded-full bg-blue-900 ring-2 ring-white shadow-lg" />
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

export default forwardRef(ImageViewer)
