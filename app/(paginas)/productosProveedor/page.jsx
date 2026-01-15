"use client"
import { Suspense, useEffect, useState } from 'react';
import SelectProveedorClient from '@/components/proveedores/SelectProveedorClient';
import ProductosProveedorPanel from '@/components/proveedores/ProductosProveedorPanel';
import TodosProductosPanel from '@/components/proveedores/TodosProductosPanel';

export default function ClientPage() {
  const [proveedor, setProveedor] = useState(null);

  const handleProveedorSelection = ({ option }) => setProveedor(option)

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Productos por Proveedor</h1>
          <p className="text-gray-600">Administra los productos asociados a cada proveedor</p>
        </div>

        <div className="mb-6">
          <SelectProveedorClient onChange={handleProveedorSelection} />
        </div>

        {proveedor?.id && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProductosProveedorPanel proveedor={proveedor} />
            <TodosProductosPanel proveedor={proveedor} />
          </div>
        )}
      </div>
    </main>
  );
}
