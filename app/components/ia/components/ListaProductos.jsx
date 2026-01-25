import { ProductoItem } from './ProductoItem'

/**
 * Lista de productos de factura
 */
export function ListaProductos({ items, productosBuscados, buscandoDatos, CampoEditable }) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
        <div className="text-orange-900 font-medium">⚠️ No se detectaron productos en la factura</div>
        <div className="text-sm text-orange-700 mt-1">Verifica que la imagen sea clara y contenga la lista de productos</div>
      </div>
    )
  }
  
  return (
    <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-purple-900 text-xl">📦 Productos ({items.length})</h3>
        <button 
          className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors font-medium shadow-md"
          onClick={() => {
            console.log('Cargar todos:', items)
            alert('Funcionalidad de carga masiva en desarrollo')
          }}
        >
          ⚡ Cargar todos
        </button>
      </div>
      
      <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-2">
        {items.map((p, i) => (
          <ProductoItem 
            key={i}
            producto={p}
            index={i}
            productosBuscados={productosBuscados}
            buscandoDatos={buscandoDatos}
            CampoEditable={CampoEditable}
          />
        ))}
      </div>
    </div>
  )
}
