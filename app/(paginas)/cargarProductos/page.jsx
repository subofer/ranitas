"use server"
import { Suspense } from 'react'
import CargarProductosPage from './CargarProductosPage'

export default async function Page() {
  return (
    <Suspense fallback={<div>Cargando formulario...</div>}>
      <CargarProductosPage />
    </Suspense>
  )
}