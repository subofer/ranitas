"use client"
import { useState, useEffect } from 'react';
import { getDashboardMetrics } from '@/prisma/consultas/dashboard';
import Link from 'next/link';
import Icon from '@/components/formComponents/Icon';
import BotonAgregarPedido from '@/components/pedidos/BotonAgregarPedido';
import ProductListPlaceholder from '@/components/productos/ProductListPlaceholder';

export default function StockBajoPage() {
  const [productosStockBajo, setProductosStockBajo] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarProductosStockBajo = async () => {
    try {
      const data = await getDashboardMetrics();
      setProductosStockBajo(data.lowStockProducts || []);
    } catch (error) {
      console.error('Error cargando productos con stock bajo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductosStockBajo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto max-w-6xl px-4">
          <ProductListPlaceholder count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="container mx-auto max-w-6xl px-2">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Icon icono="exclamation-triangle" className="text-yellow-600 mr-3 text-2xl" />
                Productos con Stock Bajo
              </h1>
              <p className="text-gray-600 mt-2">
                {productosStockBajo.length} productos requieren reposición inmediata
              </p>
            </div>
            <Link
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Volver al Dashboard
            </Link>
          </div>
        </div>

        {/* Lista de productos */}
        {productosStockBajo.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
              <div className="flex items-center">
                <Icon icono="exclamation-triangle" className="text-yellow-600 mr-2" />
                <span className="text-yellow-800 font-medium">Productos que requieren atención inmediata</span>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {productosStockBajo.map((producto, index) => (
                <div key={producto.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Icon icono="box" className="text-yellow-600 text-lg" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {producto.nombre}
                            </h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Stock Bajo
                            </span>
                          </div>

                          <div className="mt-2 flex items-center space-x-6 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Icon icono="barcode" className="text-gray-400 mr-1 text-xs" />
                              <span>Código: {producto.codigoBarra}</span>
                            </div>

                            <div className="flex items-center">
                              <Icon icono="weight" className="text-gray-400 mr-1 text-xs" />
                              <span>{producto.size || 0} {producto.unidad}</span>
                            </div>

                            {producto.precios && producto.precios[0] && (
                              <div className="flex items-center">
                                <Icon icono="dollar-sign" className="text-gray-400 mr-1 text-xs" />
                                <span>${producto.precios[0].precio.toLocaleString()}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-2 flex items-center space-x-2">
                            {producto.categorias && producto.categorias.map((categoria) => (
                              <span
                                key={categoria.id}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {categoria.nombre}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          Nivel Crítico
                        </div>
                        <div className="text-xs text-gray-500">
                          Reponer urgentemente
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <BotonAgregarPedido
                          producto={producto}
                          variant="primary"
                          size="sm"
                          onSuccess={cargarProductosStockBajo}
                        />
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Icon icono="editar" className="text-sm" />
                        </button>
                        <Link
                          href={`/cargarProductos?edit=${producto.id}`}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Icon icono="plus" className="text-sm" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-green-500 mb-4">
              <Icon icono="check-circle" className="text-6xl mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Excelente! Todos los productos tienen stock adecuado
            </h3>
            <p className="text-gray-600 mb-6">
              No hay productos que requieran reposición inmediata.
            </p>
            <Link
              href="/cargarProductos"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Icon icono="plus" className="mr-2" />
              Agregar Nuevo Producto
            </Link>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Icon icono="info-circle" className="text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="text-blue-900 font-medium mb-2">¿Qué significa &ldquo;Stock Bajo&rdquo;?</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Productos con menos de 10 unidades disponibles</li>
                <li>• Productos sin precio definido (posiblemente discontinuados)</li>
                <li>• Artículos que requieren reposición inmediata para evitar faltantes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
