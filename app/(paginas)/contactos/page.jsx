import { Suspense } from 'react'
import PageCargarProveedor from './PageCargarProveedor'
import ListadoContactos from '@/app/components/contactos/ListadoContactos'

export default async function Page() {
  return (
    <Suspense fallback={<div>Cargando contactos...</div>}>
      <PageCargarProveedor />
    </Suspense>
  )
}