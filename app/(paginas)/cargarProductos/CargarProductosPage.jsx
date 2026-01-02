"use client"
import { CargaProductoBuscadorClient } from "@/components/formularios/CargaProductoBuscadorClient"
import ListadoProductos from '@/components/productos/ListadoProductos'

export default function CargarProductosPage() {
  return (
    <main className='min-h-screen bg-slate-50 py-8'>
      <div className='container mx-auto max-w-6xl px-4'>
        <div className='flex flex-col gap-8'>
          <CargaProductoBuscadorClient />
          <ListadoProductos />
        </div>
      </div>
    </main>
  )
}