import { formatCurrency } from '@/lib/formatters'

/**
 * Sección de totales de factura
 */
export function TotalesFactura({ totales, items = [], CampoEditable }) {
  // Calcular subtotal si no viene en totales
  const computedSubtotal = typeof totales?.neto === 'number'
    ? totales.neto
    : (Array.isArray(items) ? items.reduce((s, it) => {
        const unit = Number(it.precio_unitario ?? it.precio ?? 0)
        const qty = Number(it.cantidad_documento ?? it.cantidad ?? 0)
        const line = Number((it.subtotal_calculado ?? it.subtotal_original ?? (unit * qty)) || 0)
        return s + (isFinite(line) ? line : 0)
      }, 0) : 0)

  // Calcular descuentos
  const discountFromTotales = typeof totales?.descuento_total === 'number' ? totales.descuento_total : (typeof totales?.descuento === 'number' ? totales.descuento : 0)
  const itemsDiscount = Array.isArray(items) ? items.reduce((s, it) => s + (Number(it.descuento || 0)), 0) : 0
  const totalDescuento = discountFromTotales || itemsDiscount || 0

  // Devoluciones (sumar subtotales de items marcados como devolución)
  const devolucionesSum = Array.isArray(items) ? items.reduce((s, it) => {
    if (!it) return s
    const isDevol = !!it.es_devolucion || !!it.devolucion
    if (!isDevol) return s
    const unit = Number(it.precio_unitario ?? it.precio ?? 0)
    const qty = Number(it.cantidad_documento ?? it.cantidad ?? 0)
    const line = Number((it.subtotal_calculado ?? it.subtotal_original ?? (unit * qty)) || 0)
    return s + (isFinite(line) ? line : 0)
  }, 0) : 0

  // IVA / impuestos aplicados
  const iva = typeof totales?.iva === 'number' ? totales.iva : undefined
  const impuestosApplied = typeof totales?.impuestos_total === 'number' ? totales.impuestos_total : (typeof totales?.iva === 'number' ? totales.iva : 0)
  const impuestosDetalle = Array.isArray(totales?.impuestos) ? totales.impuestos : null

  // Totales principales
  const totalCalculado = typeof totales?.total_calculado === 'number' ? totales.total_calculado : (typeof totales?.total === 'number' ? totales.total : undefined)
  const totalImpreso = typeof totales?.total_impreso === 'number' ? totales.total_impreso : undefined

  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
      <div className="font-bold text-yellow-900 mb-3 text-lg">💰 Totales</div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span>Subtotal:</span>
          <span className="font-mono font-medium">{formatCurrency(computedSubtotal)}</span>
        </div>

        {devolucionesSum !== 0 && (
          <div className="flex justify-between items-center text-sm text-gray-700">
            <span>Devoluciones:</span>
            <span className="font-mono text-red-700">- {formatCurrency(Math.abs(devolucionesSum))}</span>
          </div>
        )}

        {totalDescuento > 0 && (
          <div className="flex justify-between items-center text-sm text-gray-700">
            <span>Descuentos:</span>
            <span className="font-mono text-red-700">- {formatCurrency(totalDescuento)}</span>
          </div>
        )}

        {impuestosApplied > 0 && (
          <div className="flex justify-between items-center">
            <span>Impuestos aplicados:</span>
            <span className="font-mono font-medium">{formatCurrency(impuestosApplied)}</span>
          </div>
        )}

        {impuestosDetalle && impuestosDetalle.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            <div className="font-medium mb-1">Detalle de impuestos:</div>
            <div className="space-y-1">
              {impuestosDetalle.map((imp, i) => (
                <div key={i} className="flex justify-between">
                  <div>{imp.nombre || imp.tipo || `Impuesto ${i+1}`}</div>
                  <div className="font-mono">{formatCurrency(Number(imp.monto || imp.valor || 0))}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t-2 border-yellow-400 pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">TOTAL (calculado):</span>
            <span className="font-black text-2xl text-yellow-900">{formatCurrency(totalCalculado ?? 0)}</span>
          </div>
        </div>

        {(totalImpreso !== undefined || (totales?.diferencia !== undefined)) && (
          <div className="border-t border-yellow-300 pt-2 mt-2">
            {totalImpreso !== undefined && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Total impreso:</span>
                <span className="font-mono font-medium">{formatCurrency(totalImpreso)}</span>
              </div>
            )}

            {totales?.diferencia !== undefined && totales?.diferencia !== 0 && (
              <div className={`flex justify-between items-center text-sm font-bold mt-1 p-2 rounded ${
                Math.abs(totales.diferencia) > 0.01 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                <span>⚠️ Diferencia:</span>
                <span className="font-mono">{formatCurrency(totales.diferencia)}</span>
              </div>
            )}

            {totales?.detalle_diferencia && (
              <div className="text-xs text-gray-600 mt-1 italic">
                {totales.detalle_diferencia}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
