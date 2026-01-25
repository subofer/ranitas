import { formatCurrency } from '@/lib/formatters'
import { prepararBusquedaWeb } from '@/prisma/serverActions/facturaActions'

/**
 * Item individual de producto en factura
 */
export function ProductoItem({ producto, index, productosBuscados, buscandoDatos, CampoEditable }) {
  const productosEncontrados = productosBuscados[producto.descripcion] || []
  const existe = productosEncontrados.length > 0 && productosEncontrados[0].similitud > 0.7
  
  const handleAgregarStock = () => {
    console.log('Agregar stock:', producto, productosEncontrados[0])
    alert(`Agregar ${producto.cantidad} de "${producto.descripcion}"\nFuncionalidad en desarrollo`)
  }
  
  const handleNuevoProducto = () => {
    console.log('Nuevo producto:', producto)
    alert(`Crear: "${producto.descripcion}"\nFuncionalidad en desarrollo`)
  }
  
  const handleBuscarWeb = async () => {
    const urls = await prepararBusquedaWeb(producto.descripcion)
    const confirmacion = confirm(
      `Buscar "${producto.descripcion}" en:\n\n` +
      `1. Google\n2. Mercado Libre\n3. Google Imágenes\n\n` +
      `¿Abrir búsqueda en Google?`
    )
    if (confirmacion) {
      window.open(urls.google, '_blank')
    }
  }
  
  return (
    <div className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-md hover:shadow-lg hover:border-purple-400 transition-all">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-start gap-2">
                <CampoEditable 
                  valor={producto.descripcion?.trim() || producto.detalle?.trim() || producto.producto?.trim() || 'Producto sin nombre'}
                  path={`items.${index}.${producto.descripcion !== undefined ? 'descripcion' : producto.detalle !== undefined ? 'detalle' : 'producto'}`}
                  className="font-bold text-gray-900 text-base leading-tight flex-1"
                />
                {producto.revisar && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-medium whitespace-nowrap" title="Dato con dudas - Requiere revisión">
                    ⚠️ Revisar
                  </span>
                )}
              </div>
              {productosEncontrados.length > 0 && productosEncontrados[0].mejorAlias && (
                <div className="text-xs text-gray-500 mt-1">
                  Alias: <span className="font-medium text-blue-600">{productosEncontrados[0].mejorAlias}</span>
                </div>
              )}
            </div>
            {!buscandoDatos && (
              <div className="flex-shrink-0">
                {existe ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
                    ✓ Existe
                  </span>
                ) : productosEncontrados.length > 0 ? (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">
                    ~ Similar
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-medium">
                    ✕ Nuevo
                  </span>
                )}
              </div>
            )}
          </div>
          
          {productosEncontrados.length > 0 && (
            <details className="mb-2">
              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                {productosEncontrados.length} producto{productosEncontrados.length > 1 ? 's' : ''} similar{productosEncontrados.length > 1 ? 'es' : ''}
              </summary>
              <div className="mt-1 space-y-1">
                {productosEncontrados.slice(0, 3).map((prod, idx) => (
                  <div key={idx} className="text-xs bg-gray-50 rounded p-2 border border-gray-200">
                    <div className="font-medium">{prod.nombre}</div>
                    <div className="text-gray-600">
                      Stock: {prod.stock_base} • Similitud: {(prod.similitud * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
          
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 uppercase">Cantidad</div>
              <CampoEditable 
                valor={producto.cantidad || ''}
                path={`items.${index}.cantidad`}
                tipo="number"
                className="font-bold text-purple-700"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">P. Unitario</div>
              <CampoEditable 
                valor={producto.precio_unitario || 0}
                path={`items.${index}.precio_unitario`}
                tipo="number"
                className="font-mono"
                formatear={formatCurrency}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Subtotal</div>
              <CampoEditable 
                valor={producto.subtotal || 0}
                path={`items.${index}.subtotal`}
                tipo="number"
                className="font-mono font-bold text-purple-900"
                formatear={formatCurrency}
              />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {existe ? (
            <button 
              className="px-3 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
              title="Agregar al stock existente"
              onClick={handleAgregarStock}
            >
              + Stock
            </button>
          ) : (
            <>
              <button 
                className="px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                title="Crear nuevo producto"
                onClick={handleNuevoProducto}
              >
                Nuevo
              </button>
              <button 
                className="px-3 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
                title="Buscar en internet"
                onClick={handleBuscarWeb}
              >
                🔍 Web
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
