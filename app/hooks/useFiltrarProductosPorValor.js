import { textos as tx } from '@/lib/manipularTextos';
import { useState } from 'react';
import { getKeyByName, tablaListaProductosColumnasNames, obtenerValorPorRuta as vr} from '../components/productos/tablaProductosData';

const filtrarProductosPorClave = (productos, filtro, columnasNames) => {
  const filtros = tx.preparar(filtro);
  return productos.filter(producto =>
    Object.keys(columnasNames).some(clave => {
      const palabras = tx.preparar(vr(producto, clave)?.texto)
      return filtros.every(filtro => palabras.some(t => t.includes(filtro)))
    })
  )
}

const useFiltrarProductosPorValor = (productos, columnas) => {
  const [filtro, setFiltro] = useState("");
  const productosFiltrados = filtrarProductosPorClave(productos, filtro, tablaListaProductosColumnasNames) || [];
  return [
    columnas?.map((x) => ({
      titulo: tablaListaProductosColumnasNames[x]?.titulo,
      ordenable:tablaListaProductosColumnasNames[x]?.ordenable,
      key:x })),
    productosFiltrados,
    setFiltro,
    productos.length,
    productosFiltrados.length,
  ];
}

export default useFiltrarProductosPorValor;