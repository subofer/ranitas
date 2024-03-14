"use server"
import { getProductos } from '@/prisma/consultas/productos';
import { Tabla, Tr, Td } from '../Tablas';
import { BotonEliminarProducto } from './BotonEliminarProducto';

const RenglonProducto = ({item}) => (
  <Tr>
    <Td className={"w-40 text-center"}>{item.categoria?.nombre}</Td>
    <Td className={"w-40 text-center"}>{item.codigoBarra}</Td>
    <Td>{item.nombre}</Td>
    <Td>{item.descripcion}</Td>
    <Td className={"flex justify-end w-auto"}>{item.size} {item.unidad}</Td>
    <Td className='text-right px-2'>${item.precios[0]?.precio}
      <BotonEliminarProducto className={"pl-1 pr-0"} item={item}/>
    </Td>

  </Tr>
)

const ListadoProductos = async (props) => {
  const columnas = ['Categoria', 'Codigo de Barras', 'Nombre', 'Descripcion','Tamaño', 'Ultimo Precio']
  const productos = await getProductos()
  return (
    <Tabla
      columnas={columnas}
      titulo={"Productos"}
      {...props}
    >
      {productos.map((p,i) => (
        <RenglonProducto key={i} item={p}/>
      ))}
    </Tabla>
  )
};

export default ListadoProductos;
