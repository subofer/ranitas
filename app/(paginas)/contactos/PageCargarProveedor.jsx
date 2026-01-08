"use client"
import CargarContacto from '@/components/contactos/CargarContacto'
import ListadoContactos from '@/components/contactos/ListadoContactos'

export default function PageCargarProveedor() {
  return (
    <main className='flex flex-col gap-5 container w-full max-w-full'>
      <CargarContacto/>
      <ListadoContactos className="w-1/3"/>
    </main>
  )
}