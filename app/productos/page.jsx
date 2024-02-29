import { CargaProducto } from '../components/productos/CargaProducto'
import ListadoProductos from '../components/productos/ListadoProductos'

export default function Home() {
  const fecha = new Date().toISOString().split('T')[0]
  return (
    <main className='container w-full max-w-full'>
      <CargaProducto/>
      <ListadoProductos className='w-full mt-6'/>
    </main>
  )
}
