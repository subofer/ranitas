"use client"
import { useState, useEffect } from 'react';
import { getPedidos } from '@/prisma/consultas/pedidos';
import { agregarProductoPedido, crearNuevoPedido } from '@/prisma/serverActions/pedidos';
import Icon from '../formComponents/Icon';
import FilterSelect from '../formComponents/FilterSelect';
import Input from '../formComponents/Input';
import { useErrorNotification } from '@/hooks/useErrorNotification';

const AgregarProductoPedido = ({ producto, onClose, onSuccess }) => {
  const { showError, showSuccess } = useErrorNotification();
  const [pedidos, setPedidos] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(false);
  const [showCrearNuevo, setShowCrearNuevo] = useState(false);
  const [modoCrearNuevo, setModoCrearNuevo] = useState('conProveedor'); // 'conProveedor' o 'sinProveedor'
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');

  const cargarPedidosPendientes = async () => {
    try {
      const pedidosData = await getPedidos();
      // Filtrar solo pedidos pendientes
      const pendientes = pedidosData.filter(p => p.estado === 'PENDIENTE');
      setPedidos(pendientes);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
    }
  };

  useEffect(() => {
    cargarPedidosPendientes();
  }, []);

  const handleAgregar = async () => {
    if (showCrearNuevo) {
      await handleCrearNuevoPedido();
    } else {
      await handleAgregarAExistente();
    }
  };

  const handleAgregarAExistente = async () => {
    if (!pedidoSeleccionado || cantidad <= 0) return;

    setCargando(true);
    try {
      const resultado = await agregarProductoPedido(pedidoSeleccionado, {
        id: producto.id,
        cantidad: parseFloat(cantidad),
        precioUnitario: producto.precios?.[0]?.precio,
        observaciones
      });

      if (resultado.success) {
        onSuccess && onSuccess();
        onClose && onClose();
        showSuccess('Producto agregado al pedido exitosamente', 3000);
      } else {
        showError('Error agregando producto: ' + (resultado.msg || 'Error'));
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error inesperado al agregar producto: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleCrearNuevoPedido = async () => {
    if (cantidad <= 0) return;

    setCargando(true);
    try {
      let idProveedor = null;

      if (modoCrearNuevo === 'conProveedor' && proveedorSeleccionado) {
        idProveedor = proveedorSeleccionado;
      }

      const resultado = await crearNuevoPedido({
        idProveedor,
        productos: [{
          id: producto.id,
          cantidad: parseFloat(cantidad),
          precioUnitario: producto.precios?.[0]?.precio,
          observaciones
        }],
        notas: idProveedor ? `Pedido creado desde catálogo` : `Pedido sin proveedor asignado - requiere revisión`
      });

      if (resultado.success) {
        onSuccess && onSuccess();
        onClose && onClose();
        showSuccess(
          idProveedor
            ? `Nuevo pedido creado al proveedor ${resultado.pedido?.proveedor?.nombre || 'desconocido'}`
            : 'Nuevo pedido creado sin proveedor asignado',
          3000
        );
      } else {
        showError('Error creando pedido: ' + (resultado.msg || 'Error'));
      }
    } catch (error) {
      console.error('Error creando pedido:', error);
      showError('Error creando pedido: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="bg-gray-100 p-2 rounded-lg mr-3">
              <Icon icono="plus" className="text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {showCrearNuevo ? 'Crear Nuevo Pedido' : 'Agregar a Pedido'}
              </h2>
              <p className="text-sm text-gray-600">{producto.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icono="times" className="text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Información del producto */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">
              <strong>Producto:</strong> {producto.nombre}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              <strong>Código:</strong> {producto.codigoBarra}
            </div>
            {producto.precios?.[0] && (
              <div className="text-sm text-gray-600 mt-1">
                <strong>Precio:</strong> ${producto.precios[0].precio.toLocaleString()}
              </div>
            )}
            {producto.proveedores?.length > 0 && (
              <div className="text-sm text-gray-600 mt-1">
                <strong>Proveedores:</strong> {producto.proveedores.length}
              </div>
            )}
          </div>

          {/* Alternar entre agregar a existente o crear nuevo */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowCrearNuevo(false)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                !showCrearNuevo
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Agregar a Pedido Existente
            </button>
            <button
              onClick={() => setShowCrearNuevo(true)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                showCrearNuevo
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Crear Nuevo Pedido
            </button>
          </div>

          {!showCrearNuevo ? (
            /* Seleccionar pedido existente */
            <FilterSelect
              label="Seleccionar Pedido"
              placeholder="Buscar pedido..."
              value={pedidoSeleccionado}
              onChange={(data) => setPedidoSeleccionado(data.value)}
              options={pedidos.map((pedido) => ({
                id: pedido.id,
                nombre: `${pedido.numero} - ${pedido.proveedor ? pedido.proveedor.nombre : 'Sin proveedor asignado'} (${pedido.detallePedidos?.length || 0} productos)`
              }))}
              valueField="id"
              textField="nombre"
            />
          ) : (
            /* Crear nuevo pedido */
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Crear Nuevo Pedido
              </label>

              {/* Opción de proveedor */}
              {producto.proveedores?.length > 0 ? (
                <div>
                  <div className="flex space-x-2 mb-2">
                    <button
                      onClick={() => setModoCrearNuevo('conProveedor')}
                      className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${
                        modoCrearNuevo === 'conProveedor'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Con Proveedor
                    </button>
                    <button
                      onClick={() => setModoCrearNuevo('sinProveedor')}
                      className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${
                        modoCrearNuevo === 'sinProveedor'
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Sin Proveedor
                    </button>
                  </div>

                  {modoCrearNuevo === 'conProveedor' && (
                    <FilterSelect
                      label="Seleccionar Proveedor"
                      placeholder="Buscar proveedor..."
                      value={proveedorSeleccionado}
                      onChange={(data) => setProveedorSeleccionado(data.value)}
                      options={producto.proveedores.map((provRel) => ({
                        id: provRel.proveedor.id,
                        nombre: provRel.proveedor.nombre
                      }))}
                      valueField="id"
                      textField="nombre"
                    />
                  )}

                  {modoCrearNuevo === 'sinProveedor' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-800">
                        ⚠️ Este pedido se creará sin proveedor asignado y necesitará ser revisado posteriormente para asignar un proveedor.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    ⚠️ Este producto no tiene proveedores asignados. El pedido se creará sin proveedor y necesitará revisión.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cantidad */}
          <Input
            type="number"
            min="1"
            step="0.1"
            label="Cantidad a Pedir"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notas adicionales sobre este producto..."
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={cargando}
            >
              Cancelar
            </button>
            <button
              onClick={handleAgregar}
              disabled={cargando || cantidad <= 0 || (!showCrearNuevo && !pedidoSeleccionado) || (showCrearNuevo && modoCrearNuevo === 'conProveedor' && !proveedorSeleccionado)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {cargando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {showCrearNuevo ? 'Creando...' : 'Agregando...'}
                </>
              ) : (
                <>
                  <Icon icono="plus" className="mr-2" />
                  {showCrearNuevo ? 'Crear Pedido' : 'Agregar al Pedido'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgregarProductoPedido;
