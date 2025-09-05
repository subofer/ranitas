"use server"
import { Suspense } from 'react'
import PageVerProductos from './PageVerProductos'

export default async function Page() {
  return (
    <Suspense fallback={<div>Cargando productos...</div>}>
      <PageVerProductos />
    </Suspense>
  )
}