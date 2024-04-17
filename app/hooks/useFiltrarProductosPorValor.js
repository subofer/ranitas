import { textos as tx } from '@/lib/manipularTextos';
import { useMemo, useState } from 'react';
import { tablaListaProductosColumnasNames, obtenerValorPorRuta as vr} from '../components/productos/tablaProductosData';

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

  const cols = useMemo(() => columnas?.map((x) => ({
    ...tablaListaProductosColumnasNames[x],
  })),[columnas])

  return [
    cols,
    productosFiltrados,
    setFiltro,
    productos.length,
    productosFiltrados.length,
    filtro,
  ];
}

export default useFiltrarProductosPorValor;