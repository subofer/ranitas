"use server"
import { CargaProductoBuscadorClient } from "@/app/components/formularios/CargaProductoBuscadorClient"
import ListadoProductos from "@/app/components/productos/ListadoProductos"

export default async function PageCargarProductos() {
  return (
    <main className='container w-full max-w-full'>
      <CargaProductoBuscadorClient/>
      <ListadoProductos className='w-full mt-6'/>
    </main>
  )
}