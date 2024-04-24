"use server"
import CargarContacto from '@/app/components/contactos/CargarContacto'
import ListadoContactos from '@/app/components/contactos/ListadoContactos'

export default async function PageCargarProveedor() {
  return (
    <main className='flex flex-col gap-5 container w-full max-w-full'>
      <CargarContacto/>
      <ListadoContactos className="w-1/3"/>
    </main>
  )
}
