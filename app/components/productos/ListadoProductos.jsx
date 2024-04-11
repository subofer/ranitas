"use server"
import { getProductos } from '@/prisma/consultas/productos';
import TablaListaProductos from './TablaListaProductos';
import { getProveedores } from '@/prisma/consultas/proveedores';

const ListadoProductos = async ({cols, ...props}) => {
  const columnas = cols || ['edit', 'codigoBarra', 'cat', 'nombre', 'desc','size', 'precioActual','stock', 'imagen', 'eliminar']
  const productos = await getProductos()
  const proveedores = await getProveedores()

  return (
    <TablaListaProductos
      columnas={columnas}
      titulo={"Productos"}
      productos={productos}
      proveedores={proveedores}
      tipo={"filtro"}
      {...props}
      />

  )
};

export default ListadoProductos;
