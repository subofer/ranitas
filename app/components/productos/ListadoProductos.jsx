"use server"
import { getProductos } from '@/prisma/consultas/productos';
import TablaListaProductos from './TablaListaProductos';

const ListadoProductos = async (props) => {
  const columnas = ['cat', 'codigoBarra', 'nombre', 'desc','size', 'precioActual']
  const productos = await getProductos()
  return (
    <TablaListaProductos
      columnas={columnas}
      titulo={"Productos"}
      productos={productos}
      {...props}
    />
  )
};

export default ListadoProductos;
