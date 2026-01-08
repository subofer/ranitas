import { Suspense } from 'react'
import Pagelogin from './pageLogin'

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando login...</div>}>
      <Pagelogin />
    </Suspense>
  )
}