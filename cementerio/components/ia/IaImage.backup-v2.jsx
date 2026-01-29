"use client"
import React, { useState, useEffect, useCallback, useRef } from 'react'
import ImageCropper from './ImageCropper'
import FilterSelect from '../formComponents/FilterSelect'
import { 
  buscarProveedor, 
  buscarProducto, 
  buscarPedidosRelacionados, 
  verificarFacturaDuplicada, 
  prepararBusquedaWeb, 
  guardarAuditoriaEdicion 
} from '@/prisma/serverActions/facturaActions'

// ========== CONSTANTES ==========
const DEFAULT_ADJUSTMENTS = {
  contraste: 100,
  brillo: 100,
  saturacion: 100,
  zoom: 1,
  panX: 0,
  panY: 0
}

const MODES = [
  { value: 'factura', label: '🧾 Factura' },
  { value: 'producto', label: '📦 Producto' },
  { value: 'general', label: '🔍 General' }
]

// ========== UTILIDADES ==========
const formatCurrency = (value) => 
  `$${parseFloat(value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

const formatDate = (date) => 
  new Date(date).toLocaleDateString('es-AR')

// ========== HOOKS PERSONALIZADOS ==========
function useImageAutoFocus() {
  const autoEnfocar = useCallback(async (originalFile, originalPreview, setFile, setPreview, preview) => {
    try {
      console.log('🎯 Iniciando auto-enfoque...')
      const img = new Image()
      img.src = originalPreview
      
      await new Promise((resolve) => { img.onload = resolve })
      
      console.log('📏 Tamaño original:', `${img.width}x${img.height}`)
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Detectar tipo de fondo
      let borderBrightness = 0
      let borderSamples = 0
      for (let x = 0; x < canvas.width; x += 20) {
        const i1 = (0 * canvas.width + x) * 4
        const i2 = ((canvas.height - 1) * canvas.width + x) * 4
        borderBrightness += (data[i1] + data[i1 + 1] + data[i1 + 2]) / 3
        borderBrightness += (data[i2] + data[i2 + 1] + data[i2 + 2]) / 3
        borderSamples += 2
      }
      borderBrightness /= borderSamples
      
      console.log('🎨 Brillo promedio del borde:', borderBrightness.toFixed(1))
      const fondoOscuro = borderBrightness < 100
      
      // Buscar bordes
      let minX = canvas.width, minY = canvas.height
      let maxX = 0, maxY = 0
      const step = 3
      let edgePixels = 0
      
      for (let y = step; y < canvas.height - step; y += step) {
        for (let x = step; x < canvas.width - step; x += step) {
          const i = (y * canvas.width + x) * 4
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
          
          const iLeft = (y * canvas.width + (x - step)) * 4
          const iRight = (y * canvas.width + (x + step)) * 4
          const iTop = ((y - step) * canvas.width + x) * 4
          const iBottom = ((y + step) * canvas.width + x) * 4
          
          const bLeft = (data[iLeft] + data[iLeft + 1] + data[iLeft + 2]) / 3
          const bRight = (data[iRight] + data[iRight + 1] + data[iRight + 2]) / 3
          const bTop = (data[iTop] + data[iTop + 1] + data[iTop + 2]) / 3
          const bBottom = (data[iBottom] + data[iBottom + 1] + data[iBottom + 2]) / 3
          
          const gradient = Math.abs(brightness - bLeft) + 
                          Math.abs(brightness - bRight) + 
                          Math.abs(brightness - bTop) + 
                          Math.abs(brightness - bBottom)
          
          const isEdge = gradient > 100
          const isContent = fondoOscuro 
            ? brightness > borderBrightness + 30 || isEdge
            : brightness < borderBrightness - 30 || isEdge
          
          if (isContent) {
            edgePixels++
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }
      
      console.log('🔍 Tipo de fondo:', fondoOscuro ? 'OSCURO' : 'CLARO')
      console.log('🖍️ Píxeles de bordes encontrados:', edgePixels)
      
      // Agregar margen
      const marginX = Math.floor((maxX - minX) * 0.03)
      const marginY = Math.floor((maxY - minY) * 0.03)
      minX = Math.max(0, minX - marginX)
      minY = Math.max(0, minY - marginY)
      maxX = Math.min(canvas.width, maxX + marginX)
      maxY = Math.min(canvas.height, maxY + marginY)
      
      const cropWidth = maxX - minX
      const cropHeight = maxY - minY
      const areaPercentage = (cropWidth * cropHeight) / (canvas.width * canvas.height)
      
      console.log('📊 Área detectada:', `${(areaPercentage * 100).toFixed(1)}%`)
      
      if (edgePixels > 100 && cropWidth > canvas.width * 0.1 && cropHeight > canvas.height * 0.1) {
        const croppedCanvas = document.createElement('canvas')
        const croppedCtx = croppedCanvas.getContext('2d')
        croppedCanvas.width = cropWidth
        croppedCanvas.height = cropHeight
        
        croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
        
        // Mejorar contraste
        const croppedImageData = croppedCtx.getImageData(0, 0, cropWidth, cropHeight)
        const croppedData = croppedImageData.data
        const contrast = 1.08
        const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100))
        
        for (let i = 0; i < croppedData.length; i += 4) {
          croppedData[i] = Math.min(255, Math.max(0, factor * (croppedData[i] - 128) + 128))
          croppedData[i + 1] = Math.min(255, Math.max(0, factor * (croppedData[i + 1] - 128) + 128))
          croppedData[i + 2] = Math.min(255, Math.max(0, factor * (croppedData[i + 2] - 128) + 128))
        }
        
        croppedCtx.putImageData(croppedImageData, 0, 0)
        
        croppedCanvas.toBlob((blob) => {
          const croppedFile = new File([blob], originalFile.name, { type: originalFile.type })
          const croppedUrl = URL.createObjectURL(blob)
          
          if (originalPreview !== preview) {
            URL.revokeObjectURL(originalPreview)
          }
          setFile(croppedFile)
          setPreview(croppedUrl)
          
          console.log('✅ Auto-enfoque aplicado')
        }, originalFile.type, 0.95)
      } else {
        console.log('⚠️ No se detectó área suficiente para recortar')
      }
    } catch (error) {
      console.error('❌ Error en auto-enfoque:', error)
    }
  }, [])
  
  return autoEnfocar
}

function useImageTransformations(preview, imgOriginalRef, canvasRef, ajustes) {
  const aplicarTransformaciones = useCallback(() => {
    if (!preview || !imgOriginalRef.current) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const img = imgOriginalRef.current
    
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    ctx.filter = `
      contrast(${ajustes.contraste}%)
      brightness(${ajustes.brillo}%)
      saturate(${ajustes.saturacion}%)
    `
    
    const escala = ajustes.zoom
    const offsetX = ajustes.panX * canvas.width
    const offsetY = ajustes.panY * canvas.height
    
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(escala, escala)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)
    ctx.translate(offsetX, offsetY)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.restore()
  }, [ajustes, preview, canvasRef, imgOriginalRef])
  
  return aplicarTransformaciones
}

// ========== COMPONENTES ==========

// Campo editable inline
function CampoEditable({ valor, path, tipo = 'text', className = '', formatear = null, onUpdate }) {
  const [editando, setEditando] = useState(false)
  const [valorTemp, setValorTemp] = useState(valor)
  const inputRef = useRef(null)
  
  useEffect(() => {
    if (editando && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
  }, [editando])
  
  const guardar = async () => {
    if (valorTemp !== valor) {
      await onUpdate(path, valorTemp, valor)
    }
    setEditando(false)
  }
  
  const iniciarEdicion = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setValorTemp(valor)
    setEditando(true)
  }
  
  if (editando) {
    return (
      <input
        ref={inputRef}
        type={tipo}
        value={valorTemp}
        onChange={(e) => setValorTemp(e.target.value)}
        onBlur={(e) => {
          e.stopPropagation()
          guardar()
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            e.preventDefault()
            guardar()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setValorTemp(valor)
            setEditando(false)
          }
        }}
        className={`${className} border-2 border-orange-400 rounded px-2 py-1 outline-none`}
      />
    )
  }
  
  return (
    <div
      onMouseDown={iniciarEdicion}
      className={`${className} cursor-pointer hover:bg-yellow-50 hover:border hover:border-orange-300 rounded px-1 transition-colors`}
    >
      {formatear ? formatear(valor) : valor}
    </div>
  )
}

// Control de rango deslizable
function RangeControl({ label, icon, value, onChange, min = 0, max = 200, step = 1, color = 'blue' }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
        <span>{icon} {label}</span>
        <span className={`text-${color}-600`}>{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{max === 3 ? 'x' : '%'}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-${color}-600`}
      />
    </div>
  )
}

// Controles de imagen overlay
function ImageControlsOverlay({ ajustes, setAjustes, onApply, onReset, onCancel }) {
  return (
    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-end p-4 pointer-events-none">
      <div className="w-full bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-xl pointer-events-auto">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <RangeControl
            label="Contraste"
            icon="🎨"
            value={ajustes.contraste}
            onChange={(e) => setAjustes({...ajustes, contraste: parseInt(e.target.value)})}
            color="blue"
          />
          <RangeControl
            label="Brillo"
            icon="💡"
            value={ajustes.brillo}
            onChange={(e) => setAjustes({...ajustes, brillo: parseInt(e.target.value)})}
            color="yellow"
          />
          <RangeControl
            label="Saturación"
            icon="🌈"
            value={ajustes.saturacion}
            onChange={(e) => setAjustes({...ajustes, saturacion: parseInt(e.target.value)})}
            color="purple"
          />
          <RangeControl
            label="Zoom"
            icon="🔍"
            value={ajustes.zoom}
            onChange={(e) => setAjustes({...ajustes, zoom: parseFloat(e.target.value)})}
            min={0.5}
            max={3}
            step={0.1}
            color="green"
          />
        </div>
        
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-700 mb-2 block">🧭 Desplazar (Pan)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>←→ Horizontal</span>
                <span className="font-mono text-blue-600">{(ajustes.panX * 100).toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={ajustes.panX}
                onChange={(e) => setAjustes({...ajustes, panX: parseFloat(e.target.value)})}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>↑↓ Vertical</span>
                <span className="font-mono text-blue-600">{(ajustes.panY * 100).toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={ajustes.panY}
                onChange={(e) => setAjustes({...ajustes, panY: parseFloat(e.target.value)})}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onApply}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-sm shadow-md"
          >
            ✔️ Aplicar
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
          >
            ↺ Reset
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
          >
            ✖️ Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// Alerta de factura duplicada
function AlertaFacturaDuplicada({ factura }) {
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

// Resultado búsqueda proveedor
function ResultadoBusquedaProveedor({ proveedorEncontrado }) {
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
            {proveedorEncontrado.proveedor.nombre_fantasia && (
              <span className="text-gray-600"> ({proveedorEncontrado.proveedor.nombre_fantasia})</span>
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

// Pedidos relacionados
function PedidosRelacionados({ pedidos }) {
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

// Encabezado de factura
function EncabezadoFactura({ documento, emisor, proveedorEncontrado, CampoEditable }) {
  const revisar = documento?.revisar || emisor?.revisar
  
  return (
    <div className={`rounded-xl p-6 mb-4 text-white shadow-lg border-4 ${
      revisar ? 'bg-orange-600 border-orange-400' : 'bg-indigo-700 border-indigo-500'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-indigo-600 px-3 py-2 rounded-lg text-sm font-medium">
              📝 <CampoEditable 
                valor={documento?.tipo || 'Tipo desconocido'}
                path="documento.tipo"
                className="inline"
              />
            </span>
            <span className="bg-indigo-600 px-3 py-2 rounded-lg text-sm font-medium">
              📅 <CampoEditable 
                valor={documento?.fecha || 'Sin fecha'}
                path="documento.fecha"
                tipo="date"
                className="inline"
              />
            </span>
            {revisar && (
              <span className="bg-orange-500 px-3 py-1 rounded-lg text-xs font-bold">⚠️ Revisar datos</span>
            )}
          </div>
          <div className="text-xs text-indigo-200 mb-1">Número de comprobante</div>
          <CampoEditable 
            valor={documento?.numero || 'No detectado'}
            path="documento.numero"
            className="text-4xl font-black text-white"
          />
        </div>
        <div className="text-7xl opacity-30">🧾</div>
      </div>
      
      <div className="border-t-2 border-indigo-500 pt-4">
        <div className="text-xs text-indigo-200 mb-2">🏪 Emisor (Proveedor)</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-indigo-300 mb-1">Nombre inferido:</div>
            <CampoEditable 
              valor={emisor?.nombre || 'No detectado'}
              path="emisor.nombre"
              className="font-bold text-lg text-white"
            />
            <div className="text-xs text-indigo-300 mt-1">
              CUIT: <CampoEditable 
                valor={emisor?.cuit || 'No detectado'}
                path="emisor.cuit"
                className="inline text-indigo-100"
              />
            </div>
          </div>
          
          <div>
            <div className="text-xs text-indigo-300 mb-1">Proveedor identificado:</div>
            {proveedorEncontrado?.proveedor ? (
              <div className="bg-green-600 rounded-lg p-3">
                <div className="font-bold text-white text-sm">✅ {proveedorEncontrado.proveedor.nombre}</div>
                <div className="text-xs text-green-100">CUIT: {proveedorEncontrado.proveedor.cuit}</div>
                <div className="text-xs text-green-200 mt-1">
                  {proveedorEncontrado.metodo === 'cuit' ? 'Match por CUIT' : 'Match por nombre'} • 
                  Confianza: {proveedorEncontrado.confianza}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-600 rounded-lg p-3">
                <div className="text-yellow-100 text-xs">⚠️ Proveedor no encontrado en BD</div>
                <button className="mt-2 px-3 py-1 bg-yellow-700 hover:bg-yellow-800 rounded text-xs font-medium w-full">
                  + Crear proveedor
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Totales de factura
function TotalesFactura({ totales, CampoEditable }) {
  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
      <div className="font-bold text-yellow-900 mb-3 text-lg">💰 Totales</div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span>Subtotal:</span>
          <CampoEditable 
            valor={totales?.neto || 0}
            path="totales.neto"
            tipo="number"
            className="font-mono font-medium"
            formatear={formatCurrency}
          />
        </div>
        <div className="flex justify-between items-center">
          <span>IVA:</span>
          <CampoEditable 
            valor={totales?.iva || 0}
            path="totales.iva"
            tipo="number"
            className="font-mono font-medium"
            formatear={formatCurrency}
          />
        </div>
        <div className="border-t-2 border-yellow-400 pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">TOTAL:</span>
            <CampoEditable 
              valor={totales?.total || 0}
              path="totales.total"
              tipo="number"
              className="font-black text-2xl text-yellow-900"
              formatear={formatCurrency}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Item de producto individual
function ProductoItem({ producto, index, productosBuscados, buscandoDatos, CampoEditable }) {
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

// Lista de productos
function ListaProductos({ items, productosBuscados, buscandoDatos, CampoEditable }) {
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

// Skeletons de carga
function LoadingSkeletons() {
  return (
    <div className="space-y-4 animate-pulse mb-6">
      <div className="bg-gray-200 rounded-xl p-6 h-32"></div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-200 rounded-lg h-24"></div>
        <div className="bg-gray-200 rounded-lg h-24"></div>
      </div>
      <div className="space-y-2">
        <div className="bg-gray-200 rounded-lg h-20"></div>
        <div className="bg-gray-200 rounded-lg h-20"></div>
        <div className="bg-gray-200 rounded-lg h-20"></div>
      </div>
    </div>
  )
}

// ========== COMPONENTE PRINCIPAL ==========
export default function IaImage({ model }) {
  // Estados
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('factura')
  const [metadata, setMetadata] = useState(null)
  const [showCropper, setShowCropper] = useState(false)
  const [tempFile, setTempFile] = useState(null)
  const [tempPreview, setTempPreview] = useState(null)
  
  const [proveedorEncontrado, setProveedorEncontrado] = useState(null)
  const [productosBuscados, setProductosBuscados] = useState({})
  const [pedidosRelacionados, setPedidosRelacionados] = useState([])
  const [facturaDuplicada, setFacturaDuplicada] = useState(null)
  const [buscandoDatos, setBuscandoDatos] = useState(false)
  
  const [mostrarControles, setMostrarControles] = useState(false)
  const [ajustes, setAjustes] = useState(DEFAULT_ADJUSTMENTS)
  
  // Refs
  const canvasRef = useRef(null)
  const imgOriginalRef = useRef(null)
  
  // Hooks personalizados
  const autoEnfocar = useImageAutoFocus()
  const aplicarTransformaciones = useImageTransformations(preview, imgOriginalRef, canvasRef, ajustes)
  
  // Efectos
  useEffect(() => {
    if (mostrarControles) {
      aplicarTransformaciones()
    }
  }, [ajustes, mostrarControles, aplicarTransformaciones])
  
  // Handlers
  const onFile = (f) => {
    if (!f) return
    const url = URL.createObjectURL(f)
    setFile(f)
    setPreview(url)
    setResult(null)
    setMetadata({
      fileName: f.name,
      fileSize: f.size,
      fileType: f.type
    })
    
    setTimeout(() => autoEnfocar(f, url, setFile, setPreview, preview), 100)
  }
  
  const aplicarAjustes = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    aplicarTransformaciones()
    
    canvas.toBlob((blob) => {
      const nuevoFile = new File([blob], file.name, { type: file.type })
      const nuevoUrl = URL.createObjectURL(blob)
      
      if (preview) URL.revokeObjectURL(preview)
      
      setFile(nuevoFile)
      setPreview(nuevoUrl)
      setMostrarControles(false)
      
      console.log('✅ Ajustes aplicados a la imagen')
    }, file.type, 0.95)
  }
  
  const resetearAjustes = () => {
    setAjustes(DEFAULT_ADJUSTMENTS)
  }
  
  const abrirCropper = () => {
    if (!file) return
    setTempFile(file)
    setTempPreview(preview)
    setShowCropper(true)
  }
  
  const handleCrop = (croppedFile, croppedPreview) => {
    setFile(croppedFile)
    setPreview(croppedPreview)
    setResult(null)
    setMetadata(null)
    setShowCropper(false)
    setTempFile(null)
    setTempPreview(null)
  }
  
  const handleCancelCrop = () => {
    setShowCropper(false)
    setTempFile(null)
    if (tempPreview) {
      URL.revokeObjectURL(tempPreview)
    }
    setTempPreview(null)
  }
  
  const submit = async (mantenerResultados = false) => {
    if (!file) return
    setLoading(true)
    
    if (!mantenerResultados) {
      setResult(null)
      setMetadata(null)
      setParsedData(null)
      setProveedorEncontrado(null)
      setProductosBuscados({})
      setPedidosRelacionados([])
      setFacturaDuplicada(null)
    }
    
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('model', model || 'llava:latest')
      fd.append('mode', mode)
      
      const res = await fetch('/api/ai/image', { method: 'POST', body: fd })
      const data = await res.json()
      
      if (data.ok) {
        setResult(data.text)
        setMetadata(data.metadata)
        setParsedData(data.data)
        
        console.log('📊 Datos recibidos:', data.data)
        
        if (mode === 'factura' && data.data) {
          buscarDatosRelacionados(data.data)
        }
      } else {
        setResult(`❌ Error: ${data.error || 'Respuesta inválida'}`)
      }
    } catch (e) {
      setResult(`❌ Error de conexión: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  const buscarDatosRelacionados = async (factura) => {
    setBuscandoDatos(true)
    console.log('🔍 Iniciando búsqueda de datos relacionados...')
    
    try {
      let provResult = null
      
      if (factura.emisor) {
        console.log('🏢 Buscando proveedor:', factura.emisor)
        provResult = await buscarProveedor(factura.emisor.cuit, factura.emisor.nombre)
        setProveedorEncontrado(provResult)
        console.log('✅ Proveedor encontrado:', provResult)
        
        if (provResult?.proveedor && factura.documento?.numero) {
          console.log('🔍 Verificando factura duplicada...')
          const duplicada = await verificarFacturaDuplicada(factura.documento.numero, provResult.proveedor.id)
          setFacturaDuplicada(duplicada)
          if (duplicada) console.log('⚠️ Factura duplicada detectada:', duplicada)
          
          if (factura.documento?.fecha) {
            console.log('📋 Buscando pedidos relacionados...')
            const pedidos = await buscarPedidosRelacionados(
              provResult.proveedor.id,
              factura.documento.numero,
              factura.documento.fecha
            )
            setPedidosRelacionados(pedidos)
            console.log(`✅ ${pedidos.length} pedidos encontrados`)
          }
        }
      }
      
      if (factura.items && factura.items.length > 0) {
        const busquedas = {}
        const proveedorId = provResult?.proveedor?.id || null
        console.log(`🔍 Buscando ${factura.items.length} productos...`, proveedorId ? `con proveedorId: ${proveedorId}` : 'sin proveedor')
        
        for (const item of factura.items) {
          const nombreProducto = item.descripcion || item.detalle || item.producto || item.articulo
          if (nombreProducto && nombreProducto.trim()) {
            console.log(`  🔎 Buscando producto: "${nombreProducto}"...`)
            const productos = await buscarProducto(nombreProducto, proveedorId)
            busquedas[nombreProducto] = productos
            console.log(`    ✅ ${productos.length} resultados para "${nombreProducto}"`)
          }
        }
        setProductosBuscados(busquedas)
        console.log('✅ Búsqueda de productos completada')
      }
    } catch (error) {
      console.error('Error buscando datos relacionados:', error)
    } finally {
      setBuscandoDatos(false)
    }
  }
  
  const actualizarCampo = async (path, valorNuevo, valorAnterior) => {
    const newData = JSON.parse(JSON.stringify(parsedData))
    
    const keys = path.split('.')
    let current = newData
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {}
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = valorNuevo
    
    setParsedData(newData)
    
    await guardarAuditoriaEdicion({
      campo: path,
      valorAnterior,
      valorNuevo,
      contexto: 'Edición manual de factura IA'
    })
  }
  
  const clear = () => {
    if (preview) {
      URL.revokeObjectURL(preview)
    }
    setFile(null)
    setPreview(null)
    setParsedData(null)
    setResult(null)
    setMetadata(null)
  }
  
  // Wrapper para CampoEditable con contexto
  const CampoEditableWrapper = (props) => (
    <CampoEditable {...props} onUpdate={actualizarCampo} />
  )
  
  return (
    <div className="grid gap-4">
      {showCropper && tempPreview && (
        <ImageCropper 
          src={tempPreview}
          mode={mode}
          model={model}
          onCrop={handleCrop}
          onCancel={handleCancelCrop}
        />
      )}

      {preview && mode === 'factura' && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Columna izquierda: Imagen */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-4 sticky top-4 h-fit">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">📄 Imagen original</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarControles(!mostrarControles)}
                  className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                    mostrarControles 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                  title="Ajustar contraste, brillo, zoom"
                >
                  🎨 Ajustes
                </button>
                <button 
                  onClick={clear}
                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  ✖ Cerrar
                </button>
              </div>
            </div>
            
            <div className="relative">
              {!mostrarControles && (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={preview} 
                  alt="Factura" 
                  className="w-full rounded-lg shadow-lg border-2 border-gray-300" 
                />
              )}
              
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                ref={imgOriginalRef}
                src={preview} 
                alt="Original" 
                className="hidden" 
                crossOrigin="anonymous"
              />
              
              {mostrarControles && (
                <canvas 
                  ref={canvasRef}
                  className="w-full rounded-lg shadow-lg border-2 border-blue-400"
                />
              )}
              
              {mostrarControles && (
                <ImageControlsOverlay
                  ajustes={ajustes}
                  setAjustes={setAjustes}
                  onApply={aplicarAjustes}
                  onReset={resetearAjustes}
                  onCancel={() => setMostrarControles(false)}
                />
              )}
            </div>
          </div>

          {/* Columna derecha: Resultados */}
          <div className={`border-2 rounded-xl shadow-xl p-4 ${parsedData ? 'bg-white border-green-500' : 'bg-gray-50 border-gray-300'}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">{parsedData ? '✅' : loading ? '⏳' : '📋'}</span>
                {parsedData ? 'Factura Procesada' : loading ? 'Analizando...' : 'Presiona Analizar para comenzar'}
              </h2>
              {parsedData && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => submit(true)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-1"
                    title="Reprocesar la imagen"
                  >
                    {loading ? '⏳' : '🔄'} Reprocesar
                  </button>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">🔍 Ver JSON</summary>
                    <div className="absolute right-4 mt-2 bg-gray-900 text-green-400 p-3 rounded-lg shadow-xl max-w-md max-h-96 overflow-auto z-50">
                      <pre className="text-xs">{JSON.stringify(parsedData, null, 2)}</pre>
                    </div>
                  </details>
                </div>
              )}
            </div>

            {parsedData ? (
              <>
                {buscandoDatos && (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4 flex items-center gap-3">
                    <div className="animate-spin text-2xl">🔍</div>
                    <div className="text-sm text-blue-900 font-medium">
                      Buscando proveedor, productos y pedidos relacionados...
                    </div>
                  </div>
                )}
                
                <AlertaFacturaDuplicada factura={facturaDuplicada} />
                <ResultadoBusquedaProveedor proveedorEncontrado={proveedorEncontrado} />
                <PedidosRelacionados pedidos={pedidosRelacionados} />
                
                <EncabezadoFactura 
                  documento={parsedData.documento}
                  emisor={parsedData.emisor}
                  proveedorEncontrado={proveedorEncontrado}
                  CampoEditable={CampoEditableWrapper}
                />
                
                <TotalesFactura 
                  totales={parsedData.totales}
                  CampoEditable={CampoEditableWrapper}
                />
                
                <ListaProductos 
                  items={parsedData.items}
                  productosBuscados={productosBuscados}
                  buscandoDatos={buscandoDatos}
                  CampoEditable={CampoEditableWrapper}
                />
                
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 font-medium">
                    📄 Ver JSON completo
                  </summary>
                  <pre className="mt-2 bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto border border-gray-700">
                    {JSON.stringify(parsedData, null, 2)}
                  </pre>
                </details>
              </>
            ) : (
              <div className="space-y-4">
                {loading && <LoadingSkeletons />}
                
                {!loading && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-lg font-medium mb-2">Imagen cargada</p>
                    <p className="text-sm mb-4">Presiona &quot;Analizar&quot; para procesar la factura</p>
                  </div>
                )}
                
                {!loading && (
                  <button 
                    className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-bold text-lg shadow-lg"
                    onClick={submit} 
                    disabled={!file}
                  >
                    🚀 Analizar Factura
                  </button>
                )}
                
                {loading && (
                  <div className="text-center py-2 text-blue-600 font-medium animate-pulse">
                    ⏳ Analizando factura, por favor espera...
                  </div>
                )}
                
                <details className="text-sm" open={!loading}>
                  <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">⚙️ Opciones avanzadas</summary>
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={() => autoEnfocar(file, preview, setFile, setPreview, preview)}
                      disabled={loading || !file}
                      className="w-full px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 border border-purple-200 font-medium text-sm disabled:opacity-50"
                    >
                      🎯 Re-enfocar automáticamente
                    </button>
                    <button
                      onClick={abrirCropper}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 font-medium text-sm disabled:opacity-50"
                    >
                      ✂️ Recortar manualmente
                    </button>
                    <div className="text-xs text-gray-500 mt-2">
                      💡 El auto-enfoque detecta y recorta el documento automáticamente.
                    </div>
                  </div>
                </details>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700">
                  <div className="font-medium mb-2">💡 Consejos:</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Imagen clara y legible</li>
                    <li>Buena iluminación</li>
                    <li>Recorta lo irrelevante</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!preview && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">📸 Cargar Factura</h3>
          
          <div className="mb-3">
            <FilterSelect
              value={mode}
              save={(val) => setMode(val)}
              options={MODES}
              valueField="value"
              textField="label"
              compact
            />
          </div>
          
          {!file ? (
            <label className="cursor-pointer block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => onFile(e.target.files?.[0])} 
                  className="hidden"
                />
                <div className="text-3xl mb-1">📸</div>
                <div className="text-sm text-gray-600 font-medium">Seleccionar imagen</div>
              </div>
            </label>
          ) : (
            <button 
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-base shadow-lg"
              onClick={submit} 
              disabled={loading}
            >
              {loading ? '⏳ Analizando...' : '🚀 Analizar Factura'}
            </button>
          )}

          {file && (
            <details className="text-xs mt-2">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-900">⚙️ Opciones avanzadas</summary>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={abrirCropper}
                  className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 font-medium text-xs"
                >
                  ✂️ Recortar
                </button>
              </div>
            </details>
          )}
        </div>
      )}

      {!parsedData && !preview && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
          <div className="font-medium mb-1">💡 Cómo usar:</div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Ollama debe estar corriendo (puerto 11434)</li>
            <li>Modelo <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-purple-600">minicpm-v</code> recomendado para facturas</li>
            <li>Usa el recorte para enfocar el área relevante</li>
            <li>Para mejores resultados: imágenes claras, buena iluminación</li>
          </ul>
        </div>
      )}
    </div>
  )
}
