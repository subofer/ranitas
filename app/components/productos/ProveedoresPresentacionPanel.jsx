"use client"
import { useState, useEffect, useCallback } from 'react';
import { obtenerProveedoresPorPresentacion, agregarProveedorAPresentacion, eliminarProveedorDePresentacion } from '@/prisma/serverActions/proveedores';
import { getProveedoresSelect } from '@/prisma/consultas/proveedores';
import { useNotification } from '@/context/NotificationContext';
import Icon from '../formComponents/Icon';
import FilterSelect from '../formComponents/FilterSelect';
import Button from '../formComponents/Button';

export default function ProveedoresPresentacionPanel({ presentaciones }) {
  const [proveedoresPorPresentacion, setProveedoresPorPresentacion] = useState({});
  const [loading, setLoading] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [presentacionAgregando, setPresentacionAgregando] = useState(null);
  const [nuevoProveedor, setNuevoProveedor] = useState({
    proveedorId: '',
    sku: '',
    nombreEnProveedor: '',
  });
  const { addNotification } = useNotification();

  const cargarProveedores = async () => {
    try {
      const provs = await getProveedoresSelect();
      setProveedores(provs);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
    }
  };

  const cargarProveedoresPorPresentacion = useCallback(async () => {
    const nuevosProveedores = {};
    for (const presentacion of presentaciones) {
      try {
        const provs = await obtenerProveedoresPorPresentacion(presentacion.id);
        nuevosProveedores[presentacion.id] = provs;
      } catch (error) {
        console.error('Error cargando proveedores para presentación:', presentacion.id, error);
      }
    }
    setProveedoresPorPresentacion(nuevosProveedores);
  }, [presentaciones]);

  useEffect(() => {
    cargarProveedores();
  }, []);

  useEffect(() => {
    if (presentaciones.length > 0) {
      cargarProveedoresPorPresentacion();
    }
  }, [cargarProveedoresPorPresentacion, presentaciones.length]);

  const handleAgregarProveedor = async (presentacionId) => {
    if (!presentacionId || !nuevoProveedor.proveedorId) return;

    try {
      setLoading(true);
      await agregarProveedorAPresentacion(
        nuevoProveedor.proveedorId,
        presentacionId,
        nuevoProveedor.sku,
        nuevoProveedor.nombreEnProveedor
      );
      addNotification({
        type: 'success',
        message: 'Proveedor asignado a la presentación',
      });
      setNuevoProveedor({
        proveedorId: '',
        sku: '',
        nombreEnProveedor: '',
      });
      setPresentacionAgregando(null);
      cargarProveedoresPorPresentacion();
    } catch (error) {
      console.error('Error agregando proveedor:', error);
      addNotification({
        type: 'error',
        message: 'Error al asignar el proveedor',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarProveedor = async (proveedorId, presentacionId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este proveedor de la presentación?')) {
      return;
    }

    try {
      await eliminarProveedorDePresentacion(proveedorId, presentacionId);
      addNotification({
        type: 'success',
        message: 'Proveedor eliminado de la presentación',
      });
      cargarProveedoresPorPresentacion();
    } catch (error) {
      console.error('Error eliminando proveedor:', error);
      addNotification({
        type: 'error',
        message: 'Error al eliminar el proveedor',
      });
    }
  };

  const opcionesProveedores = proveedores.map(p => ({
    id: p.id,
    nombre: p.nombre,
  }));

  const handleToggleAgregar = (presentacionId) => {
    if (presentacionAgregando === presentacionId) {
      setPresentacionAgregando(null);
      setNuevoProveedor({
        proveedorId: '',
        sku: '',
        nombreEnProveedor: '',
      });
    } else {
      setPresentacionAgregando(presentacionId);
      setNuevoProveedor({
        proveedorId: '',
        sku: '',
        nombreEnProveedor: '',
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mt-8">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center">
          <Icon icono="truck" className="text-gray-600 text-lg mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Proveedores por Presentación</h2>
        </div>
      </div>

      <div className="p-6">
        {presentaciones.map((presentacion) => {
          const provs = proveedoresPorPresentacion[presentacion.id] || [];
          const estaAgregando = presentacionAgregando === presentacion.id;

          return (
            <div key={presentacion.id} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">{presentacion.nombre}</h3>
                <button
                  onClick={() => handleToggleAgregar(presentacion.id)}
                  className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  title="Agregar proveedor"
                >
                  <Icon icono="plus" className="mr-1" />
                  Agregar Proveedor
                </button>
              </div>

              {estaAgregando && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                    <FilterSelect
                      value={nuevoProveedor.proveedorId}
                      onChange={({ value }) => setNuevoProveedor(prev => ({ ...prev, proveedorId: value }))}
                      options={opcionesProveedores}
                      valueField="id"
                      textField="nombre"
                      placeholder="Seleccionar proveedor"
                      compact={true}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU/Alias</label>
                    <input
                      type="text"
                      value={nuevoProveedor.sku}
                      onChange={(e) => setNuevoProveedor(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="SKU del proveedor"
                      className="w-full px-2 py-1 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-0 focus:border-slate-400"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      tipo="enviar"
                      onClick={() => handleAgregarProveedor(presentacion.id)}
                      disabled={loading || !nuevoProveedor.proveedorId}
                      className="py-1 h-[32px] w-full mr-2"
                    >
                      <Icon icono="plus" className="mr-2" />Asignar
                    </Button>
                    <Button
                      tipo="cancelar"
                      onClick={() => handleToggleAgregar(presentacion.id)}
                      className="py-1 h-[32px]"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {provs.length === 0 ? (
                <p className="text-gray-500 italic">No hay proveedores asignados</p>
              ) : (
                <div className="space-y-2">
                  {provs.map((rel) => (
                    <div key={rel.proveedorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{rel.proveedor.nombre}</p>
                        <p className="text-sm text-gray-600">
                          SKU: {rel.sku || <span className="text-gray-400 italic">Sin SKU</span>}
                          {rel.nombreEnProveedor && ` | Nombre: ${rel.nombreEnProveedor}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEliminarProveedor(rel.proveedorId, presentacion.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar proveedor"
                      >
                        <Icon icono="eliminar" className="text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}