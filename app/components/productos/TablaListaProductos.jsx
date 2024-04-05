"use client"
import { useCallback, useMemo, useState } from 'react';
import TbodyTablaProducto from './TbodyTablaProducto';
import TituloFiltrero from './TituloFiltreoInput';
import useFiltrarProductosPorValor from '@/app/hooks/useFiltrarProductosPorValor';
import SelectAllToggle from './SelectAllToggle';
import CopyToClipBoard from './CopyToClipBoard';
import { Tabla } from '../Tablas/Tablas ';

const TablaListaProductos = ({ComponenteTituloProp = null, tipo = "listado", productos, columnas, titulo= "Productos", ...props } = {}) => {
  const [
    cols,
    productosFiltrados,
    setFiltro,
    cantidadTotal,
    cantidadFiltrada,
  ] = useFiltrarProductosPorValor(productos, columnas)

  const [seleccionados, setseleccionados] = useState([]);
  const [orden, setOrden] = useState({ columna: null, direccion: 'asc' });

  const handleSort = (columna, nuevaDireccion) => {
    setOrden(() => {
      switch (nuevaDireccion) {
        case 0: // No ordenar
          return { columna: null, direccion: null };
        case 1: // Ascendente
          return { columna, direccion: 'asc' };
        case 2: // Descendente
          return { columna, direccion: 'desc' };
        default:
          return { columna, direccion: 'asc' }; // Por defecto o en caso de un valor inesperado
      }
    });
  };

  const toggleSeleccion = (id) => {
    setseleccionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSeleccionButton = useCallback(() => {
    const idsProductosFiltrados = productosFiltrados.map(({id}) => id);
    idsProductosFiltrados.every(id => seleccionados.includes(id))
      ? setseleccionados([])
      : setseleccionados(idsProductosFiltrados);
  }, [productosFiltrados, seleccionados]);

  const productosOrdenados = useMemo(() => {
    if (!orden.columna) return productosFiltrados;
    return [...productosFiltrados].sort((a, b) => {
      if (a[orden.columna] < b[orden.columna]) return orden.direccion === 'asc' ? -1 : 1;
      if (a[orden.columna] > b[orden.columna]) return orden.direccion === 'asc' ? 1 : -1;
      return 0;
    });
  }, [productosFiltrados, orden]);

  const ComponenteTituloFiltrero = () => (
    <TituloFiltrero cantidades={{total:cantidadTotal, seleccionados:cantidadFiltrada}} titulo={titulo} seter={setFiltro}>
      <SelectAllToggle seter={toggleSeleccionButton}>
      {
        seleccionados.length == productosOrdenados.length
          ? "Borrar seleccion"
          : "Selecionar todos"
      }
      </SelectAllToggle>
      {/*<CopyToClipBoard data={productosFiltrados} selector={seleccionados}> Copiar </CopyToClipBoard>*/}
    </TituloFiltrero>
  )

  return (
    <Tabla
      columnas={cols}
      handleSort={handleSort}
      titulo={ComponenteTituloProp ? ComponenteTituloProp() : ComponenteTituloFiltrero()}
      
      {...props}
    >
      <TbodyTablaProducto
        items={productosOrdenados}
        columnas={columnas}
        seleccionados={seleccionados}
        onToggleSeleccion={toggleSeleccion}
        {...props}
      />
    </Tabla>
  )
};

export default TablaListaProductos;
