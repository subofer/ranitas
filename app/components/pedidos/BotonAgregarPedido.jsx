"use client"
import { useState } from 'react';
import { crearNuevoPedido } from '@/prisma/serverActions/pedidos';
import Icon from '../formComponents/Icon';
import AgregarProductoPedido from './AgregarProductoPedido';

const BotonAgregarPedido = ({
  producto,
  variant = 'default',
  size = 'sm',
  className = '',
  onSuccess,
  yaPedido = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    // Si el producto ya está pedido, no hacer nada
    if (yaPedido) return;

    setLoading(true);

    try {
      const proveedores = producto.proveedores || [];

      if (proveedores.length === 1) {
        // Un solo proveedor - crear pedido automáticamente
        await crearPedidoAutomatico(proveedores[0].proveedor.id);
      } else {
        // Múltiples proveedores o ninguno - mostrar modal
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error procesando pedido:', error);
      alert('Error al procesar el pedido');
    } finally {
      setLoading(false);
    }
  };

  const crearPedidoAutomatico = async (idProveedor) => {
    try {
      const resultado = await crearNuevoPedido({
        idProveedor,
        productos: [{
          id: producto.id,
          cantidad: 1,
          precioUnitario: producto.precios?.[0]?.precio,
          observaciones: 'Pedido automático desde catálogo'
        }],
        idUsuario: 'default-user',
        notas: `Pedido automático para ${producto.nombre}`
      });

      if (resultado.success) {
        alert(`Pedido creado automáticamente al proveedor ${resultado.pedido.proveedor.nombre}`);
        onSuccess && onSuccess();
      } else {
        throw new Error(resultado.error);
      }
    } catch (error) {
      console.error('Error creando pedido automático:', error);
      alert('Error creando pedido automático: ' + error.message);
    }
  };

  const handleSuccess = () => {
    onSuccess && onSuccess();
    setShowModal(false);
  };

  const buttonClasses = {
    default: yaPedido ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50',
    primary: yaPedido ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-600 text-white hover:bg-gray-700',
    outline: yaPedido ? 'border border-gray-600 text-gray-600 hover:bg-gray-50' : 'border border-gray-600 text-gray-600 hover:bg-gray-50',
    ghost: yaPedido ? 'text-gray-600 hover:bg-gray-50' : 'text-gray-600 hover:bg-gray-50'
  };

  const sizeClasses = {
    xs: 'p-1 text-xs',
    sm: 'p-2 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-2 text-lg'
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading || yaPedido}
        className={`${buttonClasses[variant]} ${sizeClasses[size]} rounded-lg transition-colors flex items-center ${className} ${
          (loading || yaPedido) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title={yaPedido ? "Ya está pedido" : "Agregar a pedido de reposición"}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>
        ) : (
          <Icon icono={yaPedido ? "check-circle" : "clipboard-list"} className={`${size === 'xs' ? 'text-xs' : 'text-sm'} ${variant === 'primary' ? 'mr-1' : ''}`} />
        )}
        {variant === 'primary' && <span className="ml-1">
          {loading ? 'Creando...' : yaPedido ? 'Pedido' : 'Pedir'}
        </span>}
      </button>

      {showModal && (
        <AgregarProductoPedido
          producto={producto}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};

export default BotonAgregarPedido;
