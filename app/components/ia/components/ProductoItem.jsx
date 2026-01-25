import { useState } from 'react'
import { formatCurrency } from '@/lib/formatters'
import { prepararBusquedaWeb } from '@/prisma/serverActions/facturaActions'
import { crearAliasSimple } from '@/prisma/serverActions/buscarAliases'

/**
 * Item individual de producto en factura
 */
export function ProductoItem({ producto, index, productosBuscados, buscandoDatos, CampoEditable, aliasInfo, proveedorId, onAbrirModalMapeo }) {
  const [creandoAlias, setCreandoAlias] = useState(false)
  const [aliasCreado, setAliasCreado] = useState(null)
  
  const productosEncontrados = productosBuscados[producto.descripcion] || []
  const existe = productosEncontrados.length > 0 && productosEncontrados[0].similitud > 0.7
  
  // Determinar estado del alias
  const tieneAlias = aliasInfo?.tieneAlias || !!aliasCreado
  const mapeado = aliasInfo?.mapeado || false
  const alias = aliasInfo?.alias || aliasCreado
  const productoMapeado = aliasInfo?.producto
  const presentacionMapeada = aliasInfo?.presentacion
  
  // Determinar indicador visual
  let indicador = '⚪'
  let indicadorClass = 'text-gray-400'
  let estadoTexto = 'Sin alias'
  
  if (tieneAlias && mapeado) {
    indicador = '🟢'
    indicadorClass = 'text-green-600'
    estadoTexto = 'Mapeado'
  } else if (tieneAlias && !mapeado) {
    indicador = '🟡'
    indicadorClass = 'text-yellow-600'
    estadoTexto = 'Sin mapear'
  }
  
  const handleCrearAlias = async () => {
    if (!proveedorId) {
      alert('No se identificó el proveedor')
      return
    }
    
    setCreandoAlias(true)
    try {
      const resultado = await crearAliasSimple({
        proveedorId,
        sku: producto.codigo || producto.descripcion,
        nombreEnProveedor: producto.descripcion
      })
      
      if (resultado.success) {
        setAliasCreado(resultado.alias)
        alert(resultado.yaExistia ? 'El alias ya existía' : 'Alias creado exitosamente')
      } else {
        alert('Error creando alias: ' + resultado.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error creando alias')
    } finally {
      setCreandoAlias(false)
    }
  }
  
  const handleMapearProducto = () => {
    if (alias && onAbrirModalMapeo) {
      onAbrirModalMapeo(alias)
    } else {
      alert('No se puede abrir el modal de mapeo')
    }
  }
  
  const handleAgregarStock = () => {
    console.log('Agregar stock:', producto, productosEncontrados[0])
    alert(`Agregar ${producto.cantidad} de "${producto.descripcion}"\nFuncionalidad en desarrollo`)
  }
  
  const handleNuevoProducto = async () => {
    // Verificar si hay proveedor
    if (!proveedorId) {
      alert('⚠️ Primero debes asociar el proveedor de la factura.\n\nVe a la sección superior y selecciona un contacto existente o crea uno nuevo.')
      return
    }
    
    // Crear alias automáticamente antes de ir a crear producto
    if (!tieneAlias) {
      try {
        const resultado = await crearAliasSimple({
          proveedorId,
          sku: producto.codigo || producto.descripcion,
          nombreEnProveedor: producto.descripcion
        })
        
        if (resultado.success) {
          console.log('✅ Alias creado automáticamente:', resultado.alias)
        }
      } catch (error) {
        console.error('Error creando alias automático:', error)
      }
    }
    
    // Preparar datos para pre-cargar
    const params = new URLSearchParams()
    params.set('nuevo', 'true')
    params.set('nombre', producto.descripcion || '')
    if (producto.codigo) params.set('codigo', producto.codigo)
    if (producto.cantidad) params.set('cantidad', producto.cantidad.toString())
    if (producto.precio_unitario || producto.precio) params.set('precio', (producto.precio_unitario || producto.precio).toString())
    if (proveedorId) params.set('proveedorId', proveedorId)
    
    // Abrir en nueva pestaña para no perder el contexto de la factura
    window.open(`/cargarProductos?${params.toString()}`, '_blank')
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
        {/* Indicador de estado */}
        <div className={`text-2xl ${indicadorClass} flex-shrink-0`} title={estadoTexto}>
          {indicador}
        </div>
        
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
              
              {/* Mostrar producto mapeado */}
              {mapeado && productoMapeado && (
                <div className="text-xs text-green-700 mt-1 font-medium">
                  → {productoMapeado.nombre}
                  {presentacionMapeada && (
                    <span className="text-green-600 ml-1">
                      [{presentacionMapeada.nombre}]
                    </span>
                  )}
                </div>
              )}
              
              {/* Mostrar alias sin mapear */}
              {tieneAlias && !mapeado && alias && (
                <div className="text-xs text-yellow-700 mt-1">
                  Alias guardado sin producto asociado
                </div>
              )}
              
              {productosEncontrados.length > 0 && productosEncontrados[0].mejorAlias && !mapeado && (
                <div className="text-xs text-gray-500 mt-1">
                  Sugerencia: <span className="font-medium text-blue-600">{productosEncontrados[0].mejorAlias}</span>
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
          
          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
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
          
          {/* Botones de acción según estado del alias */}
          <div className="flex gap-2 flex-wrap">
            {!tieneAlias && proveedorId && (
              <button
                onClick={handleCrearAlias}
                disabled={creandoAlias}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 font-medium text-xs disabled:opacity-50"
              >
                {creandoAlias ? '⏳ Creando...' : '📝 Crear Alias'}
              </button>
            )}
            
            {tieneAlias && !mapeado && (
              <button
                onClick={handleMapearProducto}
                className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 border border-yellow-200 font-medium text-xs"
              >
                🔗 Mapear Producto
              </button>
            )}
            
            {!mapeado && (
              <button
                onClick={handleNuevoProducto}
                className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 font-medium text-xs"
              >
                ➕ Agregar Producto
              </button>
            )}
            
            {mapeado && existe && (
              <button
                onClick={handleAgregarStock}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-xs shadow-md"
              >
                ✅ Sumar al Stock
              </button>
            )}
            
            <button
              onClick={handleBuscarWeb}
              className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 border border-gray-200 font-medium text-xs"
            >
              🔍 Buscar en Web
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
