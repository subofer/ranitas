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


export const Tabla = ({ columnas:cc, handleSort, children, titulo, ...props } = {}) => {
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

  return (
    <div className="flex w-full h-fit overflow-auto overscroll-contain snap-y">
      <table className="table-auto w-full text-sm text-gray-600 bg-slate-400">
        <caption ref={captionRef} className="sticky top-0 text-lg font-semibold text-gray-800 bg-gray-200 ">
          {titulo}
        </caption>
        <thead className=" bg-gray-200 w-full">
          <Separadores columnas={columnas} alto={1} color={"bg-gray-200"} stick={alturaCaption+4}/>
          <Separadores columnas={columnas} alto={6} color={"bg-gray-200"} stick={alturaCaption+6}/>
          <tr ref={headRef} className="justify-around bg-gray-200" style={estiloStyck(alturaCaption)}>
            {columnas && columnas.map(({titulo: t, ordenable, key}, i) => (
              <th key={i} className="whitespace-nowrap px-0 py-0.5 text-xs font-medium text-gray-600 uppercase tracking-wider ">
                {ordenable && <Orden handleSort={handleSort} col={key}/>} {t} 
              </th>
            ))}
          </tr>
          <Separadores columnas={columnas} alto={6} color={"bg-gray-200"} stick={alturaHead}/>
          <Separadores columnas={columnas} alto={1} color={"bg-gray-300"} stick={alturaHead+4}/>
        </thead>
        <tbody className="bg-white divide-y divide-gray-300 snap-both overflow-hidden">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export const Tr = ({ ultimo, children, className, seleccionado, ...props } = {}) => (
  <tr className={` ${seleccionado ? "": "hover:bg-gray-200"} ${className} last:h-18 last:align-center last:mt-2`} {...props}>
    {children}
  </tr>
)

export const Td = ({ children, className, ...props } = {}) => (
  <td className={`${className}`} {...props}>
    {children}
  </td>
);
