"use server"
import { Suspense } from 'react';
import ListadoProductos from "@/app/components/productos/ListadoProductos"

const PageVerProductos = async () => {

  return (
    <section className="flex flex-col gap-3 w-full h-full mx-auto max-h-full md:h-fit flex-grow">
      <Suspense fallback={<ListadoProductos suspense />}>
        
        
      <div className="
        flex
        max-h-full
        lg:max-h-full
        w-full
        max-w-[1600px]
        mx-auto
        overflow-auto
        overflow-x-auto
        ">
        <ListadoProductos
          cols={['codigoBarra', 'cat', 'nombre', 'desc','size', 'stock','precioActual', 'imagen']}
        />
      </div>
        
        
        
      </Suspense>
    </section>
  );
};
export default PageVerProductos;

