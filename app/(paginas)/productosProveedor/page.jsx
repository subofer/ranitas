"use client"
import { Suspense, useEffect, useState } from 'react';
import SelectProveedorClient from '@/components/proveedores/SelectProveedorClient';
import ProductosPorProveedorServer from '@/components/productos/ProductosPorProveedorServer';
import EditarCodigoForm from '@/components/formComponents/EditarCodigoForm';

export default function ClientPage() {
  const [proveedor, setProveedor] = useState(null);

  const handleProveedorSelection = ({ option }) => setProveedor(option)

  return (
    <div>
      <h1>Seleccioná un Proveedor</h1>
      <SelectProveedorClient onChange={handleProveedorSelection} />

      <div> {proveedor?.id} </div>
      <div> {proveedor?.nombre} </div>

      {proveedor?.id && (
        <ProductosPorProveedorServer proveedorId={proveedor.id} />
      )}
    </div>
  );
}
