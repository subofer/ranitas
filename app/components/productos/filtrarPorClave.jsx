import { obtenerValorPorRuta } from './PartesTablaListaProductos';

export const filtrarProductosPorClave = (productos, filtro, columnasNames) => {
  if (!filtro) return productos;
  return productos.filter(producto => {
      return Object.keys(columnasNames).some(clave => {
      const { texto } = obtenerValorPorRuta(producto, clave);
      return texto && texto.toString().toLowerCase().includes(filtro.toLowerCase());
    });
  });
};
