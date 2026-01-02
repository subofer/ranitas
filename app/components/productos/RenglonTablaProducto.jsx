"use client"
import { useCallback } from 'react';
import useMyParams from '@/hooks/useMyParams';
import { obtenerValorPorRuta as vr } from './tablaProductosData';
import { Td, Tr } from '../Tablas/Tablas';
import Skeleton from '../Skeleton';

export const RenglonTablaProducto = ({
  ultimo,
  item,
  items,
  columnas,
  seleccionado,
  onToggleseleccionado,
  ...props
}) => {
  const myParams = useMyParams();

  const handleOnClick = useCallback((onClick, item, items) => {
    if (onClick) {
      const result = onClick(item, items)
      const {
        action = "",
        key = '',
        value = '',
        isParams = false
      } = result || {};

      if (isParams) {
        // Evitar ejecutar durante el render usando setTimeout
        setTimeout(() => {
          if (action === "addParam") {
            myParams.addParam(key, value);
          } else if (action === "deleteParam") {
            myParams.deleteParam(key);
          }
          props?.trigger?.();
        }, 0);
      }
    }
  }, [myParams, props]);

  return (
    <Tr
      ultimo={ultimo}
      seleccionado={seleccionado}
      className={`${seleccionado? "odd:bg-blue-200 even:bg-blue-200 hover:bg-blue-300":null}`}
    >
      {
        columnas && columnas.map( (col, index) => {
          const {
            className,
            onClick,
            texto,
            noselect,
            Component = null,
            decorador,
            imagen,
            valorDefecto,
            componentClassname,
            ...resto
          } = vr(item, col);

          return (
            <Td
              key={`${index}+${col}-item-TD`}
              className={`${className} abg-${index % 2 == 0 ? "red":"blue"}-300`}
              onClick={() => !noselect && onToggleseleccionado()}
            >
              {
                item.id
                ? ( Component
                  ? <Component onClick={() => handleOnClick(onClick, item, items)} className={componentClassname} item={item} {...props} {...resto} />
                  : decorador(texto ? texto : valorDefecto)
                  ) : <Skeleton className='h-[64px]'/>
              }
            </Td>
          )
        })
      }
    </Tr>
 );
};

export default RenglonTablaProducto;
