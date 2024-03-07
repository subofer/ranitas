import { CargarCategoria } from '../components/formularios/CargarCategoria'

export default function Home() {
  const fecha = new Date().toISOString().split('T')[0]
  return (
    <main className='container w-full max-w-full'>
      <CargarCategoria/>
    </main>
  )
}
