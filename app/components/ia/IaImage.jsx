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
import { buscarAliasesPorItems } from '@/prisma/serverActions/buscarAliases'
import { guardarFacturaCompra } from '@/prisma/serverActions/documentos'

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
  LoadingSkeletons,
  OptimizedImage,
  ImageColumn,
  AdvancedImageActions,
  ModalMapeoAlias
} from './components'
import SelectorProveedorSimilar from './SelectorProveedorSimilar'

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
  const [aliasesPorItem, setAliasesPorItem] = useState([])
  const [buscandoDatos, setBuscandoDatos] = useState(false)
  
  // Modal de selector de proveedor
  const [modalProveedor, setModalProveedor] = useState(false)
  
  // Modal de mapeo
  const [modalMapeo, setModalMapeo] = useState({ open: false, alias: null, itemIndex: null })
  const [productosParaMapeo, setProductosParaMapeo] = useState([])
  const [guardandoFactura, setGuardandoFactura] = useState(false)
  
  const [mostrarControles, setMostrarControles] = useState(false)
  const [ajustes, setAjustes] = useState(DEFAULT_ADJUSTMENTS)
  
  // Estados para zoom y pan
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  
  // Estados para permitir deshacer auto-enfoque
  const [imagenOriginal, setImagenOriginal] = useState(null)
  const [previewOriginal, setPreviewOriginal] = useState(null)
  const [autoEnfoqueAplicado, setAutoEnfoqueAplicado] = useState(false)
  
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
    
    // Guardar imagen original
    setImagenOriginal(f)
    setPreviewOriginal(url)
    setFile(f)
    setPreview(url)
    setResult(null)
    setAutoEnfoqueAplicado(false)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setMetadata({
      fileName: f.name,
      fileSize: f.size,
      fileType: f.type
    })
    
    // Auto-enfocar después de un momento
    setTimeout(() => {
      autoEnfocar(f, url, setFile, setPreview, preview)
      setAutoEnfoqueAplicado(true)
    }, 100)
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
  
  const deshacerAutoEnfoque = () => {
    if (imagenOriginal && previewOriginal) {
      // Liberar URL actual si existe
      if (preview && preview !== previewOriginal) {
        URL.revokeObjectURL(preview)
      }
      
      setFile(imagenOriginal)
      setPreview(previewOriginal)
      setAutoEnfoqueAplicado(false)
      setMostrarControles(false) // Cerrar controles si están abiertos
      
      console.log('↩️ Auto-enfoque deshecho, imagen original restaurada')
    }
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
        
        // Si no se encontró proveedor, mostrar modal para asociar
        if (!provResult?.proveedor) {
          console.log('⚠️ Proveedor no encontrado - mostrando selector')
          setModalProveedor(true)
        }
        
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
        
        // Buscar aliases existentes (sin crear nada)
        let aliases = []
        if (proveedorId) {
          console.log(`🔍 Buscando aliases existentes para proveedor...`)
          aliases = await buscarAliasesPorItems({ proveedorId, items: factura.items })
          setAliasesPorItem(aliases)
          console.log(`✅ ${aliases.filter(a => a.tieneAlias).length} aliases encontrados de ${factura.items.length} items`)
        }
        
        // Buscar productos por nombre (para sugerencias)
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
        console.log('✅ Búsqueda de productos completado (sin crear aliases)')
      }
    } catch (error) {
      console.error('Error buscando datos relacionados:', error)
    } finally {
      setBuscandoDatos(false)
    }
  }
  
  // Cargar productos para el modal de mapeo
  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const response = await fetch('/api/productos/list')
        if (response.ok) {
          const data = await response.json()
          setProductosParaMapeo(data.productos || [])
        }
      } catch (error) {
        console.error('Error cargando productos:', error)
      }
    }
    cargarProductos()
  }, [])
  
  // Handlers para modal de mapeo
  const abrirModalMapeo = (alias, itemIndex) => {
    setModalMapeo({ open: true, alias, itemIndex })
  }
  
  const cerrarModalMapeo = () => {
    setModalMapeo({ open: false, alias: null, itemIndex: null })
  }
  
  const handleMapeoExitoso = (aliasActualizado) => {
    // Actualizar el estado de aliases
    setAliasesPorItem(prevAliases => {
      const nuevosAliases = [...prevAliases]
      if (modalMapeo.itemIndex !== null && nuevosAliases[modalMapeo.itemIndex]) {
        nuevosAliases[modalMapeo.itemIndex] = {
          ...nuevosAliases[modalMapeo.itemIndex],
          alias: aliasActualizado,
          mapeado: true,
          producto: aliasActualizado.producto,
          presentacion: aliasActualizado.presentacion
        }
      }
      return nuevosAliases
    })
    
    // Recargar búsqueda de productos si es necesario
    if (parsedData) {
      buscarDatosRelacionados(parsedData)
    }
  }
  
  // Handler para asociar proveedor
  const handleAsociarProveedor = async (contacto) => {
    console.log('✅ Proveedor asociado:', contacto)
    setProveedorEncontrado({ 
      proveedor: contacto,
      confianza: 1.0,
      mensaje: 'Proveedor asociado manualmente'
    })
    setModalProveedor(false)
    
    // Recargar datos relacionados con el nuevo proveedor
    if (parsedData) {
      await buscarDatosRelacionados(parsedData)
    }
  }
  
  const handleGuardarFactura = async () => {
    if (!parsedData || !proveedorEncontrado?.proveedor) {
      alert('❌ Faltan datos: Asegúrate de tener proveedor y datos de factura')
      return
    }
    
    // Confirmar con el usuario
    const itemsSinMapear = aliasesPorItem?.filter(a => a.tieneAlias && !a.mapeado).length || 0
    const itemsSinAlias = parsedData.items.length - (aliasesPorItem?.filter(a => a.tieneAlias).length || 0)
    
    let mensaje = `¿Guardar factura?\n\n`
    mensaje += `Proveedor: ${proveedorEncontrado.proveedor.nombre}\n`
    mensaje += `Número: ${parsedData.documento?.numero || 'Sin número'}\n`
    mensaje += `Total items: ${parsedData.items.length}\n`
    
    if (itemsSinMapear > 0 || itemsSinAlias > 0) {
      mensaje += `\n⚠️ Advertencia:\n`
      if (itemsSinMapear > 0) mensaje += `- ${itemsSinMapear} item(s) con alias sin mapear\n`
      if (itemsSinAlias > 0) mensaje += `- ${itemsSinAlias} item(s) sin alias\n`
      mensaje += `\n✅ Se guardará la factura de todos modos.\n`
      mensaje += `Podrás crear los productos faltantes después.`
    }
    
    if (!confirm(mensaje)) return
    
    setGuardandoFactura(true)
    try {
      // Preparar detalles
      const detalles = parsedData.items.map((item, index) => {
        const aliasInfo = aliasesPorItem[index]
        
        return {
          aliasId: aliasInfo?.alias?.id || null,
          idProducto: aliasInfo?.mapeado ? aliasInfo.producto?.id : null,
          presentacionId: aliasInfo?.mapeado ? aliasInfo.presentacion?.id : null,
          descripcionPendiente: !aliasInfo?.mapeado ? (item.descripcion || item.detalle || item.producto) : null,
          cantidad: parseFloat(item.cantidad) || 1,
          precioUnitario: parseFloat(item.precio_unitario || item.precio) || 0,
          descuento: parseFloat(item.descuento) || 0
        }
      })
      
      // Preparar datos de factura
      const datosFactura = {
        idProveedor: proveedorEncontrado.proveedor.id,
        numeroDocumento: parsedData.documento?.numero || '',
        fecha: parsedData.documento?.fecha || new Date().toISOString().split('T')[0],
        tipoDocumento: parsedData.documento?.tipo || 'FACTURA_A',
        estado: 'IMPAGA',
        tieneImpuestos: true,
        detalles
      }
      
      console.log('📝 Guardando factura:', datosFactura)
      
      // Guardar factura
      const resultado = await guardarFacturaCompra(datosFactura)
      
      // Mostrar resultado
      const mapeados = detalles.filter(d => d.idProducto).length
      const pendientes = detalles.filter(d => !d.idProducto).length
      
      if (pendientes > 0) {
        const confirmarCrear = confirm(
          `✅ Factura guardada exitosamente\n\n` +
          `📊 Resumen:\n` +
          `- ${mapeados} producto(s) con stock actualizado\n` +
          `- ${pendientes} producto(s) pendientes\n\n` +
          `¿Deseas crear los productos pendientes ahora?`
        )
        
        if (confirmarCrear) {
          // Crear productos pendientes uno por uno
          const itemsPendientes = parsedData.items.filter((item, idx) => !detalles[idx].idProducto)
          for (const item of itemsPendientes) {
            const params = new URLSearchParams()
            params.set('nuevo', 'true')
            params.set('nombre', item.descripcion || item.detalle || item.producto || '')
            if (item.codigo) params.set('codigo', item.codigo)
            if (item.cantidad) params.set('cantidad', item.cantidad.toString())
            if (item.precio_unitario || item.precio) params.set('precio', (item.precio_unitario || item.precio).toString())
            params.set('proveedorId', proveedorEncontrado.proveedor.id)
            
            window.open(`/cargarProductos?${params.toString()}`, '_blank')
          }
          return // No limpiar la interfaz para poder seguir trabajando
        }
      } else {
        alert(
          `✅ Factura guardada exitosamente\n\n` +
          `📊 Todos los productos (${mapeados}) fueron procesados con éxito.\n\n` +
          `Stock actualizado correctamente.`
        )
      }
      
      // Limpiar interfaz
      setFile(null)
      setPreview(null)
      setParsedData(null)
      setProveedorEncontrado(null)
      setAliasesPorItem([])
      setProductosBuscados({})
      
    } catch (error) {
      console.error('Error guardando factura:', error)
      alert('❌ Error guardando factura: ' + error.message)
    } finally {
      setGuardandoFactura(false)
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
          <ImageColumn
            preview={preview}
            mostrarControles={mostrarControles}
            setMostrarControles={setMostrarControles}
            clear={clear}
            imgOriginalRef={imgOriginalRef}
            canvasRef={canvasRef}
            ajustes={ajustes}
            setAjustes={setAjustes}
            aplicarAjustes={aplicarAjustes}
            resetearAjustes={resetearAjustes}
            ImageControlsOverlay={ImageControlsOverlay}
            OptimizedImage={OptimizedImage}
            zoom={zoom}
            setZoom={setZoom}
            pan={pan}
            setPan={setPan}
            isPanning={isPanning}
            setIsPanning={setIsPanning}
            panStart={panStart}
            setPanStart={setPanStart}
          />

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
                  aliasesPorItem={aliasesPorItem}
                  proveedorId={proveedorEncontrado?.proveedor?.id}
                  onAbrirModalMapeo={abrirModalMapeo}
                  onGuardarFactura={guardandoFactura ? null : handleGuardarFactura}
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
                
                <AdvancedImageActions
                  loading={loading}
                  autoEnfoqueAplicado={autoEnfoqueAplicado}
                  deshacerAutoEnfoque={deshacerAutoEnfoque}
                  imagenOriginal={imagenOriginal}
                  autoEnfocar={autoEnfocar}
                  file={file}
                  preview={preview}
                  previewOriginal={previewOriginal}
                  setFile={setFile}
                  setPreview={setPreview}
                  setAutoEnfoqueAplicado={setAutoEnfoqueAplicado}
                  abrirCropper={abrirCropper}
                />
                
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
      
      {/* Modal de mapeo de alias */}
      <ModalMapeoAlias
        isOpen={modalMapeo.open}
        onClose={cerrarModalMapeo}
        alias={modalMapeo.alias}
        productosOptions={productosParaMapeo}
        onSuccess={handleMapeoExitoso}
      />
      
      {/* Modal de selector de proveedor */}
      {parsedData?.emisor && (
        <SelectorProveedorSimilar
          proveedorDetectado={parsedData.emisor}
          onSeleccionar={handleAsociarProveedor}
          onCancelar={() => setModalProveedor(false)}
          isOpen={modalProveedor}
        />
      )}
    </div>
  )
}
