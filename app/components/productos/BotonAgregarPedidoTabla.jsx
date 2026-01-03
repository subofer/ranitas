"use client"
import BotonAgregarPedido from '../pedidos/BotonAgregarPedido';

const BotonAgregarPedidoTabla = ({ item, ...props }) => {
  return (
    <div className="flex justify-center">
      <BotonAgregarPedido
        producto={item}
        variant="outline"
        size="xs"
        onSuccess={() => {
          // Aquí podríamos mostrar una notificación de éxito
          console.log('Producto agregado al pedido exitosamente');
        }}
      />
    </div>
  );
};

export default BotonAgregarPedidoTabla;
