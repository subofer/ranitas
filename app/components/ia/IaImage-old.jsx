"use client"
import React, { useState, useEffect, useRef } from 'react'
import ImageCropper from './ImageCropper'
import FilterSelect from '../formComponents/FilterSelect'
import { 
  buscarProveedor, 
  buscarProducto, 
  buscarPedidosRelacionados, 
  verificarFacturaDuplicada, 
  guardarAuditoriaEdicion 
} from '@/prisma/serverActions/facturaActions'

// Importar utilidades compartidas
import { DEFAULT_ADJUSTMENTS, MODES } from '@/lib/ia/constants'
import { useImageAutoFocus, useImageTransformations } from '@/lib/ia/hooks'

// Importar componentes modulares
import {
  CampoEditable,
  ImageControlsOverlay,
  AlertaFacturaDuplicada,
  ResultadoBusquedaProveedor,
  PedidosRelacionados,
  EncabezadoFactura,
  TotalesFactura,
  ListaProductos,
  LoadingSkeletons
} from './components'

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
            <li>Modelo <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-purple-600">Qwen2.5vi:7b</code> recomendado para facturas</li>
            <li>Usa el recorte para enfocar el área relevante</li>
            <li>Para mejores resultados: imágenes claras, buena iluminación</li>
          </ul>
        </div>
      )}
    </div>
  )
}
