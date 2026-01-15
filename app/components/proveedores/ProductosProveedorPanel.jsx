"use client"
import { useState, useEffect } from 'react';
import { obtenerProductosPorProveedor, eliminarRelacionProductoProveedor } from '@/prisma/serverActions/proveedores';
import { useNotification } from '@/context/NotificationContext';
import Icon from '../formComponents/Icon';
import EditarCodigoForm from '../formComponents/EditarCodigoForm';

export default function ProductosProveedorPanel({ proveedor }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const { addNotification } = useNotification();

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const { productosRelacionados } = await obtenerProductosPorProveedor(proveedor.id);
      setProductos(productosRelacionados || []);
    } catch (error) {
      console.error('Error cargando productos del proveedor:', error);
      addNotification({
        type: 'error',
        message: 'Error al cargar los productos del proveedor',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proveedor?.id) {
      cargarProductos();
    }
  }, [proveedor?.id]);

  const handleEliminarRelacion = async (productoId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto del proveedor?')) {
      return;
    }

    try {
      await eliminarRelacionProductoProveedor(proveedor.id, productoId);
      addNotification({
        type: 'success',
        message: 'Producto eliminado del proveedor',
      });
      cargarProductos();
    } catch (error) {
      console.error('Error eliminando relación:', error);
      addNotification({
        type: 'error',
        message: 'Error al eliminar el producto del proveedor',
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Productos de {proveedor.nombre}
        </h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {productos.length} productos
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Icon icono="spinner" className="animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Cargando...</span>
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Icon icono="package" className="mx-auto mb-2 text-gray-300" size="large" />
          <p>No hay productos asociados a este proveedor</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {productos.map((relacion) => (
            <div key={relacion.productoId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{relacion.producto.nombre}</h3>
                {editingId === relacion.productoId ? (
                  <EditarCodigoForm
                    codigo={relacion.codigo || ''}
                    proveedorId={proveedor.id}
                    producto={{ id: relacion.productoId }}
                    after={() => {
                      cargarProductos();
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    Alias: {relacion.codigo || <span className="text-gray-400 italic">Sin alias</span>}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingId(relacion.productoId)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Editar alias"
                >
                  <Icon icono="edit" size="small" />
                </button>
                <button
                  onClick={() => handleEliminarRelacion(relacion.productoId)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Eliminar del proveedor"
                >
                  <Icon icono="trash" size="small" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}