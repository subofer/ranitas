"use server"
import { getProductos } from '@/prisma/consultas/productos';
import TablaListaProductos from './TablaListaProductos';

const ListadoProductos = async ({cols, ...props}) => {
  const columnas = cols || ['eliminar',  'cat', 'nombre', 'desc','size', 'precioActual','stock', 'imagen', 'edit']
  const productos = await getProductos()

  return (
    <div className='w-full mx-auto'>
      <TablaListaProductos
        columnas={columnas}
        titulo={"Productos"}
        productos={productos}
        tipo={"filtro"}
        {...props}
        />
    </div>
  )
};

export default ListadoProductos;
