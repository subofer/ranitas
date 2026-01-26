/**
 * Constantes para el procesamiento de imágenes con IA
 */

export const DEFAULT_ADJUSTMENTS = {
  contraste: 100,
  brillo: 100,
  saturacion: 100,
  zoom: 1, // mantenemos zoom global pero lo dejamos por compatibilidad
  panX: 0,
  panY: 0,
  afilar: 0,      // 0-100
  bordes: 0       // 0-100
}

export const MODES = [
  { value: 'factura', label: '🧾 Factura' },
  { value: 'producto', label: '📦 Producto' },
  { value: 'general', label: '🔍 General' }
]
