"use server"
import CargarProveedor from '@/app/components/proveedores/CargarProveedor'
import ListadoProveedores from '@/app/components/proveedores/ListadoProveedores'
import { getProveedores } from '@/prisma/consultas/proveedores'

export default async function PageCargarProveedor() {
  const proveedores = await getProveedores()
  return (
    <main className='flex flex-col gap-5 container w-full max-w-full'>
      <CargarProveedor proveedores={proveedores}/>
      <ListadoProveedores className="w-1/3"/>
    </main>
  )
}
