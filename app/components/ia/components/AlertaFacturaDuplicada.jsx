import { formatDate, formatCurrency } from '@/lib/formatters'

/**
 * Alerta de factura duplicada
 */
export function AlertaFacturaDuplicada({ factura }) {
  if (!factura) return null
  
  return (
    <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="text-3xl">⚠️</div>
        <div className="flex-1">
          <div className="font-bold text-red-900 mb-1">Factura duplicada detectada</div>
          <div className="text-sm text-red-800">
            Esta factura ya fue cargada el {formatDate(factura.fecha)}
          </div>
          <div className="text-xs text-red-700 mt-1">
            Estado: <span className="font-medium">{factura.estado}</span> • 
            Total: <span className="font-medium">{formatCurrency(factura.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
