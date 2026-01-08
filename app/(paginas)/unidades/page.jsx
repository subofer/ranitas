import ListadoCategorias from '@/components/categorias/ListadoCategorias'
import { CargarCategoria } from '@/components/formularios/CargarCategoria'

export default function PageCargarCategorias() {
  return (
    <main className='flex flex-col gap-5 container w-full max-w-full'>
      <CargarCategoria />
      <ListadoCategorias className="w-1/3"/>
    </main>
  )
}
