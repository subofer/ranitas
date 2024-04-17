"use server"
import { getProductos } from '@/prisma/consultas/productos';
import TablaListaProductos from './TablaListaProductos';
import { getProveedoresCompletos } from '@/prisma/consultas/proveedores';

const ListadoProductos = async ({cols, ...props}) => {
  const columnas = cols || ['eliminar', 'codigoBarra', 'cat', 'nombre', 'desc','size', 'precioActual','stock', 'imagen', 'edit']
  const productos = await getProductos()
  const proveedores = await getProveedoresCompletos()

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
