"use client"
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { obtenerPresentacionesPorProveedor, eliminarProveedorDePresentacion, actualizarProveedorSkuAlias } from '@/prisma/serverActions/proveedores';
import { guardarCambiosListadoProductos } from '@/prisma/serverActions/productos';
import { useNotification } from '@/context/NotificationContext';
import { textMatches } from '@/lib/textUtils';
import { confirmarEliminacion } from '@/lib/confirmDialog';
import { useListNavigation } from '@/app/hooks/useListNavigation';
import { emitPendientesUpdated } from '@/lib/pendientesEvents';
import Icon from '../formComponents/Icon';
import HighlightMatch from '../HiglightMatch';
import SearchInput from '../formComponents/SearchInput';
import ActionButton from '../formComponents/ActionButton';
import PanelContainer from '../formComponents/PanelContainer';

export default function ProductosProveedorPanel({ 
  proveedor, 
  refreshTrigger = 0, 
  isActive = false,
  onSwitchRight,
  onSwitchLeft 
}) {
  const [presentaciones, setPresentaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ nombreEnProveedor: '' });
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState({ nombre: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const { addNotification } = useNotification();
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const aliasInputRef = useRef(null);

  // Filtrar presentaciones por término de búsqueda
  const presentacionesFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return presentaciones;

    return presentaciones.filter(p => {
      if (!p?.presentacion) return false;
      return textMatches(p.presentacion.nombre, searchTerm) ||
             textMatches(p.nombreEnProveedor, searchTerm) ||
             textMatches(p.presentacion.producto?.nombre, searchTerm);
    });
  }, [presentaciones, searchTerm]);

  // Agrupar productos y sus presentaciones
  const productosAgrupados = useMemo(() => {
    const agrupados = {};
    
    presentacionesFiltradas.forEach(presentacion => {
      if (!presentacion?.presentacion?.producto?.id) return;

      const productoId = presentacion.presentacion.producto.id;
      if (!agrupados[productoId]) {
        agrupados[productoId] = {
          producto: presentacion.presentacion.producto,
          relaciones: []
        };
      }
      agrupados[productoId].relaciones.push({
        relacionId: presentacion.id,
        presentacionId: presentacion.presentacionId,
        presentacion: presentacion.presentacion,
        nombreEnProveedor: presentacion.nombreEnProveedor,
      });
    });

    return agrupados;
  }, [presentacionesFiltradas]);

  // Lista plana para navegación por teclado
  // Solo incluye items que realmente se renderizan como filas navegables
  const opcionesPlanas = useMemo(() => {
    const opciones = [];
    Object.values(productosAgrupados).forEach(grupo => {
      if (!grupo.producto?.id) return;
      
      // La fila del producto (incluye la baseRelacion visualmente pero es una sola fila)
      opciones.push({ 
        id: `prod-${grupo.producto.id}`,
        tipo: 'producto', 
        producto: grupo.producto,
        relaciones: grupo.relaciones
      });
      
      // Determinar cuál es la baseRelacion (igual que en el render)
      // Si no hay esUnidadBase, la primera es la base por defecto
      const baseRelacion = grupo.relaciones.find(r => r.presentacion?.esUnidadBase) || grupo.relaciones[0];
      const baseId = baseRelacion?.presentacionId;
      
      // Solo las relaciones que NO son la base (son las sub-filas visibles)
      const otrasRelaciones = grupo.relaciones.filter(r => r.presentacion && r.presentacionId !== baseId);
      
      otrasRelaciones.forEach(relacion => {
        if (relacion?.relacionId) {
          opciones.push({ 
            id: `rel-${relacion.relacionId}`,
            tipo: 'relacion', 
            producto: grupo.producto, 
            relacion 
          });
        }
      });
    });
    return opciones;
  }, [productosAgrupados]);

  // Cargar presentaciones
  const cargarPresentaciones = useCallback(async () => {
    if (!proveedor?.id) {
      setPresentaciones([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await obtenerPresentacionesPorProveedor(proveedor.id);
      setPresentaciones(data.presentacionesRelacionadas || []);
    } catch (error) {
      console.error('Error cargando presentaciones:', error);
      addNotification({ type: 'error', message: 'Error al cargar las presentaciones del proveedor' });
    } finally {
      setLoading(false);
    }
  }, [proveedor, addNotification]);

  // Handlers de edición de producto
  const handleEditarProducto = useCallback((producto) => {
    if (!producto?.id) return;
    setEditingProductId(producto.id);
    setEditProductForm({ nombre: producto.nombre });
  }, []);

  const handleGuardarProducto = async (productoId) => {
    try {
      await guardarCambiosListadoProductos({ productos: [{ id: productoId, nombre: editProductForm.nombre }] });
      addNotification({ type: 'success', message: 'Producto actualizado' });
      setEditingProductId(null);
      setEditProductForm({ nombre: '' });
      cargarPresentaciones();
    } catch (error) {
      console.error('Error guardando producto:', error);
      addNotification({ type: 'error', message: 'Error al actualizar el producto' });
    }
  };

  const handleCancelarProducto = () => {
    setEditingProductId(null);
    setEditProductForm({ nombre: '' });
  };

  // Handlers de edición de relación
  const handleEditar = useCallback((relacion) => {
    if (!relacion?.relacionId) return;
    setEditingId(relacion.relacionId);
    setEditForm({ nombreEnProveedor: relacion.nombreEnProveedor || '' });
  }, []);

  const handleGuardarEdicion = async (relacionId) => {
    try {
      await actualizarProveedorSkuAlias(proveedor.id, relacionId, editForm.nombreEnProveedor);
      addNotification({ type: 'success', message: 'Relación actualizada' });
      setEditingId(null);
      setEditForm({ nombreEnProveedor: '' });
      cargarPresentaciones();
      emitPendientesUpdated();
    } catch (error) {
      console.error('Error guardando edición:', error);
      addNotification({ type: 'error', message: 'Error al actualizar la relación' });
    }
  };

  const handleCancelarEdicion = () => {
    setEditingId(null);
    setEditForm({ nombreEnProveedor: '' });
  };

  useEffect(() => {
    if (!editingId) return;
    const timer = setTimeout(() => {
      aliasInputRef.current?.focus();
      aliasInputRef.current?.select?.();
    }, 0);
    return () => clearTimeout(timer);
  }, [editingId]);

  // Eliminar relación
  const handleEliminarRelacion = useCallback(async (presentacionId) => {
    const confirmado = await confirmarEliminacion('¿Eliminar esta presentación del proveedor?');
    if (!confirmado) return;

    try {
      await eliminarProveedorDePresentacion(proveedor.id, presentacionId);
      addNotification({ type: 'success', message: 'Presentación eliminada del proveedor' });
      cargarPresentaciones();
    } catch (error) {
      console.error('Error eliminando relación:', error);
      addNotification({ type: 'error', message: 'Error al eliminar la presentación' });
    }
  }, [proveedor, addNotification, cargarPresentaciones]);

  // Handler para acción principal (Enter) - editar alias
  const handleItemAction = useCallback((item) => {
    if (!item) return;
    if (item.tipo === 'producto') {
      // Para la fila del producto, editar el alias de la baseRelacion
      const baseRelacion = item.relaciones?.find(r => r.presentacion?.esUnidadBase) || item.relaciones?.[0];
      if (baseRelacion?.presentacionId) {
        handleEditar(baseRelacion);
      }
    } else if (item.tipo === 'relacion') {
      handleEditar(item.relacion);
    }
  }, [handleEditar]);

  // Handler para eliminar (Delete/Backspace)
  const handleItemDelete = useCallback(async (item) => {
    if (!item) return;
    if (item.tipo === 'producto') {
      // Para la fila del producto, eliminar la baseRelacion
      const baseRelacion = item.relaciones?.find(r => r.presentacion?.esUnidadBase) || item.relaciones?.[0];
      if (baseRelacion?.presentacionId) {
        await handleEliminarRelacion(baseRelacion.presentacionId);
      }
    } else if (item.tipo === 'relacion') {
      await handleEliminarRelacion(item.relacion.presentacionId);
    }
  }, [handleEliminarRelacion]);

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
    onDelete: handleItemDelete,
    onLeft: onSwitchLeft,
    onRight: onSwitchRight,
    containerRef,
    inputRef,
  });

  useEffect(() => {
    cargarPresentaciones();
  }, [cargarPresentaciones, refreshTrigger]);

  // Sin proveedor seleccionado
  if (!proveedor?.id) {
    return (
      <PanelContainer
        title="Productos del Proveedor"
        isEmpty
        emptyIcon="user"
        emptyMessage="Selecciona un proveedor para ver sus productos"
      />
    );
  }

  const grupos = Object.values(productosAgrupados);
  const isEmpty = presentaciones.length === 0 || (searchTerm && grupos.length === 0);

  // Función para obtener el índice de una opción en la lista plana
  const getOpcionIndex = (tipo, productoId, relacionId = null) => {
    if (tipo === 'producto') {
      return opcionesPlanas.findIndex(op => op.id === `prod-${productoId}`);
    }
    return opcionesPlanas.findIndex(op => op.id === `rel-${relacionId}`);
  };

  return (
    <PanelContainer
      title="Productos del Proveedor"
      count={grupos.length}
      countLabel={`productos, ${presentaciones.length} presentaciones`}
      loading={loading}
      loadingMessage="Cargando productos..."
      isEmpty={isEmpty}
      emptyMessage={searchTerm ? `No se encontraron productos con "${searchTerm}"` : 'No hay productos asociados a este proveedor'}
    >
      <SearchInput
        ref={inputRef}
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar productos y presentaciones..."
        className="mb-4"
      />

      <div ref={containerRef} tabIndex={-1} className="space-y-2 max-h-96 overflow-y-auto outline-none">
        {grupos.filter(g => g.producto?.id).map((grupo) => {
          const { producto, relaciones } = grupo;
          // Si no hay esUnidadBase, la primera relación es la base por defecto
          const baseRelacion = relaciones.find(r => r.presentacion?.esUnidadBase) || relaciones[0];
          const baseId = baseRelacion?.presentacionId;
          const otrasRelaciones = relaciones.filter(r => r.presentacion && r.presentacionId !== baseId);
          const isEditing = editingProductId === producto.id;
          const prodIndex = getOpcionIndex('producto', producto.id);

          return (
            <div 
              key={producto.id} 
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Fila principal */}
              <div 
                ref={(el) => registerItemRef(`prod-${producto.id}`, el)}
                onClick={() => focusOnClick(prodIndex)}
                className={`flex items-center justify-between p-3 transition-colors border-b border-gray-100 cursor-pointer ${
                  isFocused(prodIndex) ? 'bg-blue-200' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editProductForm.nombre}
                        onChange={(e) => setEditProductForm({ nombre: e.target.value })}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nombre del producto"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGuardarProducto(producto.id);
                          if (e.key === 'Escape') handleCancelarProducto();
                        }}
                      />
                      <button onClick={() => handleGuardarProducto(producto.id)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                      <button onClick={handleCancelarProducto} className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancelar</button>
                    </div>
                  ) : (
                    <h3 className="font-medium text-gray-900 truncate">
                      <HighlightMatch text={producto.nombre} filter={searchTerm} highlightClass="bg-green-200 rounded px-0.5" />
                      {baseRelacion?.presentacion && (
                        <span className="text-sm font-normal text-gray-500 ml-1">
                          - <HighlightMatch text={baseRelacion.presentacion.nombre} filter={searchTerm} highlightClass="bg-green-200 rounded px-0.5" />
                          <span className={baseRelacion.nombreEnProveedor ? "text-blue-600 ml-1" : "text-orange-600 ml-1"}>
                            ({baseRelacion.nombreEnProveedor || 's/alias'})
                          </span>
                        </span>
                      )}
                    </h3>
                  )}
                </div>
                {!isEditing && baseRelacion?.presentacionId && (
                  <div className="flex items-center space-x-1">
                    <ActionButton onClick={() => handleEditar(baseRelacion)} icon="edit" title="Editar alias" variant="primary" size="xs" />
                    <ActionButton onClick={() => handleEliminarRelacion(baseRelacion.presentacionId)} icon="trash" title="Eliminar" variant="danger" size="xs" />
                  </div>
                )}
              </div>

              {/* Sub-renglones */}
              {otrasRelaciones.filter(r => r?.presentacion).map((relacion) => {
                const relIndex = getOpcionIndex('relacion', producto.id, relacion.relacionId);
                return (
                  <div 
                    key={relacion.relacionId} 
                    ref={(el) => registerItemRef(`rel-${relacion.relacionId}`, el)}
                    onClick={() => focusOnClick(relIndex)}
                    className={`flex items-center justify-between p-3 pl-8 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer ${
                      isFocused(relIndex) ? 'bg-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800">
                        <HighlightMatch text={relacion.presentacion.nombre} filter={searchTerm} highlightClass="bg-green-200 rounded px-0.5" />
                        <span className={relacion.nombreEnProveedor ? "text-blue-600 ml-2" : "text-orange-600 ml-2"}>
                          ({relacion.nombreEnProveedor || 's/alias'})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ActionButton onClick={() => handleEditar(relacion)} icon="edit" title="Editar alias" variant="primary" size="xs" />
                      <ActionButton onClick={() => handleEliminarRelacion(relacion.presentacionId)} icon="trash" title="Eliminar" variant="danger" size="xs" />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Modal de edición */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Editar Alias del Proveedor</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre en proveedor:</label>
                <input
                  type="text"
                  ref={aliasInputRef}
                  value={editForm.nombreEnProveedor}
                  onChange={(e) => setEditForm(prev => ({ ...prev, nombreEnProveedor: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nombre específico del proveedor"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGuardarEdicion(editingId);
                    if (e.key === 'Escape') handleCancelarEdicion();
                  }}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button onClick={handleCancelarEdicion} className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancelar</button>
                <button onClick={() => handleGuardarEdicion(editingId)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PanelContainer>
  );
}
