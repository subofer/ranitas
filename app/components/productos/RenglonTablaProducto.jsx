"use client"
import useMyParams from '@/app/hooks/useMyParams';
import { obtenerValorPorRuta as vr } from './tablaProductosData';
import { Td, Tr } from '../Tablas/Tablas ';
import Skeleton from '../Skeleton';


export const RenglonTablaProducto = ({ultimo, item, items, columnas, seleccionado, onToggleseleccionado, ...props}) => {
  const myParams = useMyParams();
  return (
    <>
  <Tr ultimo={ultimo} seleccionado={seleccionado} className={`${seleccionado? "odd:bg-blue-200 even:bg-blue-200 hover:bg-blue-300":""}`}>
    {
      columnas && columnas.map((col, index)=> {
        const { className, onClick, texto, noselect, Component = null, decorador, imagen, valorDefecto, componentClassname, ...resto } = vr(item, col)
        const handleOnClick = () => {
          const result = onClick(item, items)
          const {
            action = "",
            key = '',
            value = '',
            isParams = false
          } = result || {};
          isParams && myParams[action](key, value)
          props?.trigger();
        }

        return (
          <Td key={index + col} className={`${className} abg-${index % 2 == 0 ? "red":"blue"}-300`} onClick={() => !noselect && onToggleseleccionado()}>
            {
              item.id
              ? ( Component
                ? <Component onClick={handleOnClick} className={componentClassname} item={item} {...props} />
                : decorador(texto ? texto : valorDefecto)
                ) : <Skeleton className='h-[64px]'/>
            }
          </Td>
        )
      })
    }
  </Tr>
  </>
 );
};

export default RenglonTablaProducto;
