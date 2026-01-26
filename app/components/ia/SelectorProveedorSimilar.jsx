"use client"
import { useState, useEffect, useCallback } from 'react'
import { buscarContactosSimilares } from '@/prisma/serverActions/contactos'
import Icon from '@/components/formComponents/Icon'
import { ModalCrearProveedor } from './components/ModalCrearProveedor'
import { ModalVincularProveedor } from './components/ModalVincularProveedor'

export default function SelectorProveedorSimilar({ 
  proveedorDetectado, 
  onSeleccionar, 
  onCancelar,
  isOpen,
  onCrearProveedor
}) {
  const [contactosSimilares, setContactosSimilares] = useState([])
  const [loading, setLoading] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false)
  const [mostrarModalVincular, setMostrarModalVincular] = useState(false)

  const buscarSimilares = useCallback(async () => {
    setLoading(true)
    try {
      const similares = await buscarContactosSimilares({
        nombre: proveedorDetectado?.nombre,
        cuit: proveedorDetectado?.cuit,
        esProveedor: true
      })
      setContactosSimilares(similares)
    } catch (error) {
      console.error('Error buscando contactos similares:', error)
      setContactosSimilares([])
    } finally {
      setLoading(false)
    }
  }, [proveedorDetectado])

  useEffect(() => {
    if (isOpen && proveedorDetectado) {
      buscarSimilares()
    }
  }, [isOpen, proveedorDetectado, buscarSimilares])

  const handleConfirmar = () => {
    if (seleccionado) {
      onSeleccionar(seleccionado)
    }
  }

  const handleProveedorCreado = (nuevoProveedor) => {
    // cerrar local modal y seleccionar
    setMostrarModalCrear(false)
    onSeleccionar && onSeleccionar(nuevoProveedor)
  }

  const handleProveedorVinculado = ({ proveedor, alias }) => {
    console.log('✅ Proveedor vinculado:', proveedor, 'con alias:', alias)
    setMostrarModalVincular(false)
    onSeleccionar && onSeleccionar(proveedor)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col z-50">
          {/* Header */}
<div className="bg-white p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Icon i="building" />
            Asociar Proveedor
          </h2>
          <p className="text-gray-600 mt-1 text-sm opacity-90">
              El proveedor detectado no está registrado. Selecciona un contacto existente o créalo.
            </p>
          </div>

          {/* Proveedor Detectado */}
          <div className="p-6 border-b border-gray-200 bg-orange-50">
            <div className="text-sm text-gray-600 mb-1">Proveedor detectado en la factura:</div>
            <div className="bg-white rounded-lg p-4 border-2 border-orange-200">
              <div className="font-bold text-lg text-gray-900">{proveedorDetectado.nombre}</div>
              {proveedorDetectado.cuit && (
                <div className="text-sm text-gray-600 mt-1">
                  CUIT: {proveedorDetectado.cuit}
                </div>
              )}
              {proveedorDetectado.domicilio && (
                <div className="text-sm text-gray-600">
                  Domicilio: {proveedorDetectado.domicilio}
                </div>
              )}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <div className="text-gray-600">Buscando contactos similares...</div>
                </div>
              </div>
            ) : contactosSimilares.length > 0 ? (
              <>
                <div className="text-sm font-medium text-gray-700 mb-3">
                  Contactos similares encontrados ({contactosSimilares.length}):
                </div>
                <div className="space-y-2">
                  {contactosSimilares.map((contacto) => (
                    <div
                      key={contacto.id}
                      onClick={() => setSeleccionado(contacto)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        seleccionado?.id === contacto.id
                          ? 'border-orange-500 bg-orange-50 shadow-md'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {contacto.nombre}
                            {seleccionado?.id === contacto.id && (
                              <span className="text-orange-500">✓</span>
                            )}
                          </div>
                          {contacto.cuit && (
                            <div className="text-sm text-gray-600">CUIT: {contacto.cuit}</div>
                          )}
                          {contacto.domicilio && (
                            <div className="text-sm text-gray-500 truncate">
                              {contacto.domicilio}
                            </div>
                          )}
                          {contacto.telefono && (
                            <div className="text-sm text-gray-500">
                              Tel: {contacto.telefono}
                            </div>
                          )}
                        </div>
                        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                          {Math.round(contacto.similitud * 100)}% similar
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Icon i="search" className="text-4xl mb-2 text-gray-400" />
                <div className="font-medium">No se encontraron contactos similares</div>
                <div className="text-sm mt-1">Deberás crear un nuevo contacto</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMostrarModalVincular(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                <Icon i="link" />
                Vincular con Existente
              </button>

              <button
                onClick={() => {
                  if (typeof onCrearProveedor === 'function') {
                    // cerrar selector antes de abrir modal global
                    try { onCancelar && onCancelar() } catch (e) { /* ignore */ }
                    return onCrearProveedor()
                  }
                  // fallback local modal: abrir modal local y dejar selector visible detrás (modal tiene zIndex alto)
                  setMostrarModalCrear(true)
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
              >
                <Icon i="plus" />
                Crear Nuevo Contacto
              </button>
              
              {seleccionado && (
                <button
                  onClick={handleConfirmar}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center gap-2"
                >
                  <Icon i="check" />
                  Asociar con {seleccionado.nombre}
                </button>
              )}
              
              <button
                onClick={onCancelar}
                className="ml-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal para crear proveedor */}
      <ModalCrearProveedor
        datosFactura={proveedorDetectado}
        isOpen={mostrarModalCrear}
        onCancelar={() => setMostrarModalCrear(false)}
        onCreado={handleProveedorCreado}
      />

      {/* Modal para vincular nombre escaneado con proveedor existente */}
      <ModalVincularProveedor
        nombreEscaneado={proveedorDetectado?.nombre}
        isOpen={mostrarModalVincular}
        onCancelar={() => setMostrarModalVincular(false)}
        onVinculado={handleProveedorVinculado}
      />
    </>
  )
}

