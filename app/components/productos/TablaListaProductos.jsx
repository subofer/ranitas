"use client"
import { useState } from 'react';
import { Tabla } from '../Tablas';
import { RenglonTablaProducto } from './PartesTablaListaProductos';
import { tablaListaProductosColumnasNames } from './tablaProductosData';
import TituloFiltrero from './TituloFiltreoInput';
import { filtrarProductosPorClave } from './filtrarPorClave';

const TablaListaProductos = ({productos, columnas, titulo= "Productos", ...props } = {}) => {
  const cols = columnas?.map((x) => tablaListaProductosColumnasNames[x]?.titulo)
  const [filtro, setFiltro] = useState("");

  const productosFiltrados = filtrarProductosPorClave(productos, filtro, tablaListaProductosColumnasNames);

  return (
    <Tabla
      columnas={cols}
      titulo={<TituloFiltrero titulo={titulo} seter={setFiltro}/>}
      {...props}
    >
      {productosFiltrados && productosFiltrados.length > 0 && productosFiltrados.map((p,i) => (
        <RenglonTablaProducto key={i} item={p} columnas={columnas}/>
      ))}
    </Tabla>
  )
};

export default TablaListaProductos;
