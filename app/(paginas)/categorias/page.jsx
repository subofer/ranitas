"use client"
import { useRef } from 'react';
import ListadoCategorias from '@/components/categorias/ListadoCategorias'
import { CargarCategoria } from '@/components/formularios/CargarCategoria'

export default function PageCargarCategorias() {
  const listadoRef = useRef();

  const handleCategoriaCreated = () => {
    // Recargar el listado cuando se crea una nueva categoría
    if (listadoRef.current && listadoRef.current.cargarCategorias) {
      listadoRef.current.cargarCategorias();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Categorías</h1>
          <p className="text-gray-600">Administra las categorías de productos del sistema</p>
        </div>

        <div className="space-y-6">
          <CargarCategoria onCategoriaCreated={handleCategoriaCreated} />
          <ListadoCategorias ref={listadoRef} />
        </div>
      </div>
    </main>
  )
}
