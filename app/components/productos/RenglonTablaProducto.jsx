"use client"
import useMyParams from '@/app/hooks/useMyParams';
import { Tr, Td } from '../Tablas';
import { obtenerValorPorRuta as vr } from './tablaProductosData';

export const RenglonTablaProducto = ({item, columnas, seleccionado, onToggleseleccionado}) => {
  const myParams = useMyParams();

  return (
  <Tr onClick={onToggleseleccionado}
      className={`${seleccionado? "odd:bg-blue-400 even:bg-blue-400":""}`}
  >
    {
      columnas && columnas.map((col, index)=> {
        const { className, onClick, texto, Component = null, decorador, imagen, ...resto } = vr(item, col)

        const handleOnClick = () => {
          const { action, key, value, isParams } = onClick(item)
          isParams && myParams[action](key, value)
        }
        return (
          <Td key={index + col} className={className }>
            {!Component && decorador(texto)}
            {Component && <Component onClick={handleOnClick} className={"p-0 m-0"} item={item} {...resto}/>}
          </Td>
        )
      })
    }
  </Tr>
 );
};

export default RenglonTablaProducto;
