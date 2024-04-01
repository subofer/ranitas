"use server"
import { getProductos } from '@/prisma/consultas/productos';
import TablaListaProductos from './TablaListaProductos';

const ListadoProductos = async ({suspense, ...props}) => {
  const columnas = ['edit', 'codigoBarra', 'cat', 'nombre', 'desc','size', 'precioActual', 'imagen', 'eliminar']
  const productos = suspense ? [{nombre: "cargando....."},{},{},{},{},{},{}] : await getProductos()

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
