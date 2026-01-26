"use client"
import { useState, useEffect, useCallback } from 'react'
import SelectProvinciaClient from '@/components/geoRef/SelectProvinciaClient'
import SelectLocalidadClient from '@/components/geoRef/SelectLocalidadClient'
import SelectCalleClient from '@/components/geoRef/SelectCalleClient'


/**
 * Modal para crear un nuevo proveedor con datos precargados de la factura
 * y opción de buscar datos por CUIT en internet
 */
export function ModalCrearProveedor({ datosFactura, isOpen, onCancelar, onCreado }) {
  const [formData, setFormData] = useState({
    nombre: datosFactura?.nombre || '',
    cuit: datosFactura?.cuit || '',
    domicilio: datosFactura?.domicilio || '',
    condicionIva: datosFactura?.condicionIva || '',
    inicioActividades: datosFactura?.inicioActividades || '',
    telefono: datosFactura?.telefono || '',
    email: datosFactura?.email || '',
    esProveedor: true
  })
  
  const [buscandoCuit, setBuscandoCuit] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [datosCuit, setDatosCuit] = useState(null)
  const [error, setError] = useState(null)
  // Evita buscar CUIT repetidamente cuando el modal se abre
  const [autoSearched, setAutoSearched] = useState(false)

  // Estados para autocompletado
  const [autoCompleting, setAutoCompleting] = useState(false)
  const [autoCompleted, setAutoCompleted] = useState(false)

  // IVA - opciones y mapeador (normaliza variantes encontradas en factura o internet)
  const IVA_OPTIONS = [
    'Responsable Inscripto',
    'Monotributo',
    'Exento',
    'Consumidor Final'
  ]
  const mapIva = (v) => {
    if (!v && v !== 0) return ''
    const s = String(v).toLowerCase().trim()
    if (/responsab|respon|inscrip|responsable inscripto/i.test(s)) return 'Responsable Inscripto'
    if (/monotrib|mono/i.test(s)) return 'Monotributo'
    if (/exento/i.test(s)) return 'Exento'
    if (/consumidor|final|consumidor final/i.test(s)) return 'Consumidor Final'
    // Intentar coincidencias parciales
    if (s.includes('responsable') && s.includes('inscrip')) return 'Responsable Inscripto'
    if (s.includes('monotr')) return 'Monotributo'
    // Si no se mapea a una opción conocida, devolver el raw para que el usuario lo revise
    return v
  }
  // Fuente detectada del valor de IVA (factura|internet|null)
  const [ivaSource, setIvaSource] = useState(null)

  // Dirección georeferenciada seleccionada
  const [sugerenciasDireccion, setSugerenciasDireccion] = useState([])
  const [calleDetectada, setCalleDetectada] = useState(null)
  const [numeroDetectado, setNumeroDetectado] = useState(null)
  const [direccionSeleccionada, setDireccionSeleccionada] = useState(null)
  const [autoGeoSearched, setAutoGeoSearched] = useState(false)

  // Actualizar formulario cuando cambian los datos precargados o cuando se abre el modal
  useEffect(() => {
    if (isOpen && datosFactura) {
      // Detectar calle y número simples desde el string del membrete
      let calleTxt = ''
      let numeroTxt = ''
      if (datosFactura?.domicilio) {
        const m = String(datosFactura.domicilio).match(/(.+?)\s+(\d+)\b/)
        if (m) {
          calleTxt = m[1].trim()
          numeroTxt = m[2]
        } else {
          // Intentar separar por coma y extraer primer segmento
          const parts = String(datosFactura.domicilio).split(',').map(p => p.trim())
          if (parts.length > 0) calleTxt = parts[0]
        }
      }

      const initialIvaRaw = datosFactura?.condicionIva || datosFactura?.iva || ''
      const initialIva = mapIva(initialIvaRaw)
      setFormData({
        nombre: datosFactura?.nombre || '',
        nombreFantasia: datosFactura?.nombre || '',
        cuit: datosFactura?.cuit || '',
        domicilio: datosFactura?.domicilio || '',
        condicionIva: initialIva || '',
        inicioActividades: datosFactura?.inicio_actividades || datosFactura?.inicioActividades || '',
        telefono: datosFactura?.telefono || datosFactura?.telefono_fijo || '',
        email: Array.isArray(datosFactura?.emails) ? datosFactura.emails.join(', ') : (datosFactura?.email || datosFactura?.correo || ''),
        esProveedor: true,
        detalles: '',
        idProvincia: null,
        idLocalidad: null,
        idCalle: null,
        idLocalidadCensal: null,
        numeroCalle: numeroTxt || null
      })
      // Registrar fuente si se detectó algo en la factura
      if (initialIva) setIvaSource('factura')
      setCalleDetectada(calleTxt)
      setNumeroDetectado(numeroTxt)
      setDatosCuit(null)
      setError(null)
      setAutoGeoSearched(false)
    }
  }, [datosFactura, isOpen])

  // Función para buscar calles (reutilizable)
  const performGeoSearch = useCallback(async () => {
    if (!isOpen) return null
    if (!calleDetectada || calleDetectada.length < 3) return null
    if (direccionSeleccionada) return direccionSeleccionada
    if (autoGeoSearched) return null

    setAutoGeoSearched(true)
    try {
      const queryText = [calleDetectada, datosFactura?.localidad || datosFactura?.idLocalidad || '', datosFactura?.provincia || datosFactura?.idProvincia || ''].filter(Boolean).join(' ')
      const res = await fetch('/api/geo/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: queryText })
      })
      const j = await res.json()
      if (j.ok && (j.resultados || []).length > 0) {
        const primera = j.resultados[0]
        setSugerenciasDireccion(j.resultados || [])
        setDireccionSeleccionada(primera)
        setFormData(prev => ({
          ...prev,
          idProvincia: primera.idProvincia,
          idLocalidad: primera.idLocalidadCensal,
          idCalle: primera.id,
          numeroCalle: numeroDetectado || prev.numeroCalle || null
        }))
        setSugerenciasDireccion([])
        return primera
      }
    } catch (e) {
      console.error('Error auto-buscando calle:', e)
    }
    return null
  }, [isOpen, calleDetectada, datosFactura, numeroDetectado, direccionSeleccionada, autoGeoSearched])

  // AUTO-GEO: usar performGeoSearch cuando sea necesario (mantener compatibilidad con anterior comportamiento)
  useEffect(() => {
    performGeoSearch()
  }, [performGeoSearch])

  const handleBuscarCuit = useCallback(async () => {
    if (!formData.cuit) {
      setError('Ingresa un CUIT para buscar')
      return
    }

    setBuscandoCuit(true)
    setError(null)
    try {
      // Llamar al endpoint que busca por CUIT
      const response = await fetch('/api/buscar-cuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit: formData.cuit })
      })

      const data = await response.json()

      if (data.ok && data.resultados && data.resultados.length > 0) {
        const primer = data.resultados[0]
        setDatosCuit(primer)

        // Combinar datos: priorizar el valor en la factura; usar internet como fallback y mapear variantes
        const invoiceIva = formData?.condicionIva && String(formData?.condicionIva).trim() ? String(formData.condicionIva).trim() : ''
        const internetIva = mapIva(primer.tipo)
        const finalIva = invoiceIva || internetIva || ''

        setFormData(prev => ({
          ...prev,
          // Nombre legal preferimos el del CUIT
          nombre: primer.nombre || prev.nombre,
          // Nombre de fantasía preferimos el del membrete si existe
          nombreFantasia: datosFactura?.nombre || prev.nombreFantasia || '',
          condicionIva: finalIva,
          ...(primer.datosAdicionales || {})
        }))

        if (!invoiceIva && internetIva) setIvaSource('internet')
        // return primer para que el llamador pueda usar los datos
        return primer
      } else {
        setError('No se encontraron datos para este CUIT')
        return null
      }
    } catch (err) {
      console.error('Error buscando CUIT:', err)
      setError('Error al buscar el CUIT. Intenta de nuevo.')
      return null
    } finally {
      setBuscandoCuit(false)
    }
  }, [formData.cuit, formData.condicionIva, datosFactura])

  // Auto-búsqueda cuando el modal se abre y hay CUIT en los datos de la factura
  useEffect(() => {
    if (isOpen && datosFactura?.cuit && !autoSearched) {
      setAutoSearched(true)
      // Pequeña espera para asegurar que el estado del formulario se haya establecido
      setTimeout(() => {
        handleBuscarCuit()
      }, 50)
    }
  }, [isOpen, datosFactura?.cuit, autoSearched, handleBuscarCuit])

  // AUTO-COMPLETE: completar todo el formulario automáticamente (CUIT -> Geo -> emails/tel)
  useEffect(() => {
    let mounted = true
    const performAutoComplete = async () => {
      if (!isOpen || !datosFactura || autoCompleted) return
      setAutoCompleting(true)
      try {
        // 1) CUIT lookup (si existe)
        let primer = null
        if (datosFactura?.cuit) {
          // esperar la búsqueda y usar el resultado
          primer = await handleBuscarCuit()
        }

        // 2) Geo (intentamos si hay domicilio detectado)
        await performGeoSearch()

        // 3) Completar emails y teléfono si no están en el form
        const emailFromInvoice = Array.isArray(datosFactura?.emails) ? datosFactura.emails.join(', ') : (datosFactura?.email || datosFactura?.correo || '')
        const emailFromWeb = primer?.datosAdicionales && (primer.datosAdicionales.email || primer.datosAdicionales.mail || primer.datosAdicionales.correos || '')
        const telefonoFromInvoice = datosFactura?.telefono || datosFactura?.telefono_fijo || ''
        const telefonoFromWeb = primer?.datosAdicionales && (primer.datosAdicionales.telefono || primer.datosAdicionales.telefono_fijo || primer.datosAdicionales.tel || '')

        setFormData(prev => ({
          ...prev,
          email: prev.email && prev.email.trim() ? prev.email : (emailFromInvoice || emailFromWeb || prev.email || ''),
          telefono: prev.telefono && prev.telefono.trim() ? prev.telefono : (telefonoFromInvoice || telefonoFromWeb || prev.telefono || ''),
        }))

        // Marcar completado
        if (mounted) setAutoCompleted(true)
      } catch (e) {
        console.error('Error en autocompletado:', e)
      } finally {
        if (mounted) setAutoCompleting(false)
      }
    }

    performAutoComplete()
    return () => { mounted = false }
  }, [isOpen, datosFactura, autoCompleted, handleBuscarCuit, performGeoSearch])

  // Resetear bandera cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) setAutoSearched(false)
  }, [isOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    
    try {
      // Construir direcciones si hay datos de georef o texto
      const direcciones = []
      // Si hay ids georreferenciados o seleccion directa, usamos esos campos (como en CargarContacto)
      if (formData.idProvincia || formData.idLocalidad || formData.idCalle || direccionSeleccionada) {
        direcciones.push({
          idProvincia: formData.idProvincia || direccionSeleccionada?.idProvincia || null,
          idLocalidad: formData.idLocalidad || direccionSeleccionada?.idLocalidadCensal || null,
          idCalle: formData.idCalle || direccionSeleccionada?.id || null,
          idLocalidadCensal: formData.idLocalidadCensal || direccionSeleccionada?.idLocalidadCensal || null,
          numeroCalle: formData.numeroCalle ? parseInt(formData.numeroCalle) : (numeroDetectado ? parseInt(numeroDetectado) : null),
          detalles: formData.detalles || formData.domicilio || null
        })
      } else if (formData.domicilio || formData.detalles) {
        // No se encontró coincidencia exacta: guardar como detalle libre
        direcciones.push({
          detalles: formData.detalles || formData.domicilio || null
        })
      }

      const payload = { ...formData, direcciones }

      // Llamar al endpoint API para crear contacto
      const response = await fetch('/api/contactos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        // Conflict: contact with same CUIT exists. Instead of throwing, surface options to the user.
        if (response.status === 409 && result?.contacto) {
          setConflictContact(result.contacto)
          setError(result.error || 'Ya existe un contacto con ese CUIT')
          return
        }
        throw new Error(result.error || 'Error al crear el proveedor')
      }
      
      // Cerrar modal y notificar éxito
      onCreado(result.contacto)
    } catch (err) {
      console.error('Error creando proveedor:', err)
      setError(err.message || 'Error al crear el proveedor')
    } finally {
      setGuardando(false)
    }
  }

  const handleUsarExistente = () => {
    if (!conflictContact) return
    // Asociar el contacto existente al flujo (por ejemplo, asociar proveedor en la factura)
    onCreado(conflictContact)
  }

  const handleCrearAliasEnExistente = async () => {
    if (!conflictContact) return
    setGuardando(true)
    setError(null)
    try {
      const aliasNombre = formData.nombreFantasia || formData.nombre || datosFactura?.nombre || ''
      const res = await fetch('/api/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactoId: conflictContact.id, alias: aliasNombre, fuente: 'IA_SCAN', observaciones: 'Vinculado desde ModalCrearProveedor' })
      })
      const j = await res.json()
      if (!res.ok) {
        throw new Error(j.error || 'Error creando alias')
      }
      // Éxito: cerrar modal y asociar el contacto existente
      onCreado(conflictContact)
    } catch (e) {
      console.error('Error creando alias para contacto existente:', e)
      setError(e.message || 'Error creando alias')
    } finally {
      setGuardando(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            🏪 Crear Nuevo Proveedor
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            Datos precargados desde la factura. Completa o modifica según necesites.
          </p>
          {autoCompleting && (
            <div className="text-sm text-gray-600 mt-2">Autocompletando formulario… ⏳</div>
          )}
          {autoCompleted && (
            <div className="text-sm text-green-600 mt-2">Formulario autocompletado automáticamente.</div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Sección CUIT con búsqueda */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CUIT <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="cuit"
                  value={formData.cuit}
                  onChange={handleChange}
                  required
                  placeholder="20-12345678-9"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="pt-6">
                <button
                  type="button"
                  onClick={handleBuscarCuit}
                  disabled={buscandoCuit || !formData.cuit}
                  aria-live="polite"
                  aria-busy={buscandoCuit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  {buscandoCuit ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      <span className="ml-1">⏳ Buscando en Internet...</span>
                    </>
                  ) : (
                    <>
                      🔍 Buscar en Internet
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="mt-3 bg-white rounded-lg p-3 border border-blue-300 min-h-[72px]">
              {buscandoCuit ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : datosCuit ? (
                <div>
                  <div className="text-xs text-blue-700 font-medium mb-1">✅ Datos encontrados:</div>
                  <div className="text-sm text-gray-700 overflow-auto max-h-40">
                    <div><strong>Nombre:</strong> {datosCuit.nombre}</div>
                    <div><strong>Tipo:</strong> {datosCuit.tipo}</div>
                    {datosCuit.datosAdicionales && Object.keys(datosCuit.datosAdicionales).length > 0 && (
                      <div className="mt-1 text-xs">
                        {Object.entries(datosCuit.datosAdicionales).map(([key, value]) => (
                          <div key={key}><strong>{key}:</strong> {value}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No hay datos disponibles.</div>
              )}

              {/* Si hay conflicto por CUIT (contacto existente), mostrar acciones */}
              {conflictContact && (
                <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded p-3 text-sm">
                  <div className="font-medium text-yellow-800">⚠️ Ya existe un contacto con ese CUIT</div>
                  <div className="text-xs text-gray-700 mt-1">Nombre: <strong>{conflictContact.nombre}</strong> {conflictContact.cuit && <span>• CUIT: {conflictContact.cuit}</span>}</div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleUsarExistente}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-xs"
                    >
                      ✅ Usar contacto existente
                    </button>

                    <button
                      type="button"
                      onClick={handleCrearAliasEnExistente}
                      disabled={guardando}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-xs disabled:opacity-60"
                    >
                      🔗 Crear alias y usar
                    </button>

                    <button
                      type="button"
                      onClick={() => { setConflictContact(null); setError(null) }}
                      className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 border border-gray-200 font-medium text-xs"
                    >
                      ✖️ Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Nombre legal */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre legal (según CUIT)
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Nombre de fantasía (según factura) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de fantasía (según factura)
              </label>
              <input
                type="text"
                name="nombreFantasia"
                value={formData.nombreFantasia || ''}
                onChange={handleChange}
                placeholder="Nombre mostrado en la factura"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Domicilio (Georreferenciado) */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <SelectProvinciaClient
                  name="idProvincia"
                  value={formData.idProvincia}
                  onChange={({name, value}) => {
                    setDireccionSeleccionada(null)
                    setFormData(prev => ({...prev, idProvincia: value, idLocalidad: null, idCalle: null, idLocalidadCensal: null}))
                  }}
                />
              </div>

              <div>
                <SelectLocalidadClient
                  idProvincia={formData.idProvincia}
                  name="idLocalidad"
                  value={formData.idLocalidad}
                  onChange={({name, value, option}) => {
                    setDireccionSeleccionada(null)
                    setFormData(prev => ({...prev, idLocalidad: value, idLocalidadCensal: option?.idLocalidadCensal || null, idCalle: null}))
                  }}
                />
              </div>

              <div>
                <SelectCalleClient
                  idProvincia={formData.idProvincia}
                  idLocalidadCensal={formData.idLocalidadCensal}
                  name="idCalle"
                  value={formData.idCalle}
                  onChange={({name, value, option}) => {
                    setFormData(prev => ({...prev, idCalle: value, idLocalidadCensal: option?.idLocalidadCensal || prev.idLocalidadCensal}))
                    setDireccionSeleccionada(option || null)
                  }}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input
                  type="text"
                  name="numeroCalle"
                  value={formData.numeroCalle || ''}
                  onChange={handleChange}
                  placeholder="Número"
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg"
                />
                {calleDetectada && (
                  <div className="text-xs text-gray-500 mt-1">Detectado en factura: {calleDetectada}{numeroDetectado ? (' · ' + numeroDetectado) : ''}</div>
                )}
              </div>
            </div>

            {/* Condición IVA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condición IVA
              </label>
              <select
                name="condicionIva"
                value={formData.condicionIva}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Seleccionar...</option>
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Monotributo">Monotributo</option>
                <option value="Exento">Exento</option>
                <option value="Consumidor Final">Consumidor Final</option>
              </select>
              {ivaSource && (
                <div className="text-xs text-gray-500 mt-1">Fuente: {ivaSource === 'factura' ? 'Factura' : ivaSource === 'internet' ? 'Internet' : ivaSource}</div>
              )}
            </div>

            {/* Inicio Actividades */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inicio de Actividades
              </label>
              <input
                type="date"
                name="inicioActividades"
                value={formData.inicioActividades}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Sugerir dirección georreferenciada */}
          <div className="mt-4">
            <div className="text-xs text-gray-600 mb-2">¿Detectar dirección y sugerir coincidencias?</div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={calleDetectada || ''}
                onChange={(e) => setCalleDetectada(e.target.value)}
                placeholder="Ej: 9 de Julio, Av. Santa Fe"
                className="flex-1 px-3 py-2 border rounded"
              />
              <input
                type="text"
                value={numeroDetectado || ''}
                onChange={(e) => setNumeroDetectado(e.target.value)}
                placeholder="N°"
                className="w-24 px-3 py-2 border rounded"
              />
              <button
                type="button"
                onClick={async () => {
                  // Llamar a API de búsqueda de calles
                  if (!calleDetectada || calleDetectada.length < 2) return
                  setSugerenciasDireccion([])
                  try {
                    const res = await fetch('/api/geo/search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: calleDetectada })
                    })
                    const j = await res.json()
                    if (j.ok) {
                      setSugerenciasDireccion(j.resultados || [])
                    }
                  } catch (e) {
                    console.error('Error buscando calle:', e)
                  }
                }}
                className="px-3 py-2 bg-gray-100 rounded border"
              >Buscar</button>
            </div>

            {sugerenciasDireccion.length > 0 && (
              <div className="space-y-2">
                {sugerenciasDireccion.map((s) => (
                  <div key={s.id} className="p-2 border rounded flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.nombre}</div>
                      <div className="text-xs text-gray-600">{s.localidad || ''} • {s.provincia || ''}</div>
                    </div>
                    <div>
                      <button
                        onClick={() => {
                          setDireccionSeleccionada(s)
                          // Llenar el form con ids para creación
                          setFormData(prev => ({
                            ...prev,
                            idProvincia: s.idProvincia,
                            idLocalidad: s.idLocalidadCensal,
                            idCalle: s.id,
                            numeroCalle: numeroDetectado || prev.numeroCalle || null
                          }))
                          setSugerenciasDireccion([])
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded"
                      >Usar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campo para observaciones/detalles */}
          <div className="mt-4">
            <label className="block text-sm text-gray-700 mb-1">Detalles de dirección</label>
            <input
              type="text"
              name="detalles"
              value={formData.detalles || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={guardando}
            className="flex-1 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              <>
                ✅ Crear Proveedor
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
