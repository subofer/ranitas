"use client"
import { useState, useMemo } from 'react'
import Icon from '@/components/formComponents/Icon'
import Button from '@/components/formComponents/Button'
import SelectOnClientByProps from '@/components/proveedores/SelectOnClientByProps'
import { mapearAliasAProducto } from '@/prisma/serverActions/buscarAliases'

/**
 * Modal para mapear un alias de proveedor a un producto/presentación
 */
export function ModalMapeoAlias({ 
  isOpen, 
  onClose, 
  alias, 
  productosOptions = [],
  onSuccess 
}) {
  const [mapeando, setMapeando] = useState(false)
  const [mapProductoId, setMapProductoId] = useState('')
  const [mapPresentacionId, setMapPresentacionId] = useState('')

  const productoSeleccionado = productosOptions.find(p => p?.id === mapProductoId) || null
  const presentacionesMap = (productoSeleccionado?.presentaciones || [])
    .slice()
    .sort((a, b) => (a?.nombre || '').localeCompare(b?.nombre || '', 'es'))

  const handleClose = () => {
    if (mapeando) return
    setMapProductoId('')
    setMapPresentacionId('')
    onClose()
  }

  const handleSubmit = async () => {
    if (!mapProductoId) {
      alert('Selecciona un producto')
      return
    }

    if (!alias?.id) {
      alert('Alias inválido')
      return
    }

    setMapeando(true)
    try {
      const resultado = await mapearAliasAProducto({
        aliasId: alias.id,
        productoId: mapProductoId,
        presentacionId: mapPresentacionId || null
      })

      if (resultado.success) {
        alert('✅ Alias mapeado exitosamente')
        if (onSuccess) {
          onSuccess(resultado.alias)
        }
        handleClose()
      } else {
        alert('❌ Error: ' + resultado.error)
      }
    } catch (error) {
      console.error('Error mapeando alias:', error)
      alert('❌ Error mapeando alias')
    } finally {
      setMapeando(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Mapear alias de proveedor</h2>
            <p className="text-sm text-gray-600">Asocia este alias con un producto de tu inventario</p>
          </div>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-gray-600" 
            disabled={mapeando}
          >
            <Icon icono="times" className="text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info del alias */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-xs text-blue-600 uppercase font-medium mb-1">Alias del proveedor</div>
            <div className="text-gray-900 font-bold text-lg">
              {alias?.nombreEnProveedor || alias?.sku || 'Sin nombre'}
            </div>
            {alias?.sku && (
              <div className="text-gray-600 text-sm mt-1">
                SKU: <span className="font-mono">{alias.sku}</span>
              </div>
            )}
          </div>

          {/* Selectores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectOnClientByProps
              valueField="id"
              textField="nombre"
              label="Producto"
              placeholder="Buscar producto..."
              name="mapProductoId"
              value={mapProductoId}
              onChange={({ value, option }) => {
                setMapProductoId(value)
                const pres = Array.isArray(option?.presentaciones) ? option.presentaciones : []
                const base = pres.find(x => x?.esUnidadBase) || pres[0]
                setMapPresentacionId(base?.id || '')
              }}
              options={productosOptions}
              save
            />

            <SelectOnClientByProps
              valueField="id"
              textField="nombre"
              label="Presentación"
              placeholder="Selecciona presentación..."
              name="mapPresentacionId"
              value={mapPresentacionId}
              onChange={({ value }) => setMapPresentacionId(value)}
              options={presentacionesMap}
              save
              disabled={!mapProductoId}
            />
          </div>

          {/* Vista previa del mapeo */}
          {mapProductoId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-xs text-green-600 uppercase font-medium mb-1">Vista previa del mapeo</div>
              <div className="text-sm text-gray-800">
                <span className="font-medium">{alias?.nombreEnProveedor}</span>
                <span className="mx-2">→</span>
                <span className="font-bold text-green-700">{productoSeleccionado?.nombre}</span>
                {mapPresentacionId && presentacionesMap.find(p => p.id === mapPresentacionId) && (
                  <span className="text-green-600">
                    {' '}[{presentacionesMap.find(p => p.id === mapPresentacionId)?.nombre}]
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
          <Button 
            tipo="neutro" 
            type="button" 
            onClick={handleClose} 
            disabled={mapeando}
          >
            Cancelar
          </Button>
          <Button 
            tipo="enviar" 
            type="button" 
            onClick={handleSubmit} 
            disabled={mapeando || !mapProductoId}
          >
            {mapeando ? '⏳ Guardando...' : '✅ Guardar mapeo'}
          </Button>
        </div>
      </div>
    </div>
  )
}
