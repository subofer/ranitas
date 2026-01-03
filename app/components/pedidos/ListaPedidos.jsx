"use client"
import { useState } from 'react';
import { cambiarEstadoPedido, eliminarPedidoCompleto } from '@/prisma/serverActions/pedidos';
import { fechas } from '@/lib/manipularTextos';
import Icon from '../formComponents/Icon';
import ExportarPedido from './ExportarPedido';
import EditarPedido from './EditarPedido';

const ListaPedidos = ({ pedidos, onUpdate }) => {
  const [cargandoAccion, setCargandoAccion] = useState(null);
  const [pedidoAExportar, setPedidoAExportar] = useState(null);
  const [pedidoAEditar, setPedidoAEditar] = useState(null);

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

  const getEstadoIcono = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return 'clock';
      case 'ENVIADO': return 'paper-plane';
      case 'RECIBIDO': return 'check-circle';
      case 'CANCELADO': return 'times-circle';
      default: return 'question-circle';
    }
  };

  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
        <div className="text-gray-400 mb-4">
          <Icon icono="clipboard-list" className="text-6xl mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay pedidos</h3>
        <p className="text-gray-600 mb-6">Aún no se han creado pedidos de reposición.</p>
        <button className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
          <Icon icono="plus" className="mr-2" />
          Crear Primer Pedido
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon icono="clipboard-list" className="text-gray-600 text-lg mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Pedidos de Reposición</h2>
          </div>
          <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {pedidos.map((pedido) => (
          <div key={pedido.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                    pedido.estado === 'RECIBIDO' ? 'bg-gray-100' :
                    pedido.estado === 'ENVIADO' ? 'bg-gray-100' :
                    pedido.estado === 'CANCELADO' ? 'bg-gray-100' : 'bg-gray-100'
                  }`}>
                    <Icon
                      icono={getEstadoIcono(pedido.estado)}
                      className={`text-lg ${
                        pedido.estado === 'RECIBIDO' ? 'text-gray-600' :
                        pedido.estado === 'ENVIADO' ? 'text-gray-600' :
                        pedido.estado === 'CANCELADO' ? 'text-gray-600' : 'text-gray-600'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {pedido.numero}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(pedido.estado)}`}>
                        {pedido.estado}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center space-x-6 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Icon icono="building" className="text-gray-400 mr-1 text-xs" />
                        <span>{pedido.proveedor.nombre}</span>
                      </div>

                      <div className="flex items-center">
                        <Icon icono="calendar" className="text-gray-400 mr-1 text-xs" />
                        <span>{fechas.fecha(pedido.fecha)}</span>
                      </div>

                      <div className="flex items-center">
                        <Icon icono="box" className="text-gray-400 mr-1 text-xs" />
                        <span>{pedido.detallePedidos?.length || 0} productos</span>
                      </div>

                      <div className="flex items-center">
                        <Icon icono="user" className="text-gray-400 mr-1 text-xs" />
                        <span>{pedido.usuario.nombre}</span>
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
                      {pedido.detallePedidos?.slice(0, 3).map((detalle) => (
                        <div key={detalle.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          <span>{detalle.producto.nombre}</span>
                          <span className="font-medium">x{detalle.cantidad}</span>
                        </div>
                      ))}
                      {pedido.detallePedidos && pedido.detallePedidos.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{pedido.detallePedidos.length - 3} productos más...
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
                    onClick={() => setPedidoAExportar(pedido)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    title="Exportar pedido"
                  >
                    <Icon icono="download" className="text-sm" />
                  </button>

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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de exportar pedido */}
      {pedidoAExportar && (
        <ExportarPedido
          pedido={pedidoAExportar}
          onClose={() => setPedidoAExportar(null)}
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

export default ListaPedidos;
