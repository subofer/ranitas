import { formatCurrency } from '@/lib/formatters'

export default function FacturaResumenFooter({ parsedData, proveedorEncontrado, aliasesPorItem = [], productosBuscados = {}, onGuardarFactura, guardando }) {
  const totalItems = parsedData?.items?.length || 0
  const identificados = aliasesPorItem.filter(a => a.mapeado).length
  const conAlias = aliasesPorItem.filter(a => a.tieneAlias).length
  const sinAlias = totalItems - conAlias
  const sinMapear = aliasesPorItem.filter(a => a.tieneAlias && !a.mapeado).length

  return (
    <div className="mt-6 bg-white border-t border-gray-200 pt-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-2">Resumen 📋</div>
            <div className="flex gap-3 flex-wrap items-center">
              <div className="bg-green-50 text-green-800 px-3 py-1 rounded font-medium text-sm">
                {proveedorEncontrado?.proveedor ? `✅ Proveedor: ${proveedorEncontrado.proveedor.nombre}` : '⚠️ Proveedor no identificado'}
              </div>
              {proveedorEncontrado?.alternativas && proveedorEncontrado.alternativas.length > 0 && (
                <div className="text-xs text-gray-600">Alternativas: {proveedorEncontrado.alternativas.map(a => a.nombre).join(' • ')}</div>
              )}

              <div className="text-sm text-gray-700">Productos identificados: <strong>{identificados}</strong> / {totalItems}</div>
              <div className="text-sm text-gray-700">Con alias: <strong>{conAlias}</strong></div>
              <div className="text-sm text-gray-700">Sin alias: <strong>{sinAlias}</strong></div>
              <div className="text-sm text-orange-700">Alias sin mapear: <strong>{sinMapear}</strong></div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Revisa los items y proveedores antes de guardar. El botón de guardar está abajo para que puedas revisar todo.
            </div>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={() => onGuardarFactura && onGuardarFactura()}
              disabled={!onGuardarFactura || guardando || !proveedorEncontrado?.proveedor}
              className={`px-5 py-2 rounded-full font-semibold ${guardando ? 'bg-gray-300 text-gray-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {guardando ? 'Guardando...' : 'Guardar Factura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}