import { CargaProductoBuscadorClient } from '../components/formularios/CargaProductoBuscadorClient'
import { CargarCategoria } from '../components/formularios/CargarCategoria'
import ListadoProductos from '../components/productos/ListadoProductos'

export default function Home() {
  const fecha = new Date().toISOString().split('T')[0]
  return (
    <main className='container w-full max-w-full'>
      <CargaProductoBuscadorClient/>
      <ListadoProductos className='w-full mt-6'/>
    </main>
  )
}

//<CargarCategoria/>