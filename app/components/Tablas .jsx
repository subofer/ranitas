"use client"
export const Tabla = ({ columnas, children, titulo, ...props } = {}) => (
  <div className="
    flex-grow
    overflow-auto
    overscroll-contain
    scroll-smooth
    snap-mandatory
    snap-y
    scroll-my-6
    ">
    <table className="table w-full text-sm text-gray-500 bg-slate-400">
      <caption className="z-30 sticky top-[0px] text-lg font-semibold text-gray-900 bg-gray-200 border-b-gray-300 border-b-2">
        {titulo}
      </caption>
      <thead className="z-20 sticky top-[40px] bg-gray-200">
        <tr className="w-full sticky top-[52px] justify-around ">
          {columnas && columnas.map((t, i) => (
            <th key={i} className="px-6 pt-3 text-xs font-medium text-gray-500 uppercase tracking-wider ">
              {t}
            </th>
          ))}
        </tr>
        <tr className="z-40 w-full sticky top-[50px] h-3 m-3 border-b-gray-300 border-b-2">
          {columnas && columnas.map((t, i) => (<th key={i} ></th>))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-300 snap-both" style={{height: "55vh"}}>
        {children}
      </tbody>
      <div className="pb-8"></div>
    </table>
  </div>
);


export const Tr = ({ children, className, seleccionado, ...props } = {}) => {
  return (
    <tr
      className={`
      ${seleccionado ? "": "hover:bg-gray-200"}
      ${className}
      `}
      {...props}
    >
      {children}
    </tr>
  )
};

export const Td = ({ children, className, ...props } = {}) => (
  <td
    className={`
      px-6 py-4
      snap-center
      ${className}
    `}
    {...props}
  >
    {children}
  </td>
);
