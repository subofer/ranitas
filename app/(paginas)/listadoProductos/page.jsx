"use server"
import { Suspense } from 'react';
import ListadoProductos from "@/app/components/productos/ListadoProductos"

const PageVerProductos = async () => {

  return (
    <main className='w-screen container flex flex-col flex-grow  h-screen overflow-hidden'>
      <Suspense fallback={<ListadoProductos suspense />}>
        <ListadoProductos/>
      </Suspense>
    </main>
  );
};
export default PageVerProductos;

