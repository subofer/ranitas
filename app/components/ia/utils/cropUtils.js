export function getImgRectFromViewerRef(viewerRef) {
  try {
    const viewer = viewerRef?.current
    if (!viewer) return null
    const img = viewer.querySelector && viewer.querySelector('img')
    if (!img) return null
    return img.getBoundingClientRect()
  } catch (e) {
    return null
  }
}

export function normalizePointFromRect(clientX, clientY, rect) {
  if (!rect) return null
  const rawX = clientX - rect.left
  const rawY = clientY - rect.top
  return {
    x: Math.max(0, Math.min(1, rawX / rect.width)),
    y: Math.max(0, Math.min(1, rawY / rect.height))
  }
}

export function normalizeRectFromImageCoords(minX, maxX, minY, maxY, rect) {
  if (!rect) return []
  return [
    { x: minX / rect.width, y: minY / rect.height }, // top-left
    { x: maxX / rect.width, y: minY / rect.height }, // top-right
    { x: maxX / rect.width, y: maxY / rect.height }, // bottom-right
    { x: minX / rect.width, y: maxY / rect.height }  // bottom-left
  ]
}

// Convert a normalized point (0..1) to pixel coordinates relative to a container element
// imgRect and containerRect should be client bounding rects (getBoundingClientRect)
export function normalizedToContainerPixels(point, imgRect, containerRect) {
  if (!point || !imgRect || !containerRect) return null
  const offsetLeft = imgRect.left - containerRect.left
  const offsetTop = imgRect.top - containerRect.top
  const x = offsetLeft + point.x * imgRect.width
  const y = offsetTop + point.y * imgRect.height
  return { x, y }
}