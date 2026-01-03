"use client"
import { useState, useEffect } from 'react';
import { agregarProductoPedido } from '@/prisma/serverActions/pedidos';
import { getProductos } from '@/prisma/consultas/productos';
import Icon from '../formComponents/Icon';
import Select from '../formComponents/Select';
import FilterSelect from '../formComponents/FilterSelect';
import Input from '../formComponents/Input';
import { useErrorNotification } from '@/hooks/useErrorNotification';

const EditarPedido = ({ pedido, onClose, onUpdate }) => {
  const { showError } = useErrorNotification();
  const [productosActuales, setProductosActuales] = useState([]);
  const [showAgregarProducto, setShowAgregarProducto] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    // Inicializar productos actuales del pedido
    setProductosActuales(pedido.detallePedidos || []);
  }, [pedido]);

  const handleAgregarProducto = async (nuevoProducto) => {
    setCargando(true);
    try {
      const resultado = await agregarProductoPedido(pedido.id, {
        id: nuevoProducto.id,
        cantidad: nuevoProducto.cantidad || 1,
        precioUnitario: nuevoProducto.precioUnitario,
        observaciones: nuevoProducto.observaciones || ''
      });

      if (resultado.success) {
        // Actualizar la lista de productos
        setProductosActuales(prev => [...prev, resultado.detalle]);
        onUpdate && onUpdate();
        showError('Producto agregado exitosamente', 3000);
      } else {
        showError('Error agregando producto: ' + resultado.error);
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error inesperado al agregar producto: ' + error.message);
    } finally {
      setCargando(false);
      setShowAgregarProducto(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="bg-gray-100 p-2 rounded-lg mr-3">
              <Icon icono="edit" className="text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Editar Pedido</h2>
              <p className="text-sm text-gray-600">{pedido.numero}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icono="times" className="text-lg" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-130px)]">
          {/* Información del pedido */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Proveedor:</span>
                <p className="text-gray-900">{pedido.proveedor?.nombre || 'Sin asignar'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Estado:</span>
                <p className="text-gray-900">{pedido.estado}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Fecha:</span>
                <p className="text-gray-900">{new Date(pedido.fecha).toLocaleDateString()}</p>
              </div>
            </div>
            {pedido.notas && (
              <div className="mt-3">
                <span className="font-medium text-gray-600">Notas:</span>
                <p className="text-gray-900 mt-1">{pedido.notas}</p>
              </div>
            )}
          </div>

          {/* Productos actuales */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Productos en el Pedido</h3>
              <button
                onClick={() => setShowAgregarProducto(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center text-sm"
                disabled={pedido.estado !== 'PENDIENTE'}
              >
                <Icon icono="plus" className="mr-2 text-sm" />
                Agregar Producto
              </button>
            </div>

            {productosActuales.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Icon icono="box" className="text-4xl mx-auto mb-2 text-gray-300" />
                <p>No hay productos en este pedido</p>
              </div>
            ) : (
              <div className="space-y-2">
                {productosActuales.map((detalle) => (
                  <div key={detalle.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                        <Icon icono="box" className="text-gray-600 text-sm" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{detalle.producto.nombre}</h4>
                        <p className="text-sm text-gray-600">Código: {detalle.producto.codigoBarra}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">x{detalle.cantidad}</p>
                        {detalle.precioUnitario && (
                          <p className="text-sm text-gray-600">
                            ${detalle.precioUnitario.toLocaleString()}
                          </p>
                        )}
                      </div>
                      {detalle.observaciones && (
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {detalle.observaciones}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal para agregar producto */}
      {showAgregarProducto && (
        <AgregarProductoAPedido
          pedido={pedido}
          productosActuales={productosActuales}
          onAgregar={handleAgregarProducto}
          onClose={() => setShowAgregarProducto(false)}
          cargando={cargando}
        />
      )}
    </div>
  );
};

// Componente auxiliar para agregar producto a pedido existente
const AgregarProductoAPedido = ({ pedido, productosActuales, onAgregar, onClose, cargando }) => {
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState('');
  const [cargandoProductos, setCargandoProductos] = useState(true);

  useEffect(() => {
    const cargarProductosDisponibles = async () => {
      try {
        setCargandoProductos(true);
        const todosLosProductos = await getProductos();

        // Filtrar productos según el proveedor del pedido
        let productosFiltrados = todosLosProductos;

        if (pedido.proveedor) {
          // Si el pedido tiene proveedor, mostrar solo productos de ese proveedor
          productosFiltrados = todosLosProductos.filter(producto =>
            producto.proveedores?.some(provRel => provRel.proveedor.id === pedido.proveedor.id)
          );
        }
        // Si no tiene proveedor, mostrar todos los productos

        // Excluir productos que ya están en el pedido
        const productosNoEnPedido = productosFiltrados.filter(producto =>
          !productosActuales.some(pa => pa.producto.id === producto.id)
        );

        setProductosDisponibles(productosNoEnPedido);
      } catch (error) {
        console.error('Error cargando productos disponibles:', error);
        setProductosDisponibles([]);
      } finally {
        setCargandoProductos(false);
      }
    };

    cargarProductosDisponibles();
  }, [pedido.proveedor, productosActuales]);

  const handleSubmit = () => {
    const producto = productosDisponibles.find(p => p.id === productoSeleccionado);
    if (producto) {
      onAgregar({
        idProducto: producto.id,
        cantidad: parseFloat(cantidad),
        precioUnitario: producto.precios?.[0]?.precio || 0,
        observaciones
      });
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
              <h2 className="text-lg font-semibold text-gray-900">Agregar Producto</h2>
              <p className="text-sm text-gray-600">al pedido {pedido.numero}</p>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Producto
            </label>
            <FilterSelect
              label="Seleccionar Producto"
              placeholder="Buscar producto..."
              value={productoSeleccionado}
              onChange={(data) => setProductoSeleccionado(data.value)}
              busy={cargandoProductos}
              options={productosDisponibles.map((producto) => ({
                id: producto.id,
                nombre: `${producto.nombre} (${producto.codigoBarra})`
              }))}
              valueField="id"
              textField="nombre"
            />
          </div>

          <Input
            type="number"
            min="1"
            step="0.1"
            label="Cantidad"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            loading={false}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 bg-white resize-vertical"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={cargando || cargandoProductos || !productoSeleccionado || cantidad <= 0}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {cargando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Agregando...
              </>
            ) : (
              <>
                <Icon icono="plus" className="mr-2" />
                Agregar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditarPedido;
