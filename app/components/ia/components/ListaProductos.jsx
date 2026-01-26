import { ProductoItem } from './ProductoItem'

/**
 * Lista de productos de factura
 */
export function ListaProductos({ items, productosBuscados, buscandoDatos, CampoEditable, aliasesPorItem, proveedorId, onAbrirModalMapeo, onGuardarFactura, guardando = false }) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
        <div className="text-orange-900 font-medium">⚠️ No se detectaron productos en la factura</div>
        <div className="text-sm text-orange-700 mt-1">Verifica que la imagen sea clara y contenga la lista de productos</div>
      </div>
    )
  }
  
  // Calcular estadísticas
  const totalItems = items.length
  const conAliasMapeado = aliasesPorItem?.filter(a => a.tieneAlias && a.mapeado).length || 0
  const conAliasSinMapear = aliasesPorItem?.filter(a => a.tieneAlias && !a.mapeado).length || 0
  const sinAlias = totalItems - (conAliasMapeado + conAliasSinMapear)
  
  return (
    <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-purple-900 text-xl">📦 Productos ({totalItems})</h3>
          <div className="flex gap-3 mt-1 text-xs">
            <span className="text-green-700">🟢 {conAliasMapeado} mapeados</span>
            <span className="text-yellow-700">🟡 {conAliasSinMapear} sin mapear</span>
            <span className="text-gray-600">⚪ {sinAlias} sin alias</span>
          </div>
        </div>

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
            aliasInfo={aliasesPorItem?.[i]}
            proveedorId={proveedorId}
            onAbrirModalMapeo={(alias) => onAbrirModalMapeo && onAbrirModalMapeo(alias, i)}
          />
        ))}
      </div>
    </div>
  )
}
