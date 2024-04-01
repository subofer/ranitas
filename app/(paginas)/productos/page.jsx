"use server"
import { Suspense } from 'react';
import ListadoProductos from "@/app/components/productos/ListadoProductos"
import { CargaProductoBuscadorClient } from "@/app/components/formularios/CargaProductoBuscadorClient"
import { getCategorias } from "@/prisma/consultas/categorias"

const PageCargarProductos = async () => {
  const categorias = await getCategorias();

  return (
    <main className='container flex flex-col gap-4 w-full max-w-full h-screen overflow-hidden'>
      <CargaProductoBuscadorClient categorias={categorias}/>
      <Suspense fallback={<ListadoProductos suspense />}>
        <ListadoProductos/>
      </Suspense>
    </main>
  );
};
export default PageCargarProductos;

