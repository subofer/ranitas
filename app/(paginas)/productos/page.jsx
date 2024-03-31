"use server"
import { Suspense } from 'react';
import ListadoProductos from "@/app/components/productos/ListadoProductos"
import { CargaProductoBuscadorClient } from "@/app/components/formularios/CargaProductoBuscadorClient"
import { getCategorias } from "@/prisma/consultas/categorias"
import FallbackComponent from '@/app/components/Fallback/FallbackComponent';

/*

export default async function PageCargarProductos() {
  const categorias = await getCategorias()
  return (
    <main className='container flex flex-col gap-4 w-full max-w-full h-screen overflow-hidden'>
      <CargaProductoBuscadorClient categorias={categorias}/>
      <ListadoProductos/>
    </main>
  )
}
*/




const PageCargarProductos = async () => {
  const categorias = await getCategorias();

  return (
    <main className='container flex flex-col gap-4 w-full max-w-full h-screen overflow-hidden'>
      <Suspense fallback={<FallbackComponent />}>
        <CargaProductoBuscadorClient categorias={categorias}/>
      </Suspense>
      <Suspense fallback={<FallbackComponent />}>
        <ListadoProductos/>
      </Suspense>
    </main>
  );
};

export default PageCargarProductos;
