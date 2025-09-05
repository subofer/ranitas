"use client"
import { CargaProductoBuscadorClient } from "@/app/components/formularios/CargaProductoBuscadorClient"
import ListadoProductos from '@/app/components/productos/ListadoProductos'

export default function CargarProductosPage() {
  return (
    <main className='flex flex-col gap-5 container w-full max-w-full'>
      <CargaProductoBuscadorClient />
      <ListadoProductos className="w-1/3" />
    </main>
  )
}