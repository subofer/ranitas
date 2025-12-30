import Link from "next/link"
import { Suspense } from "react"

// Componente cliente para las funciones de prueba
function TestFunctions() {
  return (
    <div className="space-y-4 p-4">
      <button
        onClick={() => console.log('Convertir ejemplo')}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Convertir (ejemplo)
      </button>
    </div>
  )
}

export default function Home() {
  return (
    <main className='flex flex-col'>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Sistema de Gestión - Las Ranitas</h1>
        <p className="mb-6 text-gray-600">
          Bienvenido al sistema de gestión de productos e inventario.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/cargarProductos"
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="font-semibold">📦 Gestionar Productos</h2>
            <p className="text-sm text-gray-600">Cargar y administrar productos</p>
          </Link>

          <Link
            href="/listadoProductos"
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="font-semibold">📋 Ver Productos</h2>
            <p className="text-sm text-gray-600">Listado completo de productos</p>
          </Link>

          <Link
            href="/contactos"
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="font-semibold">👥 Gestionar Contactos</h2>
            <p className="text-sm text-gray-600">Proveedores y clientes</p>
          </Link>

          <Link
            href="/categorias"
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="font-semibold">🏷️ Categorías</h2>
            <p className="text-sm text-gray-600">Administrar categorías</p>
          </Link>
        </div>

        <Suspense fallback={<div>Cargando...</div>}>
          <TestFunctions />
        </Suspense>
      </div>
    </main>
  )
}