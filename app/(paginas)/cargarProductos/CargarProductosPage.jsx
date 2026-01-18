"use client"
import { useState } from 'react'
import { CargaProductoBuscadorClient } from "@/components/formularios/CargaProductoBuscadorClient"
import ListadoProductosModerno from '@/components/productos/ListadoProductosModerno'

export default function CargarProductosPage() {
  const [recargarKey, setRecargarKey] = useState(0);

  const handleProductoGuardado = () => {
    setRecargarKey(prev => prev + 1);
  };

  return (
    <main className='min-h-screen bg-slate-50 py-4'>
      <div className='container mx-auto max-w-full px-1'>
        <div className='flex flex-col gap-4'>
          <CargaProductoBuscadorClient onSaved={handleProductoGuardado} />
          <ListadoProductosModerno 
            key={recargarKey}
            autoFoco={false} 
            mostrarCodigo={false} 
            modoCompacto={true} 
          />
        </div>
      </div>
    </main>
  )
}