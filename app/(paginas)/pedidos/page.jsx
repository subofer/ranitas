"use client"
import { useState, useEffect } from 'react';
import { getPedidos, getProductosAgrupadosPorProveedor } from '@/prisma/consultas/pedidos';
import { crearPedidosAutomaticos } from '@/prisma/serverActions/pedidos';
import Link from 'next/link';
import Icon from '@/components/formComponents/Icon';
import ListaPedidos from '@/components/pedidos/ListaPedidos';
import PedidosPorProveedor from '@/components/pedidos/PedidosPorProveedor';
import CrearPedidoAutomatico from '@/components/pedidos/CrearPedidoAutomatico';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [productosPorProveedor, setProductosPorProveedor] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCrearAutomatico, setShowCrearAutomatico] = useState(false);
  const [vistaAgrupada, setVistaAgrupada] = useState(true); // true = por proveedor, false = lista normal

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [pedidosData, productosData] = await Promise.all([
        getPedidos(),
        getProductosAgrupadosPorProveedor()
      ]);

      setPedidos(pedidosData || []);
      setProductosPorProveedor(productosData || []);
    } catch (error) {
      console.error('Error cargando datos de pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearPedidosAutomaticos = async () => {
    try {
      // Aquí necesitaríamos obtener el ID del usuario actual
      // Por ahora usamos un ID dummy
      const resultado = await crearPedidosAutomaticos('default-user');

      if (resultado.success) {
        alert(`Se crearon ${resultado.pedidos.length} pedidos automáticamente`);
        cargarDatos();
      } else {
        alert('Error creando pedidos automáticos: ' + resultado.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error inesperado al crear pedidos automáticos');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando pedidos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="container mx-auto max-w-7xl px-2">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Icon icono="clipboard-list" className="text-gray-600 mr-3 text-3xl" />
                Gestión de Pedidos
              </h1>
              <p className="text-gray-600 mt-2">
                Administra pedidos de reposición a proveedores
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Toggle Vista */}
              <div className="bg-white border border-gray-300 rounded-lg p-1 flex">
                <button
                  onClick={() => setVistaAgrupada(true)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    vistaAgrupada
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon icono="building" className="mr-2 text-sm" />
                  Por Proveedor
                </button>
                <button
                  onClick={() => setVistaAgrupada(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    !vistaAgrupada
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon icono="list" className="mr-2 text-sm" />
                  Lista Completa
                </button>
              </div>

              <button
                onClick={() => setShowCrearAutomatico(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <Icon icono="magic" className="mr-2" />
                Crear Automáticos
              </button>
              <Link
                href="/"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Volver al Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">{pedidos.length}</p>
              </div>
              <Icon icono="clipboard-list" className="text-gray-600 text-2xl" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pedidos.filter(p => p.estado === 'PENDIENTE').length}
                </p>
              </div>
              <Icon icono="clock" className="text-gray-600 text-2xl" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Enviados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pedidos.filter(p => p.estado === 'ENVIADO').length}
                </p>
              </div>
              <Icon icono="paper-plane" className="text-gray-600 text-2xl" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Productos a Pedir</p>
                <p className="text-2xl font-bold text-gray-900">
                  {productosPorProveedor.reduce((total, grupo) => total + grupo.productos.length, 0)}
                </p>
              </div>
              <Icon icono="exclamation-triangle" className="text-gray-600 text-2xl" />
            </div>
          </div>
        </div>

        {/* Lista de pedidos */}
        {vistaAgrupada ? (
          <PedidosPorProveedor pedidos={pedidos} onUpdate={cargarDatos} />
        ) : (
          <ListaPedidos pedidos={pedidos} onUpdate={cargarDatos} />
        )}

        {/* Modal para crear pedidos automáticos */}
        {showCrearAutomatico && (
          <CrearPedidoAutomatico
            productosPorProveedor={productosPorProveedor}
            onClose={() => setShowCrearAutomatico(false)}
            onCrear={handleCrearPedidosAutomaticos}
          />
        )}
      </div>
    </div>
  );
}
