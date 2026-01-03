"use client"

import { useState, useEffect } from 'react';
import { getProductos } from '@/prisma/consultas/productos';
import TablaListaProductos from './TablaListaProductos';

const ListadoProductos = ({cols, ...props}) => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  const columnas = cols || ['eliminar', 'cat', 'nombre', 'desc','size', 'precioActual','stock', 'imagen', 'agregarPedido', 'edit']

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const productosData = await getProductos();
        setProductos(productosData);
      } catch (error) {
        console.error('Error cargando productos:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarProductos();
  }, []);

  if (loading) {
    return (
      <div className='w-full mx-auto flex justify-center items-center p-8'>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Cargando productos...</span>
      </div>
    );
  }

  if (!productos || productos.length === 0) {
    return (
      <div className='w-full mx-auto text-center p-8'>
        <div className="text-gray-500 mb-2">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No hay productos registrados</h3>
        <p className="text-gray-500">Comienza creando tu primer producto usando el formulario de arriba.</p>
      </div>
    );
  }

  return (
    <TablaListaProductos
      columnas={columnas}
      productos={productos}
      tipo={"filtro"}
      {...props}
    />
  )
};

export default ListadoProductos;
