"use client"
import { useState } from 'react';
import { crearPedidosAutomaticos } from '@/prisma/serverActions/pedidos';
import Icon from '../formComponents/Icon';

const CrearPedidoAutomatico = ({ productosPorProveedor, onClose, onCrear }) => {
  const [cargando, setCargando] = useState(false);

  const handleCrear = async () => {
    setCargando(true);
    try {
      await onCrear();
      onClose();
    } catch (error) {
      console.error('Error creando pedidos automáticos:', error);
    } finally {
      setCargando(false);
    }
  };

  const totalProductos = productosPorProveedor.reduce((total, grupo) => total + grupo.productos.length, 0);
  const totalProveedores = productosPorProveedor.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="bg-gray-100 p-2 rounded-lg mr-3">
              <Icon icono="magic" className="text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Crear Pedidos Automáticos</h2>
              <p className="text-sm text-gray-600">Generar pedidos para productos con stock bajo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icono="times" className="text-lg" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start">
                <Icon icono="info-circle" className="text-gray-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-gray-900 font-medium mb-1">Resumen de pedidos a crear</h4>
                  <div className="text-gray-800 text-sm space-y-1">
                    <p>• <strong>{totalProductos}</strong> productos necesitan reposición</p>
                    <p>• <strong>{totalProveedores}</strong> proveedores recibirán pedidos</p>
                    <p>• Cada producto se pedirá con cantidad sugerida automáticamente</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de productos por proveedor */}
          <div className="space-y-4 mb-6">
            <h4 className="font-medium text-gray-900">Productos agrupados por proveedor:</h4>

            {productosPorProveedor.map((grupo, index) => (
              <div key={grupo.proveedor.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-gray-600">{index + 1}</span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">{grupo.proveedor.nombre}</h5>
                      <p className="text-sm text-gray-600">{grupo.productos.length} productos</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {grupo.productos.slice(0, 3).map((producto) => (
                    <div key={producto.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                      <span className="text-gray-900">{producto.nombre}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Stock: {producto.size || 0}</span>
                        <span className="text-gray-600 font-medium">→ Pedir: {producto.cantidadSugerida}</span>
                      </div>
                    </div>
                  ))}
                  {grupo.productos.length > 3 && (
                    <div className="text-center text-sm text-gray-500 py-1">
                      +{grupo.productos.length - 3} productos más...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={cargando}
            >
              Cancelar
            </button>
            <button
              onClick={handleCrear}
              disabled={cargando || totalProductos === 0}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {cargando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando pedidos...
                </>
              ) : (
                <>
                  <Icon icono="magic" className="mr-2" />
                  Crear {totalProveedores} pedido{totalProveedores !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrearPedidoAutomatico;
