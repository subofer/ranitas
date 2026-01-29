// Geometry helpers: clamp, mapRectToOriginal, addMarginToRect, areaPercentage
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// rect: { x1, y1, x2, y2 }
export function addMarginToRect(rect, marginPx, bounds = null) {
  const r = { x1: rect.x1 - marginPx, y1: rect.y1 - marginPx, x2: rect.x2 + marginPx, y2: rect.y2 + marginPx }
  if (!bounds) return r
  return {
    x1: clamp(r.x1, 0, bounds.width),
    y1: clamp(r.y1, 0, bounds.height),
    x2: clamp(r.x2, 0, bounds.width),
    y2: clamp(r.y2, 0, bounds.height),
  }
}

export function mapScaledToOriginal(rectScaled, scale) {
  return {
    x1: Math.round(rectScaled.x1 / scale),
    y1: Math.round(rectScaled.y1 / scale),
    x2: Math.round(rectScaled.x2 / scale),
    y2: Math.round(rectScaled.y2 / scale),
  }
}

export function rectWidth(rect) { return rect.x2 - rect.x1 }
export function rectHeight(rect) { return rect.y2 - rect.y1 }

export function areaPercentage(rect, bounds) {
  const w = rectWidth(rect)
  const h = rectHeight(rect)
  if (!bounds || !bounds.width || !bounds.height) return 0
  return (w * h) / (bounds.width * bounds.height)
}
