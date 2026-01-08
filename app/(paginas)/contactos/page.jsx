import { Suspense } from 'react'
import PageCargarProveedor from './PageCargarProveedor'

export default async function Page() {
  return (
    <Suspense fallback={<div>Cargando contactos...</div>}>
      <PageCargarProveedor />
    </Suspense>
  )
}