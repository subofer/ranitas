"use client"
import { Tr, Td } from '../Tablas';
import { obtenerValorPorRuta as vr } from './tablaProductosData';

export const RenglonTablaProducto = ({item, columnas, seleccionado, onToggleseleccionado}) => {
  return (
  <Tr onClick={onToggleseleccionado}
      className={`${seleccionado? "odd:bg-blue-400 even:bg-blue-400":""}`}
  >
    {
      columnas && columnas.map((col, index)=> {
        const { className, texto, Component = null, decorador, imagen, ...resto } = vr(item, col)
        return (
          <Td key={index + col} className={className}>
            {!Component && decorador(texto)}
            {Component && <Component className={"p-0 m-0"} item={item} {...resto}/>}
          </Td>
        )
      })
    }
  </Tr>
 );
};

export default RenglonTablaProducto;
