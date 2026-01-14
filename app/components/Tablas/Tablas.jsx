"use client"

import { useEffect, useRef, useState } from "react";
import Icon from "../formComponents/Icon";

function convertirArray(array) {
  const esArrayDeStrings = array.every((elemento) => typeof elemento === 'string');
  if (esArrayDeStrings) {
    return array.map((elemento) => ({ titulo: elemento }));
  }
  return array;
}

const Orden = ({col, handleSort, ...props}) => {
  const [ordenar, setOrdenar] = useState(0)

  const onClick = () => {
    setOrdenar(prev => ((prev + 1) %3))
    handleSort(col, ordenar)
  }
  const direcciones = {0: "sort", 1: "sort-up", 2: "sort-down"}
  return(
    <Icon onClick={onClick} className={"ml-0.5"} icono={direcciones[ordenar]} {...props}/>
  )
}

const estiloStyck = (stick) =>{ const style = {};stick && (style.position = 'sticky'); stick && (style.top = `${stick}px`); return style;}

const Separadores = ({style = {}, stick = null, alto = null, columnas = [], color = "bg-white" }) => {
  alto  && (style.height = `${alto}px`);
  return (
    <tr className={`${color}`} style={{...style, ...estiloStyck(stick)}}>
      {columnas && columnas?.map((t, i) => <th key={i}></th>)}
    </tr>
  );
}

export const Tabla = ({ columnas:cc, handleSort, children, titulo, className, size, ...props } = {}) => {
  const columnas = convertirArray(cc)
  const captionRef = useRef(null)
  const headRef = useRef(null)

  const [alturaCaption, setAlturaCaption] = useState(0); // Estado para almacenar la altura
  const [alturaHead, setAlturaHead] = useState(0); // Estado para almacenar la altura

  useEffect(() => {
    if (captionRef.current) {
      setAlturaCaption(captionRef.current.offsetHeight); // Paso 3: Acceder a la altura
    }
  }, []);

  useEffect(() => {
    setAlturaHead(alturaCaption + headRef.current.offsetHeight-5)
  },[alturaCaption])

  const sizeClasses = (() => {
    if (size === 'kiosk') {
      return {
        table: 'text-base [&_td]:py-2 [&_td]:px-3',
        caption: 'text-xl',
        thCell: 'px-3 py-2 text-sm',
        container: 'min-h-[520px]',
      };
    }
    return {
      table: 'lg:text-sm text-xs [&_td]:py-1 [&_td]:px-2',
      caption: 'text-lg',
      thCell: 'px-2 py-1 text-xs',
      container: 'min-h-[400px]',
    };
  })();

  return (
    <div className={`flex flex-col overflow-auto ${sizeClasses.container} hideScroll`}>
      <table className={`table-auto max-w-full text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm ${sizeClasses.table} ${className || ''}`.trim()}>
        <caption ref={captionRef} className={`table-caption sticky top-0 z-40 font-semibold text-gray-800 bg-gray-200 ${sizeClasses.caption}`.trim()}>
          {titulo}
        </caption>
        <thead className="table-header-group bg-gray-200 w-full">
          <Separadores columnas={columnas} alto={1} color={"bg-gray-200"} stick={alturaCaption+4}/>
          <Separadores columnas={columnas} alto={6} color={"bg-gray-200"} stick={alturaCaption+6}/>
          <tr ref={headRef} className=" bg-gray-200" style={estiloStyck(alturaCaption)}>
            {columnas && columnas.map(({colw, titulo, ordenable, key}, i) => (
              <th key={i} className={`
                  whitespace-nowrap
                  font-medium
                  text-gray-600
                  uppercase
                  tracking-wider
                  ${sizeClasses.thCell}
                  ${colw}
                `}>
                {ordenable && <Orden handleSort={handleSort} col={key}/>} {titulo}
              </th>
            ))}
          </tr>
          <Separadores columnas={columnas} alto={6} color={"bg-gray-200"} stick={alturaHead}/>
          <Separadores columnas={columnas} alto={1} color={"bg-gray-300"} stick={alturaHead+4}/>
        </thead>
        <tbody className="table-row-group bg-white divide-y divide-gray-300 snap-both">
          {children}
        </tbody>
      </table>
      </div>

  );
}

export const Tr = ({ ultimo, children, className, seleccionado, ...props } = {}) => (
  <tr className={`table-row ${seleccionado ? "": "hover:bg-gray-200"} ${className} last:h-18 last:align-center last:mt-2`} {...props}>
    {children}
  </tr>
)

export const Td = ({ children, className, ...props } = {}) => (
  <td className={`table-cell ${className}`} {...props}>
    {children}
  </td>
);
