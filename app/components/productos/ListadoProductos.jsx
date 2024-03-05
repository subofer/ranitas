"use server"
import { getProductos } from '@/prisma/consultas/productos';

const Thead = ({titulos, ...props}) => (
  <thead {...props}>
    <tr>
      {titulos.map((t,i) => <th key={i}>{t}</th> )}
    </tr>
  </thead>
)
const Cell = ({children, ...props}) => (
  <td className='px-2 border-r-2 border-r-slate-500' {...props}>{children}</td>
);

const RenglonProducto = async ({item}) => (
  <tr className='table-row odd:bg-slate-300 even:bg-slate-200'>
    <Cell>{item.categoria?.nombre}</Cell>
    <Cell>{item.codigoBarra}</Cell>
    <Cell>{item.nombre}</Cell>
    <Cell>{item.descripcion}</Cell>
    <Cell className='text-right px-2'>${item.precios[0]?.precio}</Cell>
  </tr>
)

const ListadoProductos = async (props) => {
  const titulos = ['Categoria', 'Codigo de Barras', 'Nombre', 'Descripcion', 'Ultimo Precio']
  const productos = await getProductos()
  return (
    <table className={ `table border-2 border-slate-400 ${props.className}`} >
      <caption className="table-caption bg-slate-200">Listado Productos</caption>
      <Thead 
        className='table-header-group bg-slate-400'
        titulos={titulos}
      />
      <tbody>
        {productos.map( (p,i) => (
          <RenglonProducto key={i} item={p}/>
        ))}
      </tbody>
    </table>

  )
};


export default ListadoProductos;
