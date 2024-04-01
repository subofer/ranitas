"use client"
const Separadores = ({style = {}, stick = null, alto = null, columnas = [], color = "bg-white" }) => {
  alto  && (style.height = `${alto}px`); stick && (style.position = 'sticky'); stick && (style.top = `${stick}px`);
  return (
    <tr className={color} style={style}>
      {columnas && columnas?.map((t, i) => <th key={i}></th>)}
    </tr>
  );
}

export const Tabla = ({ columnas, children, titulo, ...props } = {}) => {
  return (
    <div className="flex w-full h-fit overflow-auto overscroll-contain snap-y">
      <table className="table-auto w-full text-sm text-gray-600 bg-slate-400">
        <caption className="sticky top-[-3px] text-lg font-semibold text-gray-800 bg-gray-200 ">
          {titulo}
        </caption>
        <thead className=" bg-gray-200">
          <Separadores columnas={columnas} alto={1} color={"bg-gray-300"} stick={48}/>
          <Separadores columnas={columnas} alto={6} color={"bg-gray-200"}/>
          <tr className="justify-around bg-gray-200 sticky top-[49px]">
            {columnas && columnas.map((t, i) => (
              <th key={i} className="px-0 py-0.5 text-xs font-medium text-gray-600 uppercase tracking-wider ">
                {t}
              </th>
            ))}
          </tr>
          <Separadores columnas={columnas} alto={6} color={"bg-gray-200"}/>
          <Separadores columnas={columnas} alto={1} color={"bg-gray-300"} stick={68}/>
        </thead>
        <tbody className="bg-white divide-y divide-gray-300 snap-both">
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
  <td className={className} {...props}>
    {children}
  </td>
);
