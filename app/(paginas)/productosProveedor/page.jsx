"use client"
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getProveedoresSelect } from '@/prisma/consultas/proveedores';

const SelectProveedorClient = dynamic(() => import('@/components/proveedores/SelectProveedorClient'), { ssr: false });
const ProductosProveedorPanel = dynamic(() => import('@/components/proveedores/ProductosProveedorPanel'), { ssr: false });
const TodosProductosPanel = dynamic(() => import('@/components/proveedores/TodosProductosPanel'), { ssr: false });

export default function ClientPage() {
  const [proveedor, setProveedor] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activePanel, setActivePanel] = useState('productosProveedor'); // 'productosProveedor' o 'todosProductos'
  const router = useRouter();
  const searchParams = useSearchParams();

  // Callbacks para navegación entre paneles
  const switchToRight = useCallback(() => setActivePanel('todosProductos'), []);
  const switchToLeft = useCallback(() => setActivePanel('productosProveedor'), []);

  // Cargar proveedores al montar el componente
  useEffect(() => {
    const cargarProveedores = async () => {
      try {
        const proveedoresData = await getProveedoresSelect();
        setProveedores(proveedoresData || []);
      } catch (error) {
        console.error('Error cargando proveedores:', error);
      }
    };
    cargarProveedores();
  }, []);

  // Leer proveedor de la URL al cargar
  useEffect(() => {
    const proveedorId = searchParams.get('proveedor');
    if (proveedorId && proveedores.length > 0) {
      const proveedorFromUrl = proveedores.find(p => p.id === proveedorId);
      if (proveedorFromUrl) {
        setProveedor(proveedorFromUrl);
      } else {
        // Si el proveedor de la URL no existe, limpiar la URL
        router.replace('/productosProveedor');
      }
    }
  }, [searchParams, proveedores, router]);

  const handleProveedorSelection = ({ option }) => {
    const nuevoProveedor = option || null;
    setProveedor(nuevoProveedor);
    
    // Actualizar la URL
    if (nuevoProveedor) {
      router.push(`/productosProveedor?proveedor=${nuevoProveedor.id}`);
    } else {
      router.push('/productosProveedor');
    }
  };

  const handleRefreshProductosProveedor = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Productos por Proveedor</h1>
          <p className="text-gray-600">Administra los productos asociados a cada proveedor</p>
        </div>

        <div className="mb-6">
          <SelectProveedorClient 
            value={proveedor} 
            onChange={handleProveedorSelection} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`transition-all duration-200 ${activePanel === 'productosProveedor' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
            <ProductosProveedorPanel 
              proveedor={proveedor} 
              refreshTrigger={refreshTrigger}
              isActive={activePanel === 'productosProveedor'}
              onSwitchRight={switchToRight}
              onSwitchLeft={switchToLeft}
            />
          </div>
          <div className={`transition-all duration-200 ${activePanel === 'todosProductos' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
            <TodosProductosPanel 
              proveedor={proveedor} 
              onProductoAgregado={handleRefreshProductosProveedor}
              isActive={activePanel === 'todosProductos'}
              onSwitchLeft={switchToLeft}
              onSwitchRight={switchToRight}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
