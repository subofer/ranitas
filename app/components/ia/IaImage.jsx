"use client"
import { useState } from 'react'
import ImageCropper from './ImageCropper'

export default function IaImage({ model }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('factura') // factura | producto | general
  const [metadata, setMetadata] = useState(null)
  const [showCropper, setShowCropper] = useState(false)
  const [tempFile, setTempFile] = useState(null)
  const [tempPreview, setTempPreview] = useState(null)

  const onFile = (f) => {
    if (!f) return
    const url = URL.createObjectURL(f)
    setTempFile(f)
    setTempPreview(url)
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

  const submit = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    setMetadata(null)
    setParsedData(null)
    
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
        setParsedData(data.data) // Datos estructurados si los hay
      } else {
        setResult(`❌ Error: ${data.error || 'Respuesta inválida'}`)
      }
    } catch (e) {
      setResult(`❌ Error de conexión: ${e.message}`)
    } finally {
      setLoading(false)
    }
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

  const recrop = () => {
    if (file) {
      setTempFile(file)
      setTempPreview(preview)
      setShowCropper(true)
    }
  }

  const getModeIcon = (m) => {
    switch(m) {
      case 'factura': return '🧾'
      case 'producto': return '📦'
      case 'general': return '🔍'
      default: return '📷'
    }
  }

  const getModeDescription = (m) => {
    switch(m) {
      case 'factura': return 'Extrae datos: proveedor, productos, totales'
      case 'producto': return 'Identifica: marca, presentación, categoría'
      case 'general': return 'Análisis general de la imagen'
      default: return ''
    }
  }

  return (
    <div className="grid gap-4">
      {/* Cropper Modal */}
      {showCropper && tempPreview && (
        <ImageCropper 
          src={tempPreview}
          mode={mode}
          model={model}
          onCrop={handleCrop}
          onCancel={handleCancelCrop}
        />
      )}

      {/* Selector de modo */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-3 text-gray-900">Tipo de análisis</h3>
        <div className="grid grid-cols-3 gap-2">
          {['factura', 'producto', 'general'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={loading}
              className={`p-3 rounded-lg border transition-all ${
                mode === m 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              <div className="text-2xl mb-1">{getModeIcon(m)}</div>
              <div className="font-medium capitalize text-sm text-gray-900">{m}</div>
              <div className="text-xs text-gray-600 mt-1">{getModeDescription(m)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Upload y preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex gap-3 items-center mb-3">
          <label className="flex-1 cursor-pointer">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => onFile(e.target.files?.[0])} 
                className="hidden"
              />
              <div className="text-gray-400 mb-2">
                <span className="text-3xl">📸</span>
              </div>
              <div className="text-sm text-gray-600">
                {file ? file.name : 'Click para seleccionar imagen'}
              </div>
            </div>
          </label>
        </div>

        {preview && (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="max-h-64 mx-auto rounded" />
            {metadata && (
              <div className="text-xs text-gray-500 mt-2 text-center">
                {metadata.fileName} • {(metadata.fileSize / 1024).toFixed(1)} KB
              </div>
            )}
            <div className="mt-2 flex justify-center">
              <button
                onClick={recrop}
                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200 flex items-center gap-1"
              >
                ✂️ Volver a recortar
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button 
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={submit} 
            disabled={!file || loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Analizando con {model || 'llava'}...
              </span>
            ) : (
              `${getModeIcon(mode)} Analizar ${mode}`
            )}
          </button>
          
          {file && (
            <button 
              onClick={clear}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center"
            >
              <span className="mr-1">🗑️</span> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium mb-3 text-gray-900 flex items-center gap-2">
            <span>📋</span>
            Resultado del análisis
          </h3>
          
          {parsedData ? (
            <div className="space-y-3">
              {/* Vista estructurada para facturas */}
              {mode === 'factura' && parsedData && (
                <div className="grid gap-3">
                  {/* COMPROBANTE - Destacado arriba */}
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 border-2 border-indigo-600 rounded-lg p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium opacity-90 mb-1">Comprobante</div>
                        <div className="text-2xl font-bold">{parsedData.documento?.numero || 'No detectado'}</div>
                        <div className="text-sm opacity-90 mt-1">
                          {parsedData.documento?.tipo || 'Tipo no detectado'} • {parsedData.documento?.fecha || 'Sin fecha'}
                        </div>
                      </div>
                      <div className="text-5xl opacity-80">🧾</div>
                    </div>
                  </div>
                  
                  {/* Proveedor */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="font-medium text-blue-900 mb-2">📍 Proveedor</div>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Nombre:</span> {parsedData.emisor?.nombre || 'No detectado'}</div>
                      <div><span className="font-medium">CUIT:</span> {parsedData.emisor?.cuit || 'No detectado'}</div>
                    </div>
                  </div>
                  
                  {/* Productos con acciones */}
                  {parsedData.items && parsedData.items.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-purple-900">📦 Productos ({parsedData.items.length})</div>
                        <button 
                          className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors font-medium"
                          onClick={() => {
                            // TODO: Implementar carga masiva
                            console.log('Cargar todos los productos:', parsedData.items)
                            alert('Funcionalidad de carga masiva en desarrollo')
                          }}
                        >
                          ⚡ Cargar todos al stock
                        </button>
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {parsedData.items.map((p, i) => (
                          <div key={i} className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm mb-1">{p.descripcion}</div>
                                <div className="flex gap-4 text-xs text-gray-600">
                                  <span><strong>Cant:</strong> {p.cantidad}</span>
                                  <span><strong>P.Unit:</strong> ${parseFloat(p.precio_unitario).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                  <span className="font-semibold text-purple-700"><strong>Subtotal:</strong> ${parseFloat(p.subtotal).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button 
                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                  title="Agregar al stock existente"
                                  onClick={() => {
                                    // TODO: Buscar producto y agregar stock
                                    console.log('Agregar stock:', p)
                                    alert(`Agregar ${p.cantidad} de "${p.descripcion}"\nFuncionalidad en desarrollo`)
                                  }}
                                >
                                  + Stock
                                </button>
                                <button 
                                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                  title="Crear nuevo producto"
                                  onClick={() => {
                                    // TODO: Crear producto nuevo
                                    console.log('Nuevo producto:', p)
                                    alert(`Crear producto: "${p.descripcion}"\nFuncionalidad en desarrollo`)
                                  }}
                                >
                                  Nuevo
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Totales */}
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                    <div className="font-medium text-yellow-900 mb-3 text-lg">💰 Totales</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Subtotal (Neto):</span>
                        <span className="font-mono">${parseFloat(parsedData.totales?.neto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">IVA:</span>
                        <span className="font-mono">${parseFloat(parsedData.totales?.iva || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                      <div className="border-t-2 border-yellow-300 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-yellow-900">TOTAL:</span>
                          <span className="text-2xl font-bold text-yellow-900 font-mono">${parseFloat(parsedData.totales?.total || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Vista estructurada para productos */}
              {mode === 'producto' && parsedData && (
                <div className="grid gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="font-medium text-blue-900 mb-2">🏷️ Producto</div>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Marca:</span> {parsedData.marca || 'No detectada'}</div>
                      <div><span className="font-medium">Nombre:</span> {parsedData.nombre || 'No detectado'}</div>
                      <div><span className="font-medium">Presentación:</span> {parsedData.presentacion || 'No detectada'}</div>
                    </div>
                  </div>
                  
                  {parsedData.codigo_barras && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="font-medium text-green-900 mb-2">📊 Código de barras</div>
                      <div className="text-sm font-mono">{parsedData.codigo_barras}</div>
                    </div>
                  )}
                  
                  {parsedData.categorias && parsedData.categorias.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="font-medium text-purple-900 mb-2">📂 Categorías sugeridas</div>
                      <div className="flex flex-wrap gap-2">
                        {parsedData.categorias.map((cat, i) => (
                          <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {parsedData.descripcion && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="font-medium text-gray-900 mb-2">📝 Descripción</div>
                      <div className="text-sm text-gray-700">{parsedData.descripcion}</div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Texto completo colapsable */}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                  Ver respuesta completa del modelo
                </summary>
                <div className="mt-2 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm leading-relaxed max-h-96 overflow-y-auto text-gray-900">
                  {result}
                </div>
              </details>
            </div>
          ) : (
            <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm leading-relaxed max-h-96 overflow-y-auto text-gray-900">
              {result}
            </div>
          )}
        </div>
      )}

      {/* Información */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
        <div className="font-medium mb-1">💡 Requerimientos y consejos:</div>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Ollama corriendo localmente (puerto 11434)</li>
          <li>Modelo multimodal instalado (ej: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">llava</code>)</li>
          <li>Usa la herramienta de recorte para enfocar el área relevante</li>
          <li>Las guías visuales te ayudan a identificar dónde están los datos según el tipo de análisis</li>
          <li>Para mejores resultados usa imágenes claras y con buena iluminación</li>
        </ul>
      </div>
    </div>
  )
}
