"use client"
import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useVisionStatusContext } from '@/context/OllamaStatusContext'
// ImageCropper modal moved to 'cementerio' — preserved as commented JSX below
// import ImageCropper from './ImageCropper'
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
  ModalMapeoAlias,
  ModalCrearProveedor
} from './components'
import FacturaResumenFooter from './components/FacturaResumenFooter'
import SelectorProveedorSimilar from './SelectorProveedorSimilar'
import CameraCaptureModal from '@/components/formComponents/CameraCapture'
import ManualVertexCropper from './ManualVertexCropper'

// ========== COMPONENTE PRINCIPAL ==========
export default function IaImage({ model, preloadModel }) {
  // Estados
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('factura')
  const [metadata, setMetadata] = useState(null)
  // showCropper modal retired (moved to cementerio). Use inline manual cropper instead.
  // const [showCropper, setShowCropper] = useState(false)
  // const [tempFile, setTempFile] = useState(null)
  // const [tempPreview, setTempPreview] = useState(null)

  // Live streaming preview states
  const [streaming, setStreaming] = useState(false)
  const [streamCrop, setStreamCrop] = useState(null)
  const [streamCropPoints, setStreamCropPoints] = useState(null)
  const [streamRestored, setStreamRestored] = useState(null)
  const [streamInferPreview, setStreamInferPreview] = useState(null)
  const [streamInferMeta, setStreamInferMeta] = useState(null)
  const [streamOcr, setStreamOcr] = useState(null)
  const [streamItems, setStreamItems] = useState(null)
  const [streamError, setStreamError] = useState(null)
  
  const [proveedorEncontrado, setProveedorEncontrado] = useState(null)
  const [productosBuscados, setProductosBuscados] = useState({})
  const [pedidosRelacionados, setPedidosRelacionados] = useState([])
  const [facturaDuplicada, setFacturaDuplicada] = useState(null)
  const [aliasesPorItem, setAliasesPorItem] = useState([])
  const [buscandoDatos, setBuscandoDatos] = useState(false)
  
  // Modal de selector de proveedor
  const [modalProveedor, setModalProveedor] = useState(false)
  const [modalCrearProveedor, setModalCrearProveedor] = useState(false)
  
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
  const [imagenMejorada, setImagenMejorada] = useState(null) // archivo mejorado (si aplica)
  const [previewOriginal, setPreviewOriginal] = useState(null)
  const [autoEnfoqueAplicado, setAutoEnfoqueAplicado] = useState(false)
  // Estado para indicar si la imagen que se muestra es la original, mejorada o recortada
  const [imagenStatus, setImagenStatus] = useState('original') // 'original' | 'mejorada' | 'recortada'
  // Estado para drag & drop
  const [dragActive, setDragActive] = useState(false)
  
  // Refs
  const canvasRef = useRef(null)
  const imgOriginalRef = useRef(null)
  
  // Hooks personalizados
  const autoEnfocar = useImageAutoFocus()
  const aplicarTransformaciones = useImageTransformations(preview, imgOriginalRef, canvasRef, ajustes, zoom, pan)
  
  // Estado de IA local (para saber si el modelo está cargado)
  const { getModelStatus } = useVisionStatusContext()
  
  // Efectos
  useEffect(() => {
    if (mostrarControles) {
      aplicarTransformaciones()
    }
  }, [ajustes, mostrarControles, aplicarTransformaciones])
  
  // Handlers
  const onFile = (f) => {
    if (!f) return

    try {
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
      setTimeout(async () => {
        try {
          const applied = await autoEnfocar(f, url, setFile, setPreview, preview)
          setAutoEnfoqueAplicado(Boolean(applied))
          if (!applied) {
            // Auto-enfoque no detectó nada útil → abrir recorte manual en la pantalla principal
            setManualCropOpen(true)
          }
        } catch (ae) {
          console.error('Error en auto-enfoque:', ae)
          setErrorMessage('No se pudo aplicar el preprocesamiento automático de la imagen.')
        }
      }, 100)
    } catch (e) {
      console.error('Error procesando archivo:', e)
      setErrorMessage('No se pudo procesar la imagen. Intenta subirla nuevamente.')
    }
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
  
  // Estados para modales de cropping y cámara
  const [manualCropOpen, setManualCropOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  // Handler compartido para procesamiento de capturas de cámara
  const handleCameraCapture = async (dataUrl) => {
    try {
      // Convertir dataURL a File optimizando tamaño (JPEG 85%)
      const img = new Image()
      img.src = dataUrl
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej })

      const maxW = 1200
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })

      // Reutilizar handler existente
      onFile(file)
      setCameraOpen(false)
    } catch (e) {
      console.error('Error procesando imagen capturada:', e)
      setErrorMessage('No se pudo procesar la foto de la cámara. Intenta nuevamente.')
    }
  }

  // Open inline manual cropper instead of modal
  const abrirCropper = () => {
    if (!file) return
    setManualCropOpen(true)
  }

  const abrirManualCrop = () => {
    if (!file) return
    setManualCropOpen(true)
  }

  const handleCrop = async (images) => {
    // images = { cropped: {file, preview}, original: {file, preview}, enhanced?: {file, preview} }

    // Si existe una versión mejorada, usarla como imagen principal
    const primary = images.enhanced || images.cropped

    // La imagen croppeada (o mejorada) se usa para mostrar y enviar al LLM
    setFile(primary.file)
    setPreview(primary.preview)

    // La original se guarda para la base de datos
    setImagenOriginal(images.original.file)
    setPreviewOriginal(images.original.preview)

    // Guardar referencia a la imagen mejorada si existe (para auditoría/debug)
    try {
      if (images.enhanced) {
        setImagenMejorada(images.enhanced.file)
        setImagenStatus('mejorada')
        // Auditoría: usuario aceptó imagen mejorada desde crop manual
        await guardarAuditoriaEdicion({
          campo: 'IMAGEN_MEJORADA',
          valorAnterior: null,
          valorNuevo: images.enhanced.file.name,
          contexto: { source: 'manual_crop', method: 'enhanced' }
        })
      } else {
        // Si no hay mejora, es un crop simple
        setImagenMejorada(null)
        setImagenStatus('recortada')
        await guardarAuditoriaEdicion({
          campo: 'IMAGEN_RECORTADA',
          valorAnterior: null,
          valorNuevo: images.cropped.file.name,
          contexto: { source: 'manual_crop', method: 'crop_only' }
        })
      }
    } catch (e) {
      console.warn('No se pudo guardar auditoría de crop/mejora:', e)
    }

    setResult(null)
    setMetadata(null)
    // Close inline cropper
    setManualCropOpen(false)

    // Re-aplicar auto-enfoque y preprocesamiento sobre la imagen principal (mejorada si existe)
    setTimeout(() => {
      try {
        autoEnfocar(primary.file, primary.preview, setFile, setPreview, preview)
        setAutoEnfoqueAplicado(true)
      } catch (e) {
        console.warn('No se pudo re-aplicar auto-enfoque en la imagen aceptada:', e)
      }
    }, 100)
  }
  
  // Cancel no longer supports modal flow; close inline cropper instead
  const handleCancelCrop = () => {
    setManualCropOpen(false)
  }
  
  // Función helper para esperar que un modelo se cargue
  const waitForModelLoad = (modelName, timeout = 300000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const checkInterval = setInterval(() => {
        const status = getModelStatus(modelName)
        if (status === 'loaded') {
          clearInterval(checkInterval)
          resolve()
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          reject(new Error('Timeout esperando que el modelo se cargue'))
        }
      }, 500) // Chequear cada 500ms
    })
  }
  
  const submit = async (mantenerResultados = false) => {
    if (!file) return

    // Si el modelo no está cargado, disparar la precarga del modelo y esperar
    try {
      const status = getModelStatus(model)
      if (status === 'unloaded' && typeof preloadModel === 'function') {
        console.log('🔄 Modelo no cargado, comprobando fallback heurístico...')
        try {
          // Verificar si el parser heurístico ya está cargado para evitar esperas largas
          const ms = await fetch('/api/ai/status')
          const msj = await ms.json()
          const loadedNames = (msj.loadedModels || []).map(m => m.name)
          if (loadedNames.includes('heuristic/parser')) {
            console.warn('Heurístico disponible → usando heuristic/parser en lugar de esperar carga del modelo solicitado')
            setModel('heuristic/parser')
          } else {
            // Si heurístico no está, iniciar precarga del modelo y esperar (con timeout)
            console.log('🔄 Heurístico no disponible; iniciando precarga del modelo solicitado...')
            await preloadModel()
            console.log('⏳ Esperando que el modelo se cargue...')
            try {
              await waitForModelLoad(model, 300000) // Timeout de 5 minutos
              console.log('✅ Modelo cargado, continuando con análisis...')
            } catch (waitErr) {
              console.warn('Timeout esperando modelo, intentando analizar de todas formas:', waitErr)
              // Reintentar ver heurístico y hacer fallback si aparece
              const ms2 = await fetch('/api/ai/status')
              const msj2 = await ms2.json()
              const loaded2 = (msj2.loadedModels || []).map(m => m.name)
              if (!loaded2.includes(model) && loaded2.includes('heuristic/parser')) {
                console.warn('Modelo no cargado → fallback automático a heuristic/parser')
                setModel('heuristic/parser')
              }
            }
          }
        } catch (err) {
          console.warn('No se pudo comprobar o precargar el modelo:', err)
        }
      }
    } catch (err) {
      // No bloquear si falla la comprobación de estado
      console.warn('No se pudo comprobar o precargar el modelo:', err)
    }

    setLoading(true)
    setErrorMessage(null)
    
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

        // Merge results with existing parsedData if mantener resultados (preservar ediciones locales)
        if (mantenerResultados && parsedData) {
          const merged = mergeParsedDataKeepEdits(parsedData, data.data)
          setParsedData(merged)
          console.log('📊 Datos recibidos y mergeados con ediciones locales:', merged)
        } else {
          setParsedData(data.data)
          console.log('📊 Datos recibidos:', data.data)
        }

        setErrorMessage(null)
        
        if (mode === 'factura' && (mantenerResultados ? parsedData || data.data : data.data)) {
          buscarDatosRelacionados(mantenerResultados && parsedData ? (parsedData) : data.data)
        }
      } else {
        const msg = data.error || 'Respuesta inválida'
        setErrorMessage(msg + (data.retryable ? ' • Puedes reintentar.' : ''))
        setResult(null)
      }
    } catch (e) {
      setErrorMessage(`Error de conexión: ${e.message}`)
      setResult(null)
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

      // Si tenemos el archivo de la factura en `file`, convertirlo a data URL y adjuntarlo
      // IMPORTANTE: Guardar la imagen ORIGINAL (sin crop ni procesamiento) en la BD
      // Pero si no hay original, usar la procesada (file)
      // Preferir guardar la versión mejorada si existe, sino la original, sino la crop
      const imagenParaGuardar = imagenMejorada || imagenOriginal || file
      
      if (imagenParaGuardar) {
        const fileToDataUrl = (f) => new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(f)
        })

        try {
          const dataUrl = await fileToDataUrl(imagenParaGuardar)
          datosFactura.imagen = dataUrl
          console.log('💾 Guardando imagen en BD (preferencia aplicada):', imagenParaGuardar.name)

          // Adjuntar metadatos de mejora si existieran
          if (debugInfo?.restoredModel || debugInfo?.restoredParams || debugInfo?.enhancedSaved) {
            datosFactura.imagen_meta = {
              restoredModel: debugInfo?.restoredModel || null,
              restoredParams: debugInfo?.restoredParams || null,
              enhancedSaved: !!debugInfo?.enhancedSaved
            }
          }
        } catch (e) {
          console.warn('No se pudo convertir la imagen a base64 para guardar:', e.message)
        }
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

  // Start a streaming preview from the vision microservice (SSE-like chunked JSON)
  const startLiveProcessing = async () => {
    if (!file) return
    setStreaming(true)
    setStreamCrop(null)
    setStreamCropPoints(null)
    setStreamRestored(null)
    setStreamOcr(null)
    setStreamItems(null)
    setStreamError(null)

    try {
      const VISION_HOST = process.env.NEXT_PUBLIC_VISION_HOST || 'http://localhost:8000'
      const form = new FormData()
      form.append('image', file)
      form.append('mode', mode)
      form.append('enhance', '1')
      form.append('auto_crop', '1')
      form.append('stream', '1')

      const res = await fetch(`${VISION_HOST}/restore`, { method: 'POST', body: form })
      if (!res.ok) {
        const txt = await res.text()
        setStreamError(`Streaming request failed: ${res.status} ${res.statusText} - ${txt}`)
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buf = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        // SSE-ish payloads separated by double newline
        const parts = buf.split('\n\n')
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i].trim()
          if (!part) continue
          // Each event is expected as: data: <json>
          const lines = part.split('\n').map(l => l.trim())
          for (const ln of lines) {
            if (ln.startsWith('data:')) {
              const raw = ln.replace(/^data:\s*/, '')
              try {
                const ev = JSON.parse(raw)
                // Handle stages
                if (ev.stage === 'crop') {
                  setStreamCrop(ev.crop_image_base64 || null)
                  setStreamCropPoints(ev.crop_points || null)
                } else if (ev.stage === 'restored') {
                  setStreamRestored(ev.restored_image_base64 || null)
                } else if (ev.stage === 'ocr') {
                  setStreamOcr(ev.ocr_text || null)
                  if (ev.infer_preview_base64) {
                    setStreamInferPreview(ev.infer_preview_base64)
                    setStreamInferMeta(ev.infer_preview_meta || null)
                  }
                } else if (ev.stage === 'formatted_items') {
                  setStreamItems(ev.items || null)
                } else if (ev.stage === 'final') {
                  // Apply final parsed extraction to UI but keep streaming previews
                  if (ev.extraction) {
                    setParsedData(ev.extraction)
                  }
                  if (ev.restored_image_base64) setStreamRestored(ev.restored_image_base64)
                  if (ev.crop_image_base64) setStreamCrop(ev.crop_image_base64)
                  if (ev.inference_image_base64) {
                    setStreamInferPreview(ev.inference_image_base64)
                    setStreamInferMeta(ev.inference_image_meta || null)
                  }
                } else if (ev.stage === 'error') {
                  setStreamError(ev.error || 'Unknown')
                }
              } catch (e) {
                console.warn('Failed to parse stream event JSON:', e, raw)
              }
            }
          }
        }
        buf = parts[parts.length - 1]
      }

    } catch (err) {
      console.error('Streaming preview failed:', err)
      setStreamError(err.message || String(err))
    } finally {
      setStreaming(false)
    }
  }
  
  const actualizarCampo = async (path, valorNuevo, valorAnterior) => {
    // Deep copy parsedData to modify
    const newData = JSON.parse(JSON.stringify(parsedData))

    const keys = path.split('.')
    let current = newData
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {}
      current = current[keys[i]]
    }

    const lastKey = keys[keys.length - 1]

    // Convert certain fields to numbers when appropriate
    const numericFields = ['cantidad_documento','cantidad','precio_unitario','precio','subtotal_calculado','descuento','descuento_total','iva','neto','total','total_impreso']
    let valorProcesado = valorNuevo
    if (numericFields.includes(lastKey)) {
      const parsed = parseFloat(String(valorNuevo).replace(',', '.'))
      valorProcesado = isNaN(parsed) ? 0 : parsed
    }

    current[lastKey] = valorProcesado

    // Mark this path as edited so re-procesamientos no lo overrite
    newData._edited = newData._edited || {}
    newData._edited[path] = true

    // If we edited an item field, mirror description edits to similar keys so UI shows it consistently
    if (keys[0] === 'items' && keys.length >= 3) {
      const itemIndex = parseInt(keys[1], 10)
      const item = newData.items && newData.items[itemIndex]
      if (item && lastKey === 'descripcion' && typeof valorProcesado === 'string') {
        item.descripcion = valorProcesado
        item.descripcion_exacta = valorProcesado
        item.nombre_producto = valorProcesado
        item.producto = valorProcesado
        item.detalle = valorProcesado
      }

      if (item) {
        const unit = Number(item.precio_unitario ?? item.precio ?? 0)
        const qty = Number(item.cantidad_documento ?? item.cantidad ?? 0)

        if (['cantidad_documento','cantidad','precio_unitario','precio'].includes(lastKey)) {
          // Recalculate subtotal from unit * qty when quantity/price changed
          item.subtotal_calculado = Number((unit * qty) || 0)
        } else if (lastKey === 'subtotal_calculado') {
          // Ensure subtotal is numeric when user edits it manually
          item.subtotal_calculado = Number(valorProcesado || 0)
        }
      }
    }

    // Recalculate aggregate totals based on items
    const items = Array.isArray(newData.items) ? newData.items : []
    const subtotal = items.reduce((s, it) => {
      const unit = Number(it.precio_unitario ?? it.precio ?? 0)
      const qty = Number(it.cantidad_documento ?? it.cantidad ?? 0)
      const lineRaw = it.subtotal_calculado ?? it.subtotal_original ?? (unit * qty)
      const line = Number(lineRaw || 0)
      return s + (isFinite(line) ? line : 0)
    }, 0)

    // Discounts: prefer overall discount in totales, otherwise sum item discounts
    const discountFromTotales = typeof newData.totales?.descuento_total === 'number'
      ? newData.totales.descuento_total
      : (typeof newData.totales?.descuento === 'number' ? newData.totales.descuento : 0)
    const itemsDiscount = items.reduce((s, it) => s + (Number(it.descuento || 0)), 0)
    const totalDescuento = discountFromTotales || itemsDiscount || 0

    if (!newData.totales) newData.totales = {}
    // Set neto as raw subtotal (before discounts)
    newData.totales.neto = subtotal

    // Store computed discount if none provided
    if (!newData.totales.descuento_total && totalDescuento > 0) {
      newData.totales.descuento_total = totalDescuento
    }

    // If IVA is present include it, otherwise assume 0
    const ivaVal = typeof newData.totales.iva === 'number' ? newData.totales.iva : 0
    newData.totales.total_calculado = Number(subtotal - totalDescuento + ivaVal)

    // Recompute diferencia if total_impreso exists
    if (typeof newData.totales.total_impreso === 'number') {
      newData.totales.diferencia = Number((newData.totales.total_impreso - newData.totales.total_calculado) || 0)
    } else {
      delete newData.totales.diferencia
    }

    setParsedData(newData)

    await guardarAuditoriaEdicion({
      campo: path,
      valorAnterior,
      valorNuevo: valorProcesado,
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
  
  // Helper: merge parsed data preferring user edits recorded in _edited
  const mergeParsedDataKeepEdits = (oldData, newData) => {
    if (!oldData) return newData
    if (!newData) return oldData

    const merged = JSON.parse(JSON.stringify(newData))
    merged._edited = merged._edited || {}

    // Preserve top-level editable fields
    if (oldData.totales && oldData._edited) {
      for (const k of Object.keys(oldData.totales)) {
        if (oldData._edited[`totales.${k}`]) {
          merged.totales = merged.totales || {}
          merged.totales[k] = oldData.totales[k]
        }
      }
    }

    // Merge items preserving edited fields per index
    if (Array.isArray(oldData.items) && Array.isArray(newData.items)) {
      merged.items = merged.items || []
      const maxLen = Math.max(oldData.items.length, newData.items.length)
      for (let i = 0; i < maxLen; i++) {
        const oldItem = oldData.items[i] || {}
        merged.items[i] = merged.items[i] || {}
        const keysToPreserve = ['descripcion','cantidad','cantidad_documento','precio_unitario','precio','subtotal_calculado','descuento','es_devolucion']
        for (const k of keysToPreserve) {
          if (oldData._edited && oldData._edited[`items.${i}.${k}`]) {
            merged.items[i][k] = oldItem[k]
          }
        }
      }
    }

    return merged
  }

  return (
    <div className="grid gap-4">
      {/* CEMENTERIO: Former modal cropper preserved here for reference; not used in current flow.
      {showCropper && tempPreview && (
        <ImageCropper 
          src={tempPreview}
          mode={mode}
          model={model}
          onCrop={handleCrop}
          onCancel={handleCancelCrop}
        />
      )}
      */}
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
            onManualCrop={abrirManualCrop}
            headerText={imagenStatus === 'mejorada' ? '📄 Imagen mejorada' : imagenStatus === 'recortada' ? '📄 Imagen recortada' : '📄 Imagen original'}
          />

          {manualCropOpen && (
            <ManualVertexCropper
              src={preview}
              onCrop={handleCrop}
              onCancel={() => setManualCropOpen(false)}
            />
          )}

          {/* Columna derecha: Resultados */}
          <div className={`border-2 rounded-xl shadow-xl p-4 ${parsedData ? 'bg-white border-green-500' : 'bg-gray-50 border-gray-300'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">{parsedData ? '✅' : loading ? '⏳' : '📋'}</span>
                  {parsedData ? 'Factura Procesada' : loading ? 'Analizando...' : 'Presiona Analizar para comenzar'}
                </h2>

                {metadata?.timing?.totalMs != null && (
                  <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                    <div>
                      ⏱️ Tiempo: {(metadata.timing.totalMs / 1000).toFixed(3)}s ({metadata.timing.totalMs} ms)
                      {metadata.timing.visionMs ? ` • IA: ${metadata.timing.visionMs} ms` : ''}
                    </div>
                    {metadata.image?.reduction && (
                      <div className="text-green-600 font-medium">
                        🎯 Imagen optimizada: {metadata.image.reduction} más ligera
                        {metadata.image.optimized && metadata.image.original && (
                          <span className="text-gray-400 ml-1">
                            ({metadata.image.optimized.width}×{metadata.image.optimized.height} • escala de grises)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                  onCrearProveedor={() => setModalCrearProveedor(true)}
                />

                {/* Modal para crear proveedor directamente desde el encabezado */}
                <ModalCrearProveedor
                  datosFactura={parsedData.emisor}
                  isOpen={modalCrearProveedor}
                  onCancelar={() => setModalCrearProveedor(false)}
                  onCreado={async (nuevo) => {
                    // Asociar proveedor creado y recargar búsquedas
                    await handleAsociarProveedor(nuevo)
                    setModalCrearProveedor(false)
                  }}
                />
                
                <TotalesFactura 
                  totales={parsedData.totales}
                  items={parsedData.items}
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
                />

                {/* Footer resumen con botón de guardar abajo */}
                <FacturaResumenFooter
                  parsedData={parsedData}
                  proveedorEncontrado={proveedorEncontrado}
                  aliasesPorItem={aliasesPorItem}
                  productosBuscados={productosBuscados}
                  onGuardarFactura={handleGuardarFactura}
                  guardando={guardandoFactura}
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

                {errorMessage && (
                  <div className="mb-4 bg-red-50 border border-red-300 rounded-lg p-3 text-red-800 flex items-start justify-between">
                    <div>
                      <div className="font-medium">Error al analizar la imagen</div>
                      <div className="text-sm mt-1 break-words">{errorMessage}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => submit(false)}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        🔁 Reintentar
                      </button>
                      <button
                        onClick={() => setErrorMessage(null)}
                        className="text-sm text-gray-600 mt-1"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
                
                {!loading && (
                  <div className="flex gap-3">
                    <button 
                      className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-bold text-lg shadow-lg"
                      onClick={submit} 
                      disabled={!file}
                    >
                      🚀 Analizar Factura
                    </button>

                    <button
                      className={`px-4 py-4 bg-white border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 transition-colors font-bold text-lg shadow-sm ${!file ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={startLiveProcessing}
                      disabled={!file || streaming}
                      title="Muestra recorte y mejora en tiempo real"
                    >
                      {streaming ? '⏳ Vista previa...' : '👁️ Vista previa'}
                    </button>
                  </div>
                )}
                
                {loading && (
                  <div className="text-center py-2 text-blue-600 font-medium animate-pulse">
                    ⏳ Analizando factura, por favor espera...
                  </div>
                )}
                
                {(streamCrop || streamRestored || streamItems || streamOcr || streamError) && (
                  <div className="mt-4 grid grid-cols-2 gap-3 items-start">
                    {streamCrop && (
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">✂️ Recorte (preview)</div>
                        <div className="relative w-full" style={{ minHeight: 120 }}>
                          <Image
                            src={`data:image/png;base64,${streamCrop}`}
                            alt="crop preview"
                            unoptimized={true}
                            className="rounded-lg border"
                            width={800}
                            height={600}
                          />
                        </div>
                      </div>
                    )}

                    {streamRestored && (
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">✨ Mejorada (preview)</div>
                        <div className="relative w-full" style={{ minHeight: 120 }}>
                          <Image
                            src={`data:image/png;base64,${streamRestored}`}
                            alt="restored preview"
                            unoptimized={true}
                            className="rounded-lg border"
                            width={800}
                            height={600}
                          />
                        </div>
                      </div>
                    )}

                    {streamInferPreview && (
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">🔎 Infer preview (enviado a OCR/LLM)</div>
                        <div className="relative w-full" style={{ minHeight: 120 }}>
                          <Image
                            src={`data:image/jpeg;base64,${streamInferPreview}`}
                            alt="infer preview"
                            unoptimized={true}
                            className="rounded-lg border"
                            width={800}
                            height={600}
                          />
                        </div>
                        {streamInferMeta && (
                          <div className="text-xs text-muted mt-1">{streamInferMeta.width}×{streamInferMeta.height} • {Math.round((streamInferMeta.size_bytes||0)/1024)}KB • q{streamInferMeta.quality} • {streamInferMeta.gray ? 'grayscale' : 'color'}</div>
                        )}
                      </div>
                    )}

                    <div className="col-span-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2">
                      {streamOcr && (
                        <div className="mb-2">
                          <div className="font-medium text-xs text-gray-600">🔤 OCR (preview)</div>
                          <pre className="text-xs mt-1 max-h-28 overflow-auto bg-white p-2 rounded border">{streamOcr}</pre>
                        </div>
                      )}
                      {streamItems && (
                        <div className="mb-2">
                          <div className="font-medium text-xs text-gray-600">📦 Items (heuristic preview)</div>
                          <ul className="text-xs mt-1 list-disc list-inside max-h-28 overflow-auto">
                            {streamItems.map((it, idx) => (
                              <li key={idx}>{it.descripcion || '(sin descripción)'} — {it.cantidad ?? '-'} x {it.precio_unitario ?? '-'}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {streamError && <div className="text-xs text-red-600">Error: {streamError}</div>}
                    </div>
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
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true) }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true) }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false) }}
              onDrop={(e) => { try { e.preventDefault(); e.stopPropagation(); setDragActive(false); const f = e.dataTransfer?.files?.[0]; if (f) onFile(f) } catch (dropErr) { console.error('Error procesando archivo arrastrado:', dropErr); setErrorMessage('No se pudo procesar la imagen arrastrada. Intenta subirla mediante el selector.') } }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { document.getElementById('ia-image-input')?.click() } }}
            >
              <input
                id="ia-image-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  try {
                    const f = e.target.files?.[0]
                    if (f) onFile(f)
                  } catch (chgErr) {
                    console.error('Error en input file change:', chgErr)
                    setErrorMessage('Error al leer el archivo seleccionado. Intenta de nuevo.')
                  }
                }}
                className="hidden"
              />
              <div className="text-3xl mb-1">📸</div>
              <div className="text-sm text-gray-600 font-medium">Arrastra y suelta la imagen aquí o haz click para seleccionar</div>
              <div className="text-xs text-gray-400 mt-2">Soporta PNG, JPG, WEBP</div>

              {/* Botón de cámara para capturar foto (ícono pequeño) */}
              <div className="mt-3 flex justify-center">
                <CameraCaptureModal showTrigger={true} onCapture={handleCameraCapture} />
              </div>

              {/* Botón grande y visible para celular */}
              <div className="mt-3 sm:hidden">
                <button
                  onClick={() => setCameraOpen(true)}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-lg"
                >
                  📷 Tomar foto (cámara)
                </button>

                {cameraOpen && (
                  <CameraCaptureModal
                    showTrigger={false}
                    isOpen={cameraOpen}
                    setIsOpen={setCameraOpen}
                    onCapture={handleCameraCapture}
                    onRequestClose={() => setCameraOpen(false)}
                  />
                )}
              </div>
            </div>
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
            <li>El microservicio `vision` debe estar corriendo (por defecto en el contenedor: puerto 8000)</li>
            <li>Modelo <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-purple-600">qwen2.5-vl</code> recomendado para facturas</li>
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
          onCrearProveedor={() => { setModalProveedor(false); setModalCrearProveedor(true) }}
        />
      )}
    </div>
  )
}
