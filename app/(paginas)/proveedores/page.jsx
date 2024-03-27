import CargarProveedor from '@/app/components/proveedores/CargarProveedor'
import ListadoProveedores from '@/app/components/proveedores/ListadoProveedores'

export default function PageCargarProveedor() {
  return (
    <main className='flex flex-col gap-5 container w-full max-w-full'>
      <CargarProveedor />
      <ListadoProveedores className="w-1/3"/>
    </main>
  )
}
