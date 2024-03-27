"use client"
import { useCallback, useState } from 'react';
import { Tabla } from '../Tablas';
import TbodyTablaProducto from './TbodyTablaProducto';
import TituloFiltrero from './TituloFiltreoInput';
import useFiltrarProductosPorValor from '@/app/hooks/useFiltrarProductosPorValor';
import SelectAllToggle from './SelectAllToggle';
import CopyToClipBoard from './CopyToClipBoard';

const TablaListaProductos = ({productos, columnas, titulo= "Productos", ...props } = {}) => {
  const [
    cols,
    productosFiltrados,
    setFiltro
  ] = useFiltrarProductosPorValor(productos, columnas)

  const [seleccionados, setseleccionados] = useState([]);

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

  return (
    <Tabla
      columnas={cols}
      titulo={
        <TituloFiltrero titulo={titulo} seter={setFiltro}>
          <SelectAllToggle seter={toggleSeleccionButton}>
          {
            seleccionados.length == productosFiltrados.length
              ? "Borrar seleccion"
              : "Selecionar todos"
          }
          </SelectAllToggle>
          <CopyToClipBoard data={productosFiltrados} selector={seleccionados}> Copiar </CopyToClipBoard>
        </TituloFiltrero>
      }
      {...props}
    >
      <TbodyTablaProducto
        items={productosFiltrados}
        columnas={columnas}
        seleccionados={seleccionados}
        onToggleSeleccion={toggleSeleccion}
      />
    </Tabla>
  )
};

export default TablaListaProductos;
