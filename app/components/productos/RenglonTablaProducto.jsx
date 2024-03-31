"use client"
import useMyParams from '@/app/hooks/useMyParams';
import { obtenerValorPorRuta as vr } from './tablaProductosData';
import { Td, Tr } from '../Tablas ';

export const RenglonTablaProducto = ({item, columnas, seleccionado, onToggleseleccionado}) => {
  const myParams = useMyParams();

  return (
  <Tr seleccionado={seleccionado} className={`${seleccionado? "odd:bg-blue-200 even:bg-blue-200 hover:bg-blue-300":""}`}
  >
    {
      columnas && columnas.map((col, index)=> {
        const { className, onClick, texto, noselect, Component = null, decorador, imagen, ...props } = vr(item, col)

        const handleOnClick = () => {
          const result = onClick(item)
          const {
            action = "",
            key = '',
            value = '',
            isParams = false
          } = result || {};

          isParams && myParams[action](key, value)
        }

        return (
          <Td key={index + col} className={className} onClick={() => !noselect && onToggleseleccionado()}>
            {!Component && decorador(texto)}
            {Component && <Component onClick={handleOnClick} className={"p-0 m-0"} item={item} {...props}/>}
          </Td>
        )
      })
    }
  </Tr>
 );
};

export default RenglonTablaProducto;
