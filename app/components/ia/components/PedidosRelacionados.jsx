import { formatDate, formatCurrency } from '@/lib/formatters'

/**
 * Lista de pedidos relacionados
 */
export function PedidosRelacionados({ pedidos }) {
  if (!pedidos || pedidos.length === 0) return null
  
  const getEstadoClass = (estado) => {
    if (estado === 'pendiente') return 'bg-yellow-100 text-yellow-800'
    if (estado === 'enviado') return 'bg-blue-100 text-blue-800'
    return 'bg-green-100 text-green-800'
  }
  
  return (
    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 mb-4">
      <div className="font-bold text-purple-900 mb-2">📋 Pedidos relacionados ({pedidos.length})</div>
      <div className="space-y-2">
        {pedidos.map(pedido => (
          <div key={pedido.id} className="bg-white rounded-lg p-3 border border-purple-200 text-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-gray-900">Pedido #{pedido.id}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEstadoClass(pedido.estado)}`}>
                {pedido.estado}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              Fecha: {formatDate(pedido.fecha_pedido)} • 
              Total: {formatCurrency(pedido.total)} • 
              {pedido.items.length} productos
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
