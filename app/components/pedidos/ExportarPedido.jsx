"use client"
import { useState } from 'react';
import { copiarAlPortapapeles } from '@/lib/copyToClipBoard';
import Icon from '../formComponents/Icon';
import { useErrorNotification } from '@/hooks/useErrorNotification';

const ExportarPedido = ({ pedido, onClose }) => {
  const { showError } = useErrorNotification();
  const [formatoSeleccionado, setFormatoSeleccionado] = useState('lista');
  const [copiado, setCopiado] = useState(false);

  const generarListaSimple = () => {
    let contenido = `PEDIDO ${pedido.numero}\n`;
    contenido += `Proveedor: ${pedido.proveedor.nombre}\n`;
    contenido += `Fecha: ${new Date(pedido.fecha).toLocaleDateString()}\n`;
    contenido += `Estado: ${pedido.estado}\n`;
    if (pedido.notas) contenido += `Notas: ${pedido.notas}\n`;
    contenido += '\nPRODUCTOS:\n';

    pedido.detallePedidos.forEach((detalle, index) => {
      contenido += `${index + 1}. ${detalle.producto.nombre}\n`;
      contenido += `   Código: ${detalle.producto.codigoBarra}\n`;
      contenido += `   Cantidad: ${detalle.cantidad}\n`;
      if (detalle.precioUnitario) {
        contenido += `   Precio unitario: $${detalle.precioUnitario.toLocaleString()}\n`;
        contenido += `   Subtotal: $${(detalle.cantidad * detalle.precioUnitario).toLocaleString()}\n`;
      }
      if (detalle.observaciones) {
        contenido += `   Observaciones: ${detalle.observaciones}\n`;
      }
      contenido += '\n';
    });

    const total = pedido.detallePedidos.reduce((sum, detalle) => {
      return sum + (detalle.precioUnitario ? detalle.cantidad * detalle.precioUnitario : 0);
    }, 0);

    if (total > 0) {
      contenido += `TOTAL: $${total.toLocaleString()}\n`;
    }

    return contenido;
  };

  const generarListaConCantidades = () => {
    let contenido = `PEDIDO DE REPOSICIÓN - ${pedido.numero}\n`;
    contenido += '='.repeat(50) + '\n\n';
    contenido += `PROVEEDOR: ${pedido.proveedor.nombre}\n`;
    contenido += `FECHA: ${new Date(pedido.fecha).toLocaleDateString()}\n`;
    contenido += `ESTADO: ${pedido.estado}\n`;
    if (pedido.notas) contenido += `NOTAS: ${pedido.notas}\n`;
    contenido += '\n' + '='.repeat(50) + '\n\n';
    contenido += 'LISTA DE PRODUCTOS:\n\n';

    pedido.detallePedidos.forEach((detalle, index) => {
      const numero = (index + 1).toString().padStart(2, '0');
      contenido += `${numero}. ${detalle.producto.nombre}\n`;
      contenido += `    Código: ${detalle.producto.codigoBarra}\n`;
      contenido += `    Cantidad solicitada: ${detalle.cantidad} ${detalle.producto.unidad || 'unidades'}\n`;
      if (detalle.precioUnitario) {
        contenido += `    Precio estimado: $${detalle.precioUnitario.toLocaleString()}\n`;
      }
      if (detalle.observaciones) {
        contenido += `    Notas: ${detalle.observaciones}\n`;
      }
      contenido += '\n';
    });

    contenido += '='.repeat(50) + '\n';
    contenido += `TOTAL DE PRODUCTOS: ${pedido.detallePedidos.length}\n`;

    const total = pedido.detallePedidos.reduce((sum, detalle) => {
      return sum + (detalle.precioUnitario ? detalle.cantidad * detalle.precioUnitario : 0);
    }, 0);

    if (total > 0) {
      contenido += `TOTAL ESTIMADO: $${total.toLocaleString()}\n`;
    }

    contenido += '='.repeat(50);

    return contenido;
  };

  const generarListaParaCompra = () => {
    let contenido = `🛒 LISTA DE COMPRA - ${pedido.numero}\n\n`;
    contenido += `📅 Fecha: ${new Date(pedido.fecha).toLocaleDateString()}\n`;
    contenido += `🏭 Proveedor: ${pedido.proveedor.nombre}\n`;
    contenido += `📞 Teléfono: ${pedido.proveedor.telefono || 'No especificado'}\n`;
    if (pedido.notas) contenido += `📝 Notas: ${pedido.notas}\n`;
    contenido += '\n' + '─'.repeat(40) + '\n\n';

    pedido.detallePedidos.forEach((detalle, index) => {
      const checkBox = '☐';
      contenido += `${checkBox} ${detalle.producto.nombre}\n`;
      contenido += `   Código: ${detalle.producto.codigoBarra}\n`;
      contenido += `   Cantidad: ${detalle.cantidad} ${detalle.producto.unidad || 'unidades'}\n`;
      if (detalle.observaciones) {
        contenido += `   Nota: ${detalle.observaciones}\n`;
      }
      contenido += '\n';
    });

    contenido += '─'.repeat(40) + '\n';
    contenido += `✅ Total productos: ${pedido.detallePedidos.length}\n`;
    contenido += '\n💡 Recuerda verificar precios y disponibilidad antes de la compra.';

    return contenido;
  };

  const handleCopiar = async () => {
    let contenido = '';

    switch (formatoSeleccionado) {
      case 'lista':
        contenido = generarListaSimple();
        break;
      case 'detallada':
        contenido = generarListaConCantidades();
        break;
      case 'compra':
        contenido = generarListaParaCompra();
        break;
      default:
        contenido = generarListaSimple();
    }

    try {
      await copiarAlPortapapeles(contenido);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (error) {
      console.error('Error copiando:', error);
      showError('Error al copiar al portapapeles: ' + error.message);
    }
  };

  const handleDescargar = () => {
    let contenido = '';
    let nombreArchivo = '';

    switch (formatoSeleccionado) {
      case 'lista':
        contenido = generarListaSimple();
        nombreArchivo = `pedido-${pedido.numero}-simple.txt`;
        break;
      case 'detallada':
        contenido = generarListaConCantidades();
        nombreArchivo = `pedido-${pedido.numero}-detallado.txt`;
        break;
      case 'compra':
        contenido = generarListaParaCompra();
        nombreArchivo = `lista-compra-${pedido.numero}.txt`;
        break;
      default:
        contenido = generarListaSimple();
        nombreArchivo = `pedido-${pedido.numero}.txt`;
    }

    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="bg-gray-100 p-2 rounded-lg mr-3">
              <Icon icono="download" className="text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Exportar Pedido</h2>
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

        <div className="p-6">
          {/* Selector de formato */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Formato de exportación
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="relative">
                <input
                  type="radio"
                  name="formato"
                  value="lista"
                  checked={formatoSeleccionado === 'lista'}
                  onChange={(e) => setFormatoSeleccionado(e.target.value)}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formatoSeleccionado === 'lista'
                    ? 'border-gray-500 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center mb-2">
                    <Icon icono="list" className="text-gray-600 mr-2" />
                    <span className="font-medium">Lista Simple</span>
                  </div>
                  <p className="text-sm text-gray-600">Formato básico con productos y cantidades</p>
                </div>
              </label>

              <label className="relative">
                <input
                  type="radio"
                  name="formato"
                  value="detallada"
                  checked={formatoSeleccionado === 'detallada'}
                  onChange={(e) => setFormatoSeleccionado(e.target.value)}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formatoSeleccionado === 'detallada'
                    ? 'border-gray-500 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center mb-2">
                    <Icon icono="clipboard-list" className="text-gray-600 mr-2" />
                    <span className="font-medium">Lista Detallada</span>
                  </div>
                  <p className="text-sm text-gray-600">Incluye códigos, precios y observaciones</p>
                </div>
              </label>

              <label className="relative">
                <input
                  type="radio"
                  name="formato"
                  value="compra"
                  checked={formatoSeleccionado === 'compra'}
                  onChange={(e) => setFormatoSeleccionado(e.target.value)}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formatoSeleccionado === 'compra'
                    ? 'border-gray-500 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center mb-2">
                    <Icon icono="shopping-cart" className="text-gray-600 mr-2" />
                    <span className="font-medium">Lista de Compra</span>
                  </div>
                  <p className="text-sm text-gray-600">Formato con checkboxes para compras</p>
                </div>
              </label>
            </div>
          </div>

          {/* Vista previa */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Vista previa:</h4>
            <div className="bg-gray-50 border rounded-lg p-4 max-h-60 overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {formatoSeleccionado === 'lista' && generarListaSimple()}
                {formatoSeleccionado === 'detallada' && generarListaConCantidades()}
                {formatoSeleccionado === 'compra' && generarListaParaCompra()}
              </pre>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleDescargar}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
            >
              <Icon icono="download" className="mr-2" />
              Descargar
            </button>
            <button
              onClick={handleCopiar}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                copiado
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              <Icon icono={copiado ? "check" : "copy"} className="mr-2" />
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportarPedido;
