import { textos as tx } from '@/lib/manipularTextos';
import { obtenerValorPorRuta as vr } from './tablaProductosData';

export const filtrarProductosPorClave = (productos, filtro, columnasNames) => {
  const filtros = tx.preparar(filtro);
  return productos.filter(producto =>
    Object.keys(columnasNames).some(clave => {
      const palabras = tx.preparar(vr(producto, clave)?.texto)
      return filtros.every(filtro => palabras.some(t => t.includes(filtro)))
    })
  )
}
