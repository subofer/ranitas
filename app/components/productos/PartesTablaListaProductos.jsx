"use client"
import { Tr, Td } from '../Tablas';
import { obtenerValorPorRuta as vr } from './tablaProductosData';

export const RenglonTablaProducto = ({item, columnas}) => (
  <Tr>
    {
      columnas && columnas.map((col, index)=> {
        const { className, texto, Component, decorador } = vr(item, col)
        return (
          <Td key={index + col} className={className}>
            { decorador(texto) }
            {Component &&
              <Component className={"p-0 m-0"} item={item}/>
            }
          </Td>
        )
      })
    }
  </Tr>
);

export default RenglonTablaProducto;
