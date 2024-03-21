"use server"
import ListadoProductos from "@/app/components/productos/ListadoProductos"
import { CargaProductoBuscadorClient } from "@/app/components/formularios/CargaProductoBuscadorClient"
import { getCategorias } from "@/prisma/consultas/categorias"

export default async function PageCargarProductos() {
  const categorias = await getCategorias()
  return (
    <main className='container w-full max-w-full'>
      <CargaProductoBuscadorClient categorias={categorias}/>
      <ListadoProductos className='w-full mt-6'/>
    </main>
  )
}