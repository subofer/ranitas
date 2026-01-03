"use client"
import { useState } from 'react';
import { cambiarEstadoPedido, eliminarPedidoCompleto } from '@/prisma/serverActions/pedidos';
import { fechas } from '@/lib/manipularTextos';
import Icon from '../formComponents/Icon';
import ProductosPorProveedor from '../proveedores/ProductosPorProveedor';
import EditarPedido from './EditarPedido';

const PedidosPorProveedor = ({ pedidos, onUpdate }) => {
  const [cargandoAccion, setCargandoAccion] = useState(null);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [pedidoAEditar, setPedidoAEditar] = useState(null);

  // Agrupar pedidos por proveedor
  const pedidosPorProveedor = pedidos.reduce((acc, pedido) => {
    const proveedorId = pedido.proveedor.id;
    if (!acc[proveedorId]) {
      acc[proveedorId] = {
        proveedor: pedido.proveedor,
        pedidos: []
      };
    }
    acc[proveedorId].pedidos.push(pedido);
    return acc;
  }, {});

  const handleCambiarEstado = async (idPedido, nuevoEstado) => {
    setCargandoAccion(idPedido);
    try {
      const resultado = await cambiarEstadoPedido(idPedido, nuevoEstado);
      if (resultado.success) {
        onUpdate && onUpdate();
      } else {
        alert('Error cambiando estado: ' + resultado.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error inesperado');
    } finally {
      setCargandoAccion(null);
    }
  };

  const handleEliminar = async (idPedido) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este pedido?')) return;

    setCargandoAccion(idPedido);
    try {
      const resultado = await eliminarPedidoCompleto(idPedido);
      if (resultado.success) {
        onUpdate && onUpdate();
      } else {
        alert('Error eliminando pedido: ' + resultado.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error inesperado');
    } finally {
      setCargandoAccion(null);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'ENVIADO': return 'bg-blue-100 text-blue-800';
      case 'RECIBIDO': return 'bg-green-100 text-green-800';
      case 'CANCELADO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <Icon icono="clipboard-list" className="text-6xl mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No hay pedidos
        </h3>
        <p className="text-gray-600 mb-6">Aún no se han creado pedidos de reposición.</p>
        <button className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
          <Icon icono="plus" className="mr-2" />
          Crear Primer Pedido
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.values(pedidosPorProveedor).map(({ proveedor, pedidos: pedidosProveedor }) => (
        <div key={proveedor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header del proveedor */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                  <Icon icono="building" className="text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{proveedor.nombre}</h3>
                  <p className="text-sm text-gray-600">
                    {pedidosProveedor.length} pedido{pedidosProveedor.length !== 1 ? 's' : ''} •
                    ${pedidosProveedor.reduce((total, p) => total + (p.total || 0), 0).toLocaleString()} total
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setProveedorSeleccionado(proveedor.id)}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors flex items-center"
                >
                  <Icon icono="eye" className="mr-1 text-xs" />
                  Ver Productos
                </button>
                <span className="text-xs text-gray-500">
                  {pedidosProveedor.filter(p => p.estado === 'PENDIENTE').length} pendiente{pedidosProveedor.filter(p => p.estado === 'PENDIENTE').length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Lista de pedidos del proveedor */}
          <div className="divide-y divide-gray-200">
            {pedidosProveedor.map((pedido) => (
              <div key={pedido.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                        pedido.estado === 'RECIBIDO' ? 'bg-green-100' :
                        pedido.estado === 'ENVIADO' ? 'bg-gray-100' :
                        pedido.estado === 'CANCELADO' ? 'bg-gray-100' : 'bg-gray-100'
                      }`}>
                        <Icon
                          icono={
                            pedido.estado === 'RECIBIDO' ? 'check-circle' :
                            pedido.estado === 'ENVIADO' ? 'paper-plane' :
                            pedido.estado === 'CANCELADO' ? 'times-circle' : 'clock'
                          }
                          className={`text-lg ${
                            pedido.estado === 'RECIBIDO' ? 'text-green-600' :
                            pedido.estado === 'ENVIADO' ? 'text-blue-600' :
                            pedido.estado === 'CANCELADO' ? 'text-gray-600' : 'text-gray-600'
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-semibold text-gray-900 truncate">
                            {pedido.numero}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(pedido.estado)}`}>
                            {pedido.estado}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Icon icono="calendar" className="text-gray-400 mr-1 text-xs" />
                            <span>{fechas.fecha(pedido.fecha)}</span>
                          </div>

                          <div className="flex items-center">
                            <Icon icono="box" className="text-gray-400 mr-1 text-xs" />
                            <span>{pedido.detallePedidos?.length || 0} productos</span>
                          </div>

                          <div className="flex items-center">
                            <Icon icono="dollar-sign" className="text-gray-400 mr-1 text-xs" />
                            <span>${pedido.total?.toLocaleString() || '0'}</span>
                          </div>
                        </div>

                        {pedido.notas && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <Icon icono="comment" className="text-gray-400 mr-1 text-xs inline" />
                            {pedido.notas}
                          </div>
                        )}

                        {/* Lista de productos en el pedido */}
                        <div className="mt-3 space-y-1">
                          {pedido.detallePedidos?.slice(0, 2).map((detalle) => (
                            <div key={detalle.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                              <span>{detalle.producto.nombre}</span>
                              <span className="font-medium">x{detalle.cantidad}</span>
                            </div>
                          ))}
                          {pedido.detallePedidos && pedido.detallePedidos.length > 2 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{pedido.detallePedidos.length - 2} productos más...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Botones de cambio de estado */}
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setPedidoAEditar(pedido)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Editar pedido"
                      >
                        <Icon icono="edit" className="text-sm" />
                      </button>

                      {pedido.estado === 'PENDIENTE' && (
                        <button
                          onClick={() => handleCambiarEstado(pedido.id, 'ENVIADO')}
                          disabled={cargandoAccion === pedido.id}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Marcar como enviado"
                        >
                          <Icon icono="paper-plane" className="text-sm" />
                        </button>
                      )}

                      {pedido.estado === 'ENVIADO' && (
                        <button
                          onClick={() => handleCambiarEstado(pedido.id, 'RECIBIDO')}
                          disabled={cargandoAccion === pedido.id}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Marcar como recibido"
                        >
                          <Icon icono="check-circle" className="text-sm" />
                        </button>
                      )}

                      <button
                        onClick={() => handleEliminar(pedido.id)}
                        disabled={cargandoAccion === pedido.id}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Eliminar pedido"
                      >
                        <Icon icono="trash-can" className="text-sm" />
                      </button>
                    </div>

                    {/* Loading indicator */}
                    {cargandoAccion === pedido.id && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal de productos por proveedor */}
      {proveedorSeleccionado && (
        <ProductosPorProveedor
          idProveedor={proveedorSeleccionado}
          onClose={() => setProveedorSeleccionado(null)}
        />
      )}

      {/* Modal de editar pedido */}
      {pedidoAEditar && (
        <EditarPedido
          pedido={pedidoAEditar}
          onClose={() => setPedidoAEditar(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

export default PedidosPorProveedor;
