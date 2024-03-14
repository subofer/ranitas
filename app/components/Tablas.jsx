export const Tabla = ({columnas, children, titulo, ...props}) => (
  <table className={`table border-2 border-slate-400 ${props.className}`} >
    <caption className="table-caption bg-slate-200 text-lg font-bold">{titulo}</caption>
    <thead
      className='table-header-group bg-slate-400'
      columnas={columnas}
    >
      <tr>
        {columnas.map((t,i) => <th key={i}>{t}</th> )}
      </tr>
    </thead>
    <tbody>
      {children}
    </tbody>
  </table>
)

export const Td = ({children, className, ...props}) => (
  <td className={`px-2 border-r-2 border-r-slate-500 ${className}` } {...props}>{children}</td>
);

export const Tr = ({children, ...props}) => (
  <tr className={`w-full table-row odd:bg-slate-300 even:bg-slate-200 ${props.className}`}>
    {children}
  </tr>
);
