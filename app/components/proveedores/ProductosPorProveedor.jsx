"use client"
import { useState, useEffect, useCallback } from 'react';
import { getProductosPorProveedor } from '@/prisma/consultas/proveedores';
import Icon from '../formComponents/Icon';
import ImageWithFallback from '../ui/ImageWithFallback';
import ProductGridPlaceholder from '../productos/ProductGridPlaceholder';

const ProductosPorProveedor = ({ idProveedor, onClose }) => {
  const [productos, setProductos] = useState([]);
  const [proveedor, setProveedor] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarProductos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProductosPorProveedor(idProveedor);
      setProductos(data.productos || []);
      setProveedor(data.proveedor);
    } catch (error) {
      console.error('Error cargando productos del proveedor:', error);
    } finally {
      setLoading(false);
    }
  }, [idProveedor]);

  useEffect(() => {
    if (idProveedor) {
      cargarProductos();
    }
  }, [idProveedor, cargarProductos]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[80vh] overflow-y-auto p-6">
          <ProductGridPlaceholder count={12} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <Icon icono="building" className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Productos de {proveedor?.nombre}
              </h2>
              <p className="text-sm text-gray-600">
                {productos.length} productos disponibles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icono="times" className="text-lg" />
          </button>
        </div>

        {/* Contenido */}
        <div className="max-h-[70vh] overflow-y-auto">
          {productos.length > 0 ? (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productos.map((producto) => (
                  <div key={producto.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {/* Imagen del producto */}
                    <div className="aspect-w-1 aspect-h-1 bg-white rounded-lg mb-3 overflow-hidden">
                      <ImageWithFallback
                        src={producto.imagen}
                        alt={producto.nombre}
                        className="w-full h-24 object-cover"
                      />
                    </div>

                    {/* Información del producto */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {producto.nombre}
                      </h3>

                      {producto.descripcion && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {producto.descripcion}
                        </p>
                      )}

                      {/* Precio del proveedor */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Precio:</span>
                        {producto.precios && producto.precios[0] ? (
                          <span className="text-sm font-bold text-green-600">
                            ${producto.precios[0].precio.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Sin precio</span>
                        )}
                      </div>

                      {/* Stock disponible */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Stock:</span>
                        <span className={`text-xs font-medium ${
                          producto.size < 10 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {producto.size || 0} unidades
                        </span>
                      </div>

                      {/* Categorías */}
                      {producto.categorias && producto.categorias.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {producto.categorias.slice(0, 2).map((categoria) => (
                            <span
                              key={categoria.id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {categoria.nombre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Icon icono="box" className="text-6xl mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay productos
              </h3>
              <p className="text-gray-600">
                Este proveedor aún no tiene productos asignados.
              </p>
            </div>
          )}
        </div>

        {/* Footer con información del proveedor */}
        {proveedor && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Icon icono="phone" className="text-gray-400 mr-1" />
                  <span className="text-gray-600">{proveedor.telefono || 'Sin teléfono'}</span>
                </div>
                {proveedor.email && (
                  <div className="flex items-center">
                    <Icon icono="envelope" className="text-gray-400 mr-1" />
                    <span className="text-gray-600">{proveedor.email}</span>
                  </div>
                )}
              </div>
              <div className="text-gray-500">
                CUIT: {proveedor.cuit}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductosPorProveedor;
