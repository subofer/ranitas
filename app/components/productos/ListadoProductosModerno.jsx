"use client"
import { useState, useEffect } from 'react';
import { getProductos } from '@/prisma/consultas/productos';
import { eliminarProductoConPreciosPorId } from '@/prisma/serverActions/productos';
import { alertaBorrarProducto } from '../alertas/alertaBorrarProducto';
import Link from 'next/link';
import Icon from '../formComponents/Icon';
import BotonAgregarPedido from '../pedidos/BotonAgregarPedido';
import ImageWithFallback from '../ui/ImageWithFallback';
import { useErrorNotification } from '@/hooks/useErrorNotification';

const ListadoProductosModerno = ({ mostrarCodigo = true, modoCompacto = false }) => {
  const { showError } = useErrorNotification();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [vistaTipo, setVistaTipo] = useState('lista'); // 'lista' o 'cuadricula'

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const productosData = await getProductos();
      setProductos(productosData || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter(producto => {
    const coincideNombre = producto.nombre?.toLowerCase().includes(filtro.toLowerCase());
    const coincideCodigo = producto.codigoBarra?.toLowerCase().includes(filtro.toLowerCase());
    const coincideCategoria = !categoriaFiltro ||
      producto.categorias?.some(cat => cat.nombre?.toLowerCase().includes(categoriaFiltro.toLowerCase()));

    return (coincideNombre || coincideCodigo) && coincideCategoria;
  });

  const categoriasUnicas = [...new Set(
    productos.flatMap(p => p.categorias?.map(c => c.nombre) || [])
  )].filter(Boolean).sort();

  const handleEliminarProducto = async (producto) => {
    const confirmado = await alertaBorrarProducto(producto.nombre);
    if (confirmado) {
      try {
        await eliminarProductoConPreciosPorId(producto.id);
        cargarProductos(); // Recargar la lista después de eliminar
      } catch (error) {
        console.error('Error eliminando producto:', error);
        showError('Error al eliminar el producto: ' + error.message);
      }
    }
  };

  // Componente para vista de lista moderna
  const VistaLista = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon icono="list" className="text-gray-600 text-lg mr-3" />
            <h2 className="text-lg font-medium text-gray-900">Vista de Lista</h2>
          </div>
          <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium">
            {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0 flex-1">
                Producto
              </th>
              {mostrarCodigo && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Código
                </th>
              )}
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Categoría
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Tamaño
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Precio
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Stock
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productosFiltrados.map((producto, index) => (
              <tr key={producto.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <ImageWithFallback
                        src={producto.imagen}
                        alt={producto.nombre}
                        className="h-8 w-8 rounded object-cover"
                      />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900 line-clamp-1">
                        {producto.nombre}
                      </div>
                      {producto.descripcion && (
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {producto.descripcion}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                {mostrarCodigo && (
                  <td className="px-3 py-3">
                    <div className="text-xs text-gray-600 font-mono truncate">
                      {producto.codigoBarra}
                    </div>
                  </td>
                )}
                <td className="px-3 py-3">
                  <div className="text-xs text-gray-600 truncate">
                    {producto.categorias?.[0]?.nombre || '-'}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-xs text-gray-600">
                    {producto.size || 0} {producto.unidad}
                  </div>
                </td>
                <td className="px-3 py-3">
                  {producto.precios && producto.precios[0] ? (
                    <div className="text-sm font-medium text-green-600">
                      ${producto.precios[0].precio.toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">-</div>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center">
                    <span className={`text-sm font-medium ${
                      producto.size < 10 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {producto.size || 0}
                    </span>
                    {producto.size < 10 && (
                      <Icon icono="exclamation-triangle" className="text-red-600 ml-1 text-xs" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 w-36">
                  <div className="flex items-center justify-end space-x-1">
                    <BotonAgregarPedido
                      producto={producto}
                      variant="outline"
                      size="xs"
                      onSuccess={() => {
                        // Podríamos mostrar una notificación aquí
                      }}
                    />
                    <Link
                      href={`/cargarProductos?edit=${producto.id}`}
                      className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
                      title="Editar producto"
                    >
                      <Icon icono="editar" className="text-xs" />
                    </Link>
                    <button
                      onClick={() => handleEliminarProducto(producto)}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar producto"
                    >
                      <Icon icono="trash-can" className="text-xs" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Componente para vista de cuadrícula (el actual)
  const VistaCuadricula = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {productosFiltrados.map((producto) => (
        <div key={producto.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
          {/* Imagen del producto */}
          <div className="aspect-w-1 aspect-h-1 bg-gray-200 relative">
                  <ImageWithFallback
                    src={producto.imagen}
                    alt={producto.nombre}
                    className="w-full h-48 object-cover cursor-zoom-in"
                    onClick={() => {/* Implementar zoom de imagen */}}
                  />
          </div>

          {/* Contenido del producto */}
          <div className="p-4">
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {producto.nombre}
                </h3>
                <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded-full ml-2 flex-shrink-0">
                  {producto.codigoBarra}
                </span>
              </div>

              {producto.descripcion && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {producto.descripcion}
                </p>
              )}

              {/* Información técnica */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tamaño:</span>
                  <span className="font-medium">{producto.size || 0} {producto.unidad}</span>
                </div>

                {producto.precios && producto.precios[0] && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Precio:</span>
                    <span className="font-bold text-green-600">
                      ${producto.precios[0].precio.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Stock:</span>
                  <span className="flex items-center">
                    <span className={`font-medium ${producto.size < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                      {producto.size || 0}
                    </span>
                    {producto.size < 10 && (
                      <Icon icono="exclamation-triangle" className="text-red-600 ml-1 text-xs" />
                    )}
                  </span>
                </div>
              </div>

              {/* Categorías */}
              {producto.categorias && producto.categorias.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {producto.categorias.slice(0, 2).map((categoria) => (
                        <span
                          key={categoria.id}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {categoria.nombre}
                        </span>
                  ))}
                  {producto.categorias.length > 2 && (
                    <span className="text-xs text-gray-500">+{producto.categorias.length - 2}</span>
                  )}
                </div>
              )}

            </div>

            {/* Acciones */}
            <div className="flex space-x-2">
              <BotonAgregarPedido
                producto={producto}
                variant="outline"
                size="xs"
                onSuccess={() => {
                  // Podríamos mostrar una notificación aquí
                }}
              />

              <Link
                href={`/cargarProductos?edit=${producto.id}`}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                title="Editar producto"
              >
                <Icon icono="editar" className="text-sm" />
              </Link>

              <button
                onClick={() => handleEliminarProducto(producto)}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar producto"
              >
                <Icon icono="trash-can" className="text-sm" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando productos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${modoCompacto ? 'bg-gray-50 py-2' : 'min-h-screen bg-gray-50 py-4'}`}>
      <div className="container mx-auto max-w-7xl px-2">
        {/* Header */}
        <div className={`${modoCompacto ? 'mb-3' : 'mb-4'}`}>
          {!modoCompacto && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Icon icono="box" className="text-gray-600 mr-3 text-3xl" />
                  Catálogo de Productos
                </h1>
                <p className="text-gray-600 mt-2">
                  {productosFiltrados.length} de {productos.length} productos
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  href="/cargarProductos"
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center"
                >
                  <Icon icono="plus" className="mr-2" />
                  Nuevo Producto
                </Link>
                <Link
                  href="/"
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  ← Volver al Dashboard
                </Link>
              </div>
            </div>
          )}

          <div className={`flex ${modoCompacto ? 'justify-end' : 'items-center justify-between'}`}>
            {!modoCompacto && (
              <div className="text-sm text-gray-600">
                {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} encontrado{productosFiltrados.length !== 1 ? 's' : ''}
              </div>
            )}
            <div className="flex items-center space-x-3">
              {/* Toggle Vista */}
              <div className="bg-white border border-gray-300 rounded-lg p-1 flex">
                <button
                  onClick={() => setVistaTipo('lista')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    vistaTipo === 'lista'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon icono="list" className="mr-2 text-sm" />
                  Lista
                </button>
                <button
                  onClick={() => setVistaTipo('cuadricula')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    vistaTipo === 'cuadricula'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon icono="th" className="mr-2 text-sm" />
                  Cuadrícula
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar producto
              </label>
              <input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por categoría
              </label>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              >
                <option value="">Todas las categorías</option>
                {categoriasUnicas.map(categoria => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        {productosFiltrados.length > 0 ? (
          vistaTipo === 'cuadricula' ? <VistaCuadricula /> : <VistaLista />
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Icon icono="search" className="text-6xl mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-600 mb-6">
              No hay productos que coincidan con tu búsqueda.
            </p>
            <button
              onClick={() => {
                setFiltro('');
                setCategoriaFiltro('');
              }}
              className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              <Icon icono="times" className="mr-2" />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListadoProductosModerno;
