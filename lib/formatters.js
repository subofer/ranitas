/**
 * Utilidades de formato compartidas en toda la aplicación
 */

/**
 * Formatea un número como moneda argentina
 * @param {number|string} value - Valor a formatear
 * @returns {string} Valor formateado como moneda (ej: "$1.234,56")
 */
export const formatCurrency = (value) => {
  const num = parseFloat(value || 0)
  return `$${num.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

/**
 * Formatea una fecha al formato argentino
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada (ej: "24/01/2026")
 */
export const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es-AR')
}

/**
 * Formatea una fecha y hora al formato argentino
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha y hora formateada (ej: "24/01/2026, 15:30:45")
 */
export const formatDateTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('es-AR')
}

/**
 * Formatea un número como porcentaje
 * @param {number} value - Valor a formatear (0-1 o 0-100)
 * @param {boolean} isDecimal - Si el valor está en formato decimal (0-1)
 * @returns {string} Valor formateado como porcentaje
 */
export const formatPercentage = (value, isDecimal = false) => {
  const num = isDecimal ? value * 100 : value
  return `${num.toFixed(0)}%`
}
