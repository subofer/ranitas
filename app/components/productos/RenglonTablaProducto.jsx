"use client"
import { Tr, Td } from '../Tablas';
import { obtenerValorPorRuta as vr } from './tablaProductosData';

export const RenglonTablaProducto = ({item, columnas, seleccionado, onToggleSeleccionado}) => {
  return (
  <Tr seleccionado={seleccionado} onClick={onToggleSeleccionado}
      className={`${seleccionado? "odd:bg-blue-400 even:bg-blue-400":""}`}
  >
    {
      columnas && columnas.map((col, index)=> {
        const { className, texto, Component = null, decorador } = vr(item, col)
        return (
          <Td key={index + col} className={className}>
            {decorador(texto)}
            {Component && <Component className={"p-0 m-0"} item={item}/>}
          </Td>
        )
      })
    }
  </Tr>
 );
};

export default RenglonTablaProducto;
