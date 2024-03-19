"use client"
export const Tabla = ({columnas, children, titulo, ...props}) => (
  <div className="overflow-x-auto relative shadow-md sm:rounded-lg">

  <table className={`w-full table border-2 border-slate-400 ${props.className}`} >
    <caption className="table-caption bg-slate-200 text-lg font-bold">
      {titulo}
    </caption>
    <thead className='table-header-group bg-slate-400'>
      <tr>
        {columnas && columnas.map((t,i) =>
          <th key={i}>
            {t}
          </th>
        )}
      </tr>
    </thead>
    <tbody className="overflow-y-auto max-h-64">
      {children}
    </tbody>
  </table>
  </div>
)

export const Tr = ({children, ...props}) => (
  <tr className={`w-full table-row odd:bg-slate-300 even:bg-slate-200 ${props.className}`}>
    {children}
  </tr>
);

export const Td = ({children, className, ...props}) => (
  <td
    className={`px-2 border-r-2 border-r-slate-500 ${className}` }
    {...props}
  >
    {children}
  </td>
);
