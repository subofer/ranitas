"use client"
import { useState, useEffect } from 'react';
import { getAllProductosBasic } from '@/prisma/consultas/productos';
import { agregarProductoAProveedor } from '@/prisma/serverActions/proveedores';
import { useNotification } from '@/context/NotificationContext';
import Icon from '../formComponents/Icon';

export default function TodosProductosPanel({ proveedor }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { addNotification } = useNotification();

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const productosData = await getAllProductosBasic();
      setProductos(productosData || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
      addNotification({
        type: 'error',
        message: 'Error al cargar los productos',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleAgregarProducto = async (productoId) => {
    try {
      await agregarProductoAProveedor(proveedor.id, productoId);
      addNotification({
        type: 'success',
        message: 'Producto agregado al proveedor',
      });
      // Aquí podríamos recargar la lista del panel izquierdo, pero por ahora solo mostramos la notificación
    } catch (error) {
      console.error('Error agregando producto:', error);
      addNotification({
        type: 'error',
        message: 'Error al agregar el producto al proveedor',
      });
    }
  };

  const filteredProductos = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Todos los Productos
        </h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {filteredProductos.length} productos
        </span>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Icon icono="spinner" className="animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Cargando productos...</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredProductos.map((producto) => (
            <div key={producto.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{producto.nombre}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {producto.presentaciones.map((presentacion) => (
                    <span
                      key={presentacion.id}
                      className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                    >
                      {presentacion.tipoPresentacion.nombre}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleAgregarProducto(producto.id)}
                className="ml-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center"
                title="Agregar al proveedor"
              >
                <Icon icono="plus" size="small" className="mr-1" />
                Agregar
              </button>
            </div>
          ))}
          {filteredProductos.length === 0 && searchTerm && (
            <div className="text-center py-8 text-gray-500">
              <Icon icono="search" className="mx-auto mb-2 text-gray-300" size="large" />
              <p>No se encontraron productos con &quot;{searchTerm}&quot;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}