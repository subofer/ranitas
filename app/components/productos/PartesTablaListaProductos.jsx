"use client"
import { Tr, Td } from '../Tablas';
import { tablaListaProductosColumnasNames } from './tablaProductosData';

export const obtenerValorPorRuta = (item, clave) => {
  const {key, className, titulo, Component, decorador} = tablaListaProductosColumnasNames[clave]
  const keys = Array.isArray(key) ? key : [key];
  const texto = keys?.map(subclave =>
    subclave?.split('.')?.reduce((resultado, clave) => {
        return resultado ? resultado[clave] : undefined;
      }, item)
    ).join(" ");

  return {
    titulo,
    texto,
    className,
    Component,
    decorador,
  }
};

export const RenglonTablaProducto = ({item, columnas}) => (
  <Tr>
    {
      columnas && columnas.map((col, index)=> {
        const {className, texto, Component, decorador} = obtenerValorPorRuta(item, col)
        return (
          <Td key={index + col} className={className}>
            { decorador ? decorador(texto) : texto }
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
