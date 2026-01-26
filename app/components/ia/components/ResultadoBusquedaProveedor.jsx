/**
 * Resultado de búsqueda de proveedor
 */
export function ResultadoBusquedaProveedor({ proveedorEncontrado }) {
  if (!proveedorEncontrado) return null
  
  const bgColor = proveedorEncontrado.confianza === 'alta' ? 'bg-green-50 border-green-400' :
                  proveedorEncontrado.confianza === 'media' ? 'bg-yellow-50 border-yellow-400' :
                  'bg-orange-50 border-orange-400'
  
  const icon = proveedorEncontrado.confianza === 'alta' ? '✅' : 
               proveedorEncontrado.confianza === 'media' ? '🟡' : '🟠'
  
  const titulo = proveedorEncontrado.confianza === 'alta' ? 'Proveedor identificado' :
                 proveedorEncontrado.confianza === 'media' ? 'Posible proveedor' :
                 'Proveedor similar encontrado'
  
  return (
    <div className={`border-2 rounded-lg p-4 mb-4 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <div className="font-bold text-gray-900 mb-1">{titulo}</div>
          <div className="text-sm text-gray-800">
            <strong>{proveedorEncontrado.proveedor.nombre}</strong>
            {proveedorEncontrado.proveedor.nombreFantasia && (
              <span className="text-gray-600"> ({proveedorEncontrado.proveedor.nombreFantasia})</span>
            )}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            CUIT: {proveedorEncontrado.proveedor.cuit} • 
            Encontrado por: {proveedorEncontrado.metodo === 'cuit' ? 'CUIT exacto' : 'nombre similar'}
          </div>
          {proveedorEncontrado.alternativas && proveedorEncontrado.alternativas.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                Ver {proveedorEncontrado.alternativas.length} alternativas
              </summary>
              <div className="mt-2 space-y-1">
                {proveedorEncontrado.alternativas.map((alt, i) => (
                  <div key={i} className="text-xs bg-white rounded p-2 border border-gray-200">
                    {alt.nombre} • CUIT: {alt.cuit}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
