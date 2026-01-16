"use client"
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getAllProductosBasic } from '@/prisma/consultas/productos';
import { agregarProveedorAPresentacion } from '@/prisma/serverActions/proveedores';
import { useNotification } from '@/context/NotificationContext';
import { textMatches } from '@/lib/textUtils';
import { useListNavigation } from '@/app/hooks/useListNavigation';
import { emitPendientesUpdated } from '@/lib/pendientesEvents';
import HighlightMatch from '../HiglightMatch';
import SearchInput from '../formComponents/SearchInput';
import ActionButton from '../formComponents/ActionButton';
import PanelContainer from '../formComponents/PanelContainer';

export default function TodosProductosPanel({ 
  proveedor, 
  onProductoAgregado, 
  isActive = false,
  onSwitchLeft,
  onSwitchRight 
}) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { addNotification } = useNotification();

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Cargar productos
  const cargarProductos = useCallback(async () => {
    try {
      setLoading(true);
      const productosData = await getAllProductosBasic();
      setProductos(productosData || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
      addNotification({ type: 'error', message: 'Error al cargar los productos' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Agregar presentación al proveedor
  const handleAgregarPresentacion = useCallback(async (presentacionId) => {
    if (!proveedor?.id) {
      addNotification({ type: 'error', message: 'Selecciona un proveedor primero' });
      return;
    }

    try {
      await agregarProveedorAPresentacion(proveedor.id, presentacionId);
      addNotification({ type: 'success', message: 'Presentación agregada al proveedor' });
      onProductoAgregado?.();
      emitPendientesUpdated();
    } catch (error) {
      console.error('Error agregando presentación:', error);
      addNotification({ type: 'error', message: 'Error al agregar la presentación' });
    }
  }, [proveedor, addNotification, onProductoAgregado]);

  // Filtrar productos por búsqueda
  const productosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return productos;

    return productos.filter(producto => {
      if (!producto) return false;
      
      // Buscar en nombre del producto
      if (textMatches(producto.nombre, searchTerm)) return true;
      
      // Buscar en presentaciones
      return producto.presentaciones?.some(p => 
        textMatches(p?.nombre, searchTerm) ||
        textMatches(p?.tipoPresentacion?.nombre, searchTerm)
      );
    }).map(producto => ({
      ...producto,
      presentaciones: producto.presentaciones?.filter(p =>
        textMatches(p?.nombre, searchTerm) ||
        textMatches(p?.tipoPresentacion?.nombre, searchTerm) ||
        textMatches(producto.nombre, searchTerm)
      ) || []
    }));
  }, [productos, searchTerm]);

  // Lista plana para navegación
  const opcionesPlanas = useMemo(() => {
    const opciones = [];
    
    productosFiltrados.forEach(producto => {
      if (!producto?.presentaciones?.length) return;
      
      const presentacionBase = producto.presentaciones.find(p => p?.esUnidadBase) || producto.presentaciones[0];
      const otrasPresentaciones = producto.presentaciones.filter(p => p?.id !== presentacionBase?.id);

      // Agregar presentación base
      if (presentacionBase) {
        opciones.push({ 
          id: `base-${presentacionBase.id}`,
          tipo: 'base', 
          producto, 
          presentacion: presentacionBase 
        });
      }
      
      // Agregar otras presentaciones
      otrasPresentaciones.forEach(presentacion => {
        if (presentacion?.id) {
          opciones.push({ 
            id: `sub-${presentacion.id}`,
            tipo: 'sub', 
            producto, 
            presentacion 
          });
        }
      });
    });
    
    return opciones;
  }, [productosFiltrados]);

  // Handler para acción principal (Enter) - agregar al proveedor
  const handleItemAction = useCallback((item) => {
    if (!item?.presentacion?.id) return;
    handleAgregarPresentacion(item.presentacion.id);
  }, [handleAgregarPresentacion]);

  // Hook de navegación
  const {
    focusedIndex,
    isFocused,
    registerItemRef,
    focusOnClick,
  } = useListNavigation({
    items: opcionesPlanas,
    isActive,
    onEnter: handleItemAction,
    onLeft: onSwitchLeft,
    onRight: onSwitchRight,
    containerRef,
    inputRef,
  });

  // Función para obtener el índice de una opción
  const getOpcionIndex = (tipo, presentacionId) => {
    return opcionesPlanas.findIndex(op => op.id === `${tipo}-${presentacionId}`);
  };

  // Contar total de presentaciones
  const totalPresentaciones = useMemo(() => {
    return productosFiltrados.reduce((acc, p) => acc + (p.presentaciones?.length || 0), 0);
  }, [productosFiltrados]);

  return (
    <PanelContainer
      title="Todos los Productos"
      count={productosFiltrados.length}
      countLabel={`productos, ${totalPresentaciones} presentaciones`}
      loading={loading}
      loadingMessage="Cargando productos..."
      isEmpty={productosFiltrados.length === 0 && searchTerm}
      emptyIcon="search"
      emptyMessage={`No se encontraron productos con "${searchTerm}"`}
    >
      <SearchInput
        ref={inputRef}
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar productos..."
        className="mb-4"
      />

      <div ref={containerRef} tabIndex={-1} className="space-y-1 max-h-96 overflow-y-auto outline-none">
        {productosFiltrados.map((producto) => {
          if (!producto?.presentaciones?.length) return null;

          const presentacionBase = producto.presentaciones.find(p => p?.esUnidadBase) || producto.presentaciones[0];
          const otrasPresentaciones = producto.presentaciones.filter(p => p?.id !== presentacionBase?.id);
          const baseIndex = getOpcionIndex('base', presentacionBase?.id);

          return (
            <div key={producto.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Fila principal */}
              <div 
                ref={(el) => registerItemRef(`base-${presentacionBase?.id}`, el)}
                onClick={() => focusOnClick(baseIndex)}
                className={`flex items-center justify-between p-3 transition-colors border-b border-gray-100 cursor-pointer ${
                  isFocused(baseIndex) ? 'bg-blue-200' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    <HighlightMatch text={producto.nombre} filter={searchTerm} highlightClass="bg-green-200 rounded px-0.5" />
                    {presentacionBase && (
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        - <HighlightMatch text={presentacionBase.nombre} filter={searchTerm} highlightClass="bg-green-200 rounded px-0.5" />
                      </span>
                    )}
                  </h3>
                </div>
                <ActionButton
                  onClick={() => handleAgregarPresentacion(presentacionBase?.id)}
                  icon="plus"
                  title="Agregar al proveedor"
                  variant="primary"
                />
              </div>

              {/* Sub-renglones */}
              {otrasPresentaciones.map((presentacion) => {
                const subIndex = getOpcionIndex('sub', presentacion?.id);
                return (
                  <div 
                    key={presentacion?.id} 
                    ref={(el) => registerItemRef(`sub-${presentacion?.id}`, el)}
                    onClick={() => focusOnClick(subIndex)}
                    className={`flex items-center justify-between p-3 pl-8 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer ${
                      isFocused(subIndex) ? 'bg-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-700">
                        <HighlightMatch text={presentacion?.nombre || 'Sin nombre'} filter={searchTerm} highlightClass="bg-green-200 rounded px-0.5" />
                      </span>
                    </div>
                    <ActionButton
                      onClick={() => handleAgregarPresentacion(presentacion?.id)}
                      icon="plus"
                      title="Agregar al proveedor"
                      variant="primary"
                      size="xs"
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </PanelContainer>
  );
}
