"use client"
import { useState, useEffect } from 'react'
import { vincularNombreEscaneadoConContacto } from '@/prisma/serverActions/aliasActions'
import logger from '@/lib/logger'

/**
 * Modal para vincular un nombre escaneado (que no se encontró) con un proveedor existente
 * Permite crear un alias para mejorar el reconocimiento futuro
 */
export function ModalVincularProveedor({ nombreEscaneado, isOpen, onCancelar, onVinculado }) {
  const [proveedores, setProveedores] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null)
  const [observaciones, setObservaciones] = useState('')
  const [vinculando, setVinculando] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(false)
  const [cargandoProveedores, setCargandoProveedores] = useState(false)

  // Cargar proveedores disponibles cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      cargarProveedores()
      setObservaciones(`Nombre detectado por IA al escanear factura: "${nombreEscaneado}"`)
    }
  }, [isOpen, nombreEscaneado])

  const cargarProveedores = async () => {
    setCargandoProveedores(true)
    try {
      const res = await fetch('/api/contactos?tipo=proveedor')
      if (res.ok) {
        const data = await res.json()
        setProveedores(data.contactos || [])
      }
    } catch (err) {
      logger.error(`Error cargando proveedores: ${err}`, '[ModalVincularProveedor]')
      setError('No se pudieron cargar los proveedores')
    } finally {
      setCargandoProveedores(false)
    }
  }

  const proveedoresFiltrados = proveedores.filter(p => {
    if (!busqueda) return true
    const search = busqueda.toLowerCase()
    return (
      (p.nombre || '').toLowerCase().includes(search) ||
      (p.nombreFantasia || '').toLowerCase().includes(search) ||
      (p.cuit || '').includes(search)
    )
  })

  const handleVincular = async () => {
    if (!proveedorSeleccionado) {
      setError('Por favor selecciona un proveedor de la lista')
      return
    }

    if (!nombreEscaneado || nombreEscaneado.trim() === '') {
      setError('El nombre escaneado no puede estar vacío')
      return
    }

    setVinculando(true)
    setError(null)

    try {
      logger.info({ nombreEscaneado, proveedorId: proveedorSeleccionado.id, proveedorNombre: proveedorSeleccionado.nombre }, '[ModalVincularProveedor]')

      const alias = await vincularNombreEscaneadoConContacto({
        nombreEscaneado: nombreEscaneado.trim(),
        contactoId: proveedorSeleccionado.id,
        observaciones: observaciones || `Nombre detectado por IA: "${nombreEscaneado}"`,
        userId: null // TODO: obtener del contexto de sesión
      })

      logger.info({ alias }, '[ModalVincularProveedor]')
      
      // Mostrar éxito
      setExito(true)
      
      // Esperar un momento para mostrar el éxito antes de cerrar
      setTimeout(() => {
        // Notificar al padre que se vinculó exitosamente
        onVinculado({
          proveedor: proveedorSeleccionado,
          alias: alias
        })

        // Limpiar estado
        setProveedorSeleccionado(null)
        setBusqueda('')
        setObservaciones('')
        setExito(false)
      }, 1500)
    } catch (err) {
      logger.error(`Error vinculando proveedor: ${err}`, '[ModalVincularProveedor]')
      const errorMsg = err.message || 'Error al vincular el proveedor'
      setError(errorMsg)
      
      // Si el error es que ya existe, también es un éxito
      if (errorMsg.includes('ya existe para este contacto')) {
        setExito(true)
        setTimeout(() => {
          onVinculado({
            proveedor: proveedorSeleccionado,
            alias: { alias: nombreEscaneado, contactoId: proveedorSeleccionado.id }
          })
          setProveedorSeleccionado(null)
          setBusqueda('')
          setObservaciones('')
          setExito(false)
          setError(null)
        }, 1500)
      }
    } finally {
      setVinculando(false)
    }
  }

  if (!isOpen) return null

  // Pantalla de éxito
  if (exito) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-8">
          <div className="text-center">
            <div className="mb-4 text-6xl">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Alias Creado!</h2>
            <p className="text-gray-600">
              El nombre <span className="font-semibold">&ldquo;{nombreEscaneado}&rdquo;</span> ahora está vinculado con <span className="font-semibold">{proveedorSeleccionado?.nombre}</span>
            </p>
            <div className="mt-6 text-sm text-gray-500">
              Cerrando automáticamente...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>🔗</span>
            Vincular Proveedor
          </h2>
          <p className="text-orange-100 mt-2">
            El nombre escaneado no se encontró. Vincúlalo con un proveedor existente para mejorar el reconocimiento.
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Nombre escaneado */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
            <div className="text-sm font-semibold text-yellow-800 mb-1">Nombre detectado por IA:</div>
            <div className="text-lg font-bold text-yellow-900">&ldquo;{nombreEscaneado}&rdquo;</div>
          </div>

          {/* Buscador */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar proveedor
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, fantasía o CUIT..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Lista de proveedores */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona el proveedor correcto ({proveedoresFiltrados.length} encontrados)
            </label>
            
            {cargandoProveedores ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                <p className="mt-2">Cargando proveedores...</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                {proveedoresFiltrados.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron proveedores
                  </div>
                ) : (
                  proveedoresFiltrados.map((proveedor) => (
                    <button
                      key={proveedor.id}
                      onClick={() => setProveedorSeleccionado(proveedor)}
                      onDoubleClick={() => {
                        setProveedorSeleccionado(proveedor)
                        setTimeout(() => handleVincular(), 100)
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-orange-50 transition-colors ${
                        proveedorSeleccionado?.id === proveedor.id
                          ? 'bg-orange-50 border-l-4 border-l-orange-500 shadow-sm'
                          : 'hover:border-l-2 hover:border-l-orange-200'
                      }`}
                      title="Haz doble clic para vincular rápidamente"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {proveedor.nombre}
                            {proveedorSeleccionado?.id === proveedor.id && (
                              <span className="text-orange-600 text-xl animate-pulse">✓</span>
                            )}
                          </div>
                          {proveedor.nombreFantasia && proveedor.nombreFantasia !== proveedor.nombre && (
                            <div className="text-sm text-gray-600">
                              💼 {proveedor.nombreFantasia}
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            🆔 {proveedor.cuit}
                          </div>
                        </div>
                        {proveedorSeleccionado?.id === proveedor.id && (
                          <div className="text-xs bg-orange-600 text-white px-3 py-1 rounded-full font-semibold ml-4">
                            Seleccionado
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            
            {/* Hint de doble clic */}
            {proveedoresFiltrados.length > 0 && !proveedorSeleccionado && (
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <span>💡</span>
                <span>Tip: Haz doble clic en un proveedor para vincular rápidamente</span>
              </div>
            )}
          </div>

          {/* Observaciones */}
          {proveedorSeleccionado && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones (opcional)
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Agrega notas sobre esta vinculación..."
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
              <div className="text-red-800 font-semibold">❌ {error}</div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-900">
              <span className="font-semibold">💡 Nota:</span> Al vincular este nombre, se creará un alias 
              para que en futuras cargas de facturas el sistema reconozca automáticamente este proveedor.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancelar}
            disabled={vinculando}
            className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleVincular}
            disabled={!proveedorSeleccionado || vinculando}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {vinculando ? (
              <>
                <div className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Vinculando...
              </>
            ) : (
              <>
                <span>🔗</span>
                Vincular Proveedor
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
