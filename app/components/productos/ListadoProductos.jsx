import S from './ListadoProductos.module.css'
import { listaProductos } from '@/prisma/consultas/productos';

const Thead = ({titulos}) => (
  <thead>
    <tr>
      {titulos.map((t,i) => <th key={i}>{t}</th> )}
    </tr>
  </thead>
)

const RenglonProducto = async ({item}) => (
  <tr>
    <td>{item.categoria.nombre}</td>
    <td>{item.codigoBarra}</td>
    <td>{item.nombre}</td>
    <td>{item.descripcion}</td>
    <td>${item.precios[0]?.precio}</td>
  </tr>
)

const ListadoProductos = async () => {
  const titulos = ['Categoria', 'Codigo de Barras', 'Nombre', 'Descripcion', 'Ultimo Precio']
  const listadoProductos = await listaProductos()
  return (
    <table className={S.tableExcel}>
      <caption>Listado Productos</caption>
      <Thead titulos={titulos}/>
      <tbody>
        {listadoProductos.map(producto => 
          <RenglonProducto key={producto.id} item={producto}/>
        )}
      </tbody>
    </table>

  )
};


export default ListadoProductos;
