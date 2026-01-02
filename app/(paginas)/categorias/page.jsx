import ListadoCategorias from '@/components/categorias/ListadoCategorias'
import { CargarCategoria } from '@/components/formularios/CargarCategoria'

export default function PageCargarCategorias() {
  return (
    <main className='flex flex-col gap-5 container w-full max-w-full mx-auto'>
      <div className='mx-auto'>

      <CargarCategoria />
      </div>
      <div className='w-[600px] mx-auto'>
        <ListadoCategorias/>
      </div>
    </main>
  )
}
