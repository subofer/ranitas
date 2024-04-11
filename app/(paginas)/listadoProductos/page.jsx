"use server"
import { Suspense } from 'react';
import ListadoProductos from "@/app/components/productos/ListadoProductos"

const PageVerProductos = async () => {

  return (
    <main className='flex flex-col flex-grow w-full h-full overflow-hidden mx-auto'>
      <Suspense fallback={<ListadoProductos suspense />}>
        <ListadoProductos
          cols={['codigoBarra', 'cat', 'nombre', 'desc','size', 'stock','precioActual', 'imagen']}
        />
      </Suspense>
    </main>
  );
};
export default PageVerProductos;

