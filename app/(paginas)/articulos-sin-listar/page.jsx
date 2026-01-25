"use client"
import { useState, useEffect, useCallback } from 'react'
import { obtenerArticulosSinMapear, obtenerProveedoresConPendientes } from '@/prisma/serverActions/articulosSinMapear'
import { mapearAliasAProducto } from '@/prisma/serverActions/buscarAliases'
import { ModalMapeoAlias } from '@/components/ia/components/ModalMapeoAlias'
import Icon from '@/components/formComponents/Icon'
import Link from 'next/link'

export default function ArticulosSinListarPage() {
  const [articulos, setArticulos] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [proveedores, setProveedores] = useState([])
  const [proveedorFiltro, setProveedorFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [vistaAgrupada, setVistaAgrupada] = useState(true)
  const [productosParaMapeo, setProductosParaMapeo] = useState([])
  
  // Modal de mapeo
  const [modalMapeo, setModalMapeo] = useState({ open: false, alias: null })

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const datos = await obtenerArticulosSinMapear({
        proveedorId: proveedorFiltro || undefined
      })
      setArticulos(vistaAgrupada ? datos.agrupados : datos.detalles)
      setTotal(datos.total)
    } catch (error) {
      toast.error('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [proveedorFiltro, vistaAgrupada])

  useEffect(() => {
    cargarDatos()
    cargarProveedores()
    cargarProductos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargarProveedores = async () => {
    try {
      const provs = await obtenerProveedoresConPendientes()
      setProveedores(provs)
    } catch (error) {
      console.error('Error cargando proveedores:', error)
    }
  }

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

  const abrirModalMapeo = (alias) => {
    setModalMapeo({ open: true, alias })
  }

  const cerrarModalMapeo = () => {
    setModalMapeo({ open: false, alias: null })
  }

  const handleMapeoExitoso = () => {
    cargarDatos()
  }

  const articulosFiltrados = articulos.filter(art => {
    if (!busqueda) return true
    const desc = vistaAgrupada ? art.descripcion : art.descripcionPendiente
    return desc?.toLowerCase().includes(busqueda.toLowerCase())
  })

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">📋 Artículos Sin Listar</h1>
              <p className="text-gray-600">Productos de facturas pendientes de mapeo</p>
            </div>
            <Link
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Volver al Dashboard
            </Link>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600">Total Pendientes</div>
              <div className="text-2xl font-bold text-gray-900">{total}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600">Proveedores</div>
              <div className="text-2xl font-bold text-gray-900">{proveedores.length}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600">Vista Actual</div>
              <div className="text-2xl font-bold text-gray-900">
                {vistaAgrupada ? 'Agrupada' : 'Detallada'}
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Búsqueda */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar
                </label>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por descripción..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filtro proveedor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor
                </label>
                <select
                  value={proveedorFiltro}
                  onChange={(e) => setProveedorFiltro(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los proveedores</option>
                  {proveedores.map(prov => (
                    <option key={prov.id} value={prov.id}>
                      {prov.nombre} ({prov._count.documentosProveedor})
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle vista */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setVistaAgrupada(!vistaAgrupada)
                    cargarDatos()
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {vistaAgrupada ? '📋 Vista Detallada' : '📊 Vista Agrupada'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Cargando...</div>
          </div>
        ) : articulosFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-200">
            <div className="text-gray-400 text-5xl mb-4">📭</div>
            <div className="text-gray-900 font-medium text-lg mb-2">
              No hay artículos sin mapear
            </div>
            <div className="text-gray-600">
              {busqueda || proveedorFiltro 
                ? 'Prueba ajustando los filtros' 
                : 'Todos los productos están mapeados'}
            </div>
          </div>
        ) : vistaAgrupada ? (
          <VistaAgrupada 
            articulos={articulosFiltrados} 
            onMapear={abrirModalMapeo} 
          />
        ) : (
          <VistaDetallada 
            articulos={articulosFiltrados} 
            onMapear={abrirModalMapeo} 
          />
        )}
      </div>

      {/* Modal de mapeo */}
      <ModalMapeoAlias
        isOpen={modalMapeo.open}
        onClose={cerrarModalMapeo}
        alias={modalMapeo.alias}
        productosOptions={productosParaMapeo}
        onSuccess={handleMapeoExitoso}
      />
    </main>
  )
}

function VistaAgrupada({ articulos, onMapear }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Descripción
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Proveedor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Facturas
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cantidad Total
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Precio Promedio
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {articulos.map((art, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{art.descripcion}</div>
                {art.alias && (
                  <div className="text-xs text-gray-500">
                    SKU: {art.alias.sku}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {art.proveedor?.nombre}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {art.facturas.length}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {art.cantidad.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${art.precioPromedio.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex gap-2">
                  {art.alias ? (
                    <button
                      onClick={() => onMapear(art.alias)}
                      className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 border border-yellow-200 font-medium text-xs"
                    >
                      🔗 Mapear
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">Sin alias</span>
                  )}
                  <button
                    onClick={() => {
                      window.location.href = `/productos?nuevo=true&nombre=${encodeURIComponent(art.descripcion)}`
                    }}
                    className="px-3 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 font-medium text-xs"
                  >
                    ➕ Crear
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VistaDetallada({ articulos, onMapear }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Factura
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Proveedor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Descripción
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cantidad
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Precio
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {articulos.map((det) => (
            <tr key={det.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {det.documento.numeroDocumento}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {new Date(det.documento.fecha).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {det.documento.proveedor?.nombre}
              </td>
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900">{det.descripcionPendiente}</div>
                {det.alias && (
                  <div className="text-xs text-gray-500">
                    SKU: {det.alias.sku}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {det.cantidad}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${det.precioUnitario.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex gap-2">
                  {det.alias ? (
                    <button
                      onClick={() => onMapear(det.alias)}
                      className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 border border-yellow-200 font-medium text-xs"
                    >
                      🔗 Mapear
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">Sin alias</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
