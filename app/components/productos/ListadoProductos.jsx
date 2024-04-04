"use server"
import { getProductos } from '@/prisma/consultas/productos';
import TablaListaProductos from './TablaListaProductos';

const ListadoProductos = async ({cols, ...props}) => {
  const columnas = cols || ['edit', 'codigoBarra', 'cat', 'nombre', 'desc','size', 'precioActual', 'imagen', 'eliminar']
  const productos = await getProductos()

  return (
    <TablaListaProductos
      columnas={columnas}
      titulo={"Productos"}
      productos={productos}
      tipo={"filtro"}
      {...props}
      />
  )
};

export default ListadoProductos;
