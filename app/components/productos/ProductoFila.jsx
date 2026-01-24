import { useMemo, useState } from 'react';
import Icon from '../formComponents/Icon';
import BotonAgregarPedido from '../pedidos/BotonAgregarPedido';
import Link from 'next/link';

/**
 * Ordena presentaciones jerárquicamente: base primero, luego por cadena de contenido
 */
const ordenarJerarquicamente = (presentaciones) => {
  if (!presentaciones || presentaciones.length === 0) return [];
  const base = presentaciones.find(p => p.esUnidadBase);
  if (!base) return presentaciones;

  const contieneMap = new Map();
  for (const p of presentaciones) {
    const eq = p._equivalencia || p.contenedoras?.[0];
    if (eq) {
      const contieneId = eq.contieneId || eq.presentacionContenidaId;
      if (contieneId) contieneMap.set(p.id, contieneId);
    }
  }

  const calcularProfundidad = (id, visitados = new Set()) => {
    if (id === base.id) return 0;
    if (visitados.has(id)) return 999;
    visitados.add(id);
    const contieneId = contieneMap.get(id);
    if (!contieneId) return 1;
    return 1 + calcularProfundidad(contieneId, visitados);
  };

  const conProfundidad = presentaciones.map(p => ({
    ...p,
    _profundidad: calcularProfundidad(p.id),
  }));
  // Ordenar de menor a mayor profundidad (menor equivalencia primero)
  conProfundidad.sort((a, b) => a._profundidad - b._profundidad);
  return conProfundidad;
};

const ProductoFila = ({
  producto,
  editable,
  marcasOptions,
  categoriasOptions,
  tiposPresentacionOptions,
  editsProductos,
  editsPresentaciones,
  searchFields,
  mostrarCodigo,
  columnasVisibles,
  onSetProductoEdit,
  onSetPresentacionEdit,
  onAgregarPresentacion,
  onEliminarPresentacion,
  onAbrirCaja,
  onCerrarCaja,
  onProducir,
  activeRowId,
  onSetActiveRowId,
  onEliminarProducto,
  onToggleSeleccion,
  esSeleccionado,
  focusedRowId,
  onSetFocused, // setProductoFocused(rowId)
  onKeyDown,
  calcularStockEquivalente,
  calcularFactorAUnidadBase,
  presentacionSeleccionadaPorProducto,
  onSetPresentacionSeleccionada,
  // Nuevas props para selección por-presentación
  presentacionesSeleccionadasMap,
  onTogglePresentacion,
  filaProductoRef,
}) => {
  const productoId = producto?.id;
  const esNuevo = String(productoId || '').startsWith('__new__');
  const editActual = (editsProductos && productoId && editsProductos[productoId]) ? editsProductos[productoId] : {};

  const cols = columnasVisibles || {
    codigo: Boolean(mostrarCodigo),
    categoria: true,
    tamano: true,
    precio: true,
    descuento: true,
    stock: true,
  };

  const showCodigo = Boolean(mostrarCodigo) && Boolean(cols.codigo);
  const showCategoria = Boolean(cols.categoria);
  const showTamano = Boolean(cols.tamano);
  const showPrecio = Boolean(cols.precio);
  const showDescuento = Boolean(cols.descuento);
  const showStock = Boolean(cols.stock);

  const filaActiva = activeRowId === productoId;
  const esFilaProductoFocused = focusedRowId === productoId;

  // Mantener igualdad de estilos con las filas de presentaciones cuando la fila está seleccionada
  const bgProducto = filaActiva ? 'bg-blue-200' : (esFilaProductoFocused ? 'bg-blue-200' : (esSeleccionado ? 'bg-blue-50' : ''));

  const valorNombre = editActual?.nombre ?? producto?.nombre ?? '';
  const valorCodigo = editActual?.codigoBarra ?? producto?.codigoBarra ?? '';
  const valorDescripcion = editActual?.descripcion ?? producto?.descripcion ?? '';
  const valorSize = editActual?.size ?? producto?.size ?? '';
  const valorUnidad = editActual?.unidad ?? producto?.unidad ?? '';
  const valorStockSuelto = editActual?.stockSuelto ?? producto?.stockSuelto ?? '';
  const valorMarcaId = editActual?.marcaId ?? producto?.marcaId ?? producto?.marca?.id ?? '';
  const valorCategoriaId = editActual?.categoriaId ?? producto?.categorias?.[0]?.id ?? '';
  const valorPrecio = editActual?.precio ?? producto?.precios?.[0]?.precio ?? '';

  const valorSizeStr = valorSize === null || valorSize === undefined ? '' : String(valorSize);
  const valorUnidadStr = valorUnidad === null || valorUnidad === undefined ? '' : String(valorUnidad);
  const valorStockSueltoStr = valorStockSuelto === null || valorStockSuelto === undefined ? '' : String(valorStockSuelto);
  const valorPrecioStr = valorPrecio === null || valorPrecio === undefined ? '' : String(valorPrecio);

  const productoParaPedido = useMemo(() => {
    // Para productos nuevos sin ID real, no permitir pedir.
    if (esNuevo) return null;
    return producto;
  }, [esNuevo, producto]);

  const { stockSuelto, equivalenteDesdePresentaciones, totalEquivalente, baseId } = calcularStockEquivalente(producto);
  const presentaciones = Array.isArray(producto.presentaciones) ? producto.presentaciones : [];
  // Solo mostramos presentaciones NO base - la base se muestra en el renglón principal
  const presentacionesNoBase = presentaciones.filter((p) => p?.id && p.id !== baseId);
  const basePresentacion = baseId ? presentaciones.find((p) => p?.id === baseId) : null;
  // Ordenar jerárquicamente las presentaciones no-base
  const presentacionesOrdenadas = ordenarJerarquicamente(presentacionesNoBase);

  const formatearPresentacion = (p) => {
    if (!p) return '';
    const tipo = p?.tipoPresentacion?.nombre || 'Presentación';
    const cantidad = p?.cantidad != null ? String(p.cantidad) : '';
    const unidad = p?.unidadMedida || '';
    const tamaño = [cantidad, unidad].filter(Boolean).join(' ');
    return [tipo, tamaño].filter(Boolean).join(' ');
  };

  const [nuevaPresTipoId, setNuevaPresTipoId] = useState('');
  const [nuevaPresCantidad, setNuevaPresCantidad] = useState('1');
  const [nuevaPresUnidad, setNuevaPresUnidad] = useState('');
  const [nuevaPresEsBase, setNuevaPresEsBase] = useState(false);
  const [nuevaPresEquivId, setNuevaPresEquivId] = useState('');
  const [nuevaPresEquivCantidad, setNuevaPresEquivCantidad] = useState('');
  const [nuevaPresPrecio, setNuevaPresPrecio] = useState('');
  const [nuevaPresDescuento, setNuevaPresDescuento] = useState('');
  const [nuevaPresCodigo, setNuevaPresCodigo] = useState('');

  const setRefProducto = (el) => {
    if (!filaProductoRef) return;
    if (!filaProductoRef.current) filaProductoRef.current = {};
    if (!productoId) return;
    filaProductoRef.current[productoId] = el;
  };

  const setCampo = (patch) => {
    if (!productoId) return;
    onSetProductoEdit?.((prev) => {
      const next = { ...(prev || {}) };
      const prevRow = next[productoId] || {};
      next[productoId] = { ...prevRow, ...patch };
      return next;
    });
  };

  const activarEdicionFila = (rowId) => {
    if (!editable) return;
    onSetActiveRowId?.(rowId);
  };

  const handleKeyDownFilaProducto = (e) => {
    // Entrar/salir de edición con Enter cuando la fila tiene foco.
    if (e.key === 'Enter' && editable) {
      e.preventDefault();
      onSetActiveRowId?.(filaActiva ? null : productoId);
      return;
    }
    // Escape sale de edición (sin perder foco)
    if (e.key === 'Escape' && filaActiva) {
      e.preventDefault();
      onSetActiveRowId?.(null);
      return;
    }
    onKeyDown?.(e);
  };

  const setPresentacionCampo = (presentacionId, patch) => {
    if (!presentacionId) return;
    onSetPresentacionEdit?.((prev) => {
      const next = { ...(prev || {}) };
      const prevRow = next[presentacionId] || {};
      next[presentacionId] = { ...prevRow, ...patch };
      return next;
    });
  };

  return (
    <>
      {!producto ? null :
      <>
        <tr 
          key={productoId}
          ref={setRefProducto}
          className={`group transition-colors border-b ${bgProducto ? bgProducto : 'bg-white hover:bg-blue-50'}`}
          onClick={(e) => {
            e.stopPropagation();
            onSetFocused?.(productoId);
            activarEdicionFila(productoId);

            // Asegurar foco real para seguir navegando con teclado
            requestAnimationFrame(() => {
              filaProductoRef?.current?.[productoId]?.focus?.();
            });
          }}
          tabIndex={0}
          onKeyDown={handleKeyDownFilaProducto}
          style={{ outline: 'none' }}
        >
          {/* Checkbox selección - sticky */}
          <td className={`px-3 py-2 sticky left-0 z-10 ${bgProducto ? bgProducto : 'bg-white group-hover:bg-blue-50'}`}>
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={esSeleccionado}
                onChange={() => onToggleSeleccion(productoId)}
                className="w-4 h-4 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </td>

          {/* Nombre, marca, descripción y presentación */}
          <td className="px-3 py-2 text-sm select-text">
            {!editable || !filaActiva ? (
              <div className="space-y-1">
                <div className="font-semibold text-gray-900">
                  {producto.nombre}
                  {basePresentacion && (
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      · {formatearPresentacion(basePresentacion)}
                    </span>
                  )}
                </div>
                {producto.marca && (
                  <div className="text-xs text-gray-600">
                    <span>{producto.marca?.nombre}</span>
                  </div>
                )}
                {producto.descripcion && (
                  <div className="text-xs text-gray-500 line-clamp-1">{producto.descripcion}</div>
                )}
                {presentacionesNoBase.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {presentacionesNoBase.length} presentación{presentacionesNoBase.length !== 1 ? 'es' : ''}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={valorNombre}
                  onChange={(e) => setCampo({ nombre: e.target.value })}
                  
                  
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                  placeholder="Nombre"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select
                    value={valorMarcaId || ''}
                    onChange={(e) => setCampo({ marcaId: e.target.value || null })}
                    
                    
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    title="Marca"
                  >
                    <option value="">(Sin marca)</option>
                    {(marcasOptions || []).map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>

                  <input
                    value={valorDescripcion}
                    onChange={(e) => setCampo({ descripcion: e.target.value })}
                    
                    
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    placeholder="Descripción"
                  />
                </div>
              </div>
            )}
          </td>

          {/* Código de barras */}
          {showCodigo && (
            <td className="px-3 py-2 text-sm select-text">
              {!editable || !filaActiva ? (
                <span className="text-xs text-gray-700 whitespace-nowrap">{producto.codigoBarra || '—'}</span>
              ) : (
                <input
                  value={valorCodigo}
                  onChange={(e) => setCampo({ codigoBarra: e.target.value })}
                  
                  
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                  placeholder="Código de barras"
                />
              )}
            </td>
          )}

          {/* Categoría */}
          {showCategoria && (
            <td className="px-3 py-2 text-sm select-text">
              {!editable || !filaActiva ? (
                <div className="flex flex-wrap gap-1">
                  {producto.categorias?.slice(0, 2).map((cat) => (
                    <span key={cat.id} className="text-xs text-gray-700">
                      {cat.nombre}
                    </span>
                  ))}
                  {producto.categorias?.length > 2 && (
                    <span className="text-xs text-gray-600">+{producto.categorias.length - 2}</span>
                  )}
                </div>
              ) : (
                <select
                  value={valorCategoriaId || ''}
                  onChange={(e) => setCampo({ categoriaId: e.target.value || null })}
                  
                  
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                  title="Categoría"
                >
                  <option value="">(Sin categoría)</option>
                  {(categoriasOptions || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              )}
            </td>
          )}

          {/* Tamaño */}
          {showTamano && (
            <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap select-text">
              {!editable || !filaActiva ? (
                <>{producto.size || 0} {producto.unidad}</>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={valorSizeStr}
                    onChange={(e) => setCampo({ size: e.target.value })}
                    
                    
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    placeholder="Tamaño"
                  />
                  <input
                    value={valorUnidadStr}
                    onChange={(e) => setCampo({ unidad: e.target.value })}
                    
                    
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    placeholder="Unidad"
                  />
                </div>
              )}
            </td>
          )}

          {/* Precio */}
          {showPrecio && (
            <td className="px-3 py-2 text-sm font-semibold text-green-600 whitespace-nowrap select-text">
              {!editable || !filaActiva ? (
                <>${producto.precios?.[0]?.precio?.toLocaleString() || '0'}</>
              ) : (
                <input
                  value={valorPrecioStr}
                  onChange={(e) => setCampo({ precio: e.target.value })}

                  className="w-28 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
                  placeholder="Precio"
                />
              )}
            </td>
          )}

          {/* Descuento (producto) */}
          {showDescuento && (
            <td className="px-3 py-2 text-sm text-center select-text">
              {!editable || !filaActiva ? (
                (() => {
                  const maxDesc = Math.max(0, ...(presentaciones.map((p) => Number(p.descuento || 0))));
                  return maxDesc > 0 ? (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">-{maxDesc}%</span>
                  ) : '—';
                })()
              ) : (
                <div className="text-xs text-gray-500">Edite descuentos en las presentaciones</div>
              )}
            </td>
          )}

          {/* Stock */}
          {showStock && (
            <td className="px-3 py-2 text-sm text-center select-text">
              {!editable || !filaActiva ? (
                <>
                  {(() => {
                    const suelto = Number(stockSuelto) || 0;
                    const empaquetado = Number(equivalenteDesdePresentaciones) || 0;
                    const claseSuelto = suelto <= 0 ? 'text-red-700 font-bold' : (suelto < 10 ? 'text-amber-700 font-bold' : 'text-gray-900 font-semibold');
                    const claseEmp = empaquetado <= 0 ? 'text-red-700 font-bold' : (empaquetado < 10 ? 'text-amber-700 font-bold' : 'text-gray-900 font-semibold');
                    const iconClassSuelto = suelto <= 0 ? 'text-red-600' : 'text-amber-600';
                    const iconClassEmp = empaquetado <= 0 ? 'text-red-600' : 'text-amber-600';

                    const unidadBase = basePresentacion?.unidadMedida || producto.unidad || 'u';
                    return (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 ${claseSuelto}`} title="Stock suelto (en unidades base)">
                            {suelto}
                            {suelto < 10 && <Icon icono="exclamation-triangle" className={`${iconClassSuelto} text-xs`} />}
                          </span>
                          <span className="text-gray-400"> | </span>
                          <span className={`inline-flex items-center gap-1 ${claseEmp}`} title="Stock en empaques (equiv. en unidades base)">
                            {empaquetado}
                            {empaquetado < 10 && <Icon icono="exclamation-triangle" className={`${iconClassEmp} text-xs`} />}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          = {totalEquivalente} {unidadBase}
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <input
                  value={valorStockSueltoStr}
                  onChange={(e) => setCampo({ stockSuelto: e.target.value })}

                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 text-center"
                  placeholder="Stock"
                  title="Stock suelto"
                />
              )}
            </td>
          )}

          {/* Acciones - sticky */}
          <td className={`px-3 py-2 text-sm sticky right-0 z-10 ${bgProducto ? bgProducto : 'bg-white group-hover:bg-blue-50'}`}>
            <div className="flex items-center justify-end gap-1">
              {productoParaPedido && (
                <BotonAgregarPedido
                  producto={productoParaPedido}
                  variant="outline"
                  size="xs"
                  onSuccess={() => {}}
                />
              )}

              {!esNuevo && (
                <Link
                  href={`/cargarProductos?edit=${productoId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                  title="Editar en ABM"
                >
                  <Icon icono="pencil-alt" className="text-base" />
                </Link>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEliminarProducto(producto);
                }}
                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Eliminar producto"
              >
                <Icon icono="trash-can" className="text-base" />
              </button>
            </div>
          </td>
        </tr>

          {/* Alta rápida de presentación (solo cuando editás el producto) */}
          {editable && filaActiva && !esNuevo && (
            <tr className="bg-white border-b">
              <td className="px-3 py-2 sticky left-0 bg-white z-10">
                <div className="text-xs text-gray-400 text-center">＋</div>
              </td>

              <td
                className="px-3 py-2"
                colSpan={
                  1 +
                  (showCodigo ? 1 : 0) +
                  (showCategoria ? 1 : 0) +
                  (showTamano ? 1 : 0) +
                  (showPrecio ? 1 : 0) +
                  (showDescuento ? 1 : 0) +
                  (showStock ? 1 : 0)
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={nuevaPresTipoId}
                    onChange={(e) => setNuevaPresTipoId(e.target.value)}
                    
                    
                    className="w-48 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    title="Tipo de presentación"
                  >
                    <option value="">Tipo…</option>
                    {(tiposPresentacionOptions || []).map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                  <input
                    value={nuevaPresCantidad}
                    onChange={(e) => setNuevaPresCantidad(e.target.value)}
                    
                    
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    placeholder="Cantidad"
                    title="Cantidad"
                  />
                  <input
                    value={nuevaPresUnidad}
                    onChange={(e) => setNuevaPresUnidad(e.target.value)}
                    
                    
                    className="w-28 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    placeholder="Unidad"
                    title="Unidad"
                  />
                  <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={nuevaPresEsBase}
                      disabled={Boolean(basePresentacion)}
                      onChange={(e) => setNuevaPresEsBase(e.target.checked)}
                    />
                    Base {basePresentacion ? '(ya existe)' : ''}
                  </label>
                  {!nuevaPresEsBase && (
                    <>
                      <input
                        value={nuevaPresEquivCantidad}
                        onChange={(e) => setNuevaPresEquivCantidad(e.target.value)}
                        
                        
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                        placeholder="×"
                        title="Cantidad contenida"
                      />
                      <span className="text-gray-500">×</span>
                      <select
                        value={nuevaPresEquivId}
                        onChange={(e) => setNuevaPresEquivId(e.target.value)}
                        
                        
                        className="w-36 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                        title="Equivale a"
                      >
                        <option value="">Contiene…</option>
                        {presentaciones.map((p) => (
                          <option key={p.id} value={p.id}>{p?.tipoPresentacion?.nombre || 'Pres'}</option>
                        ))}
                      </select>
                    </>
                  )}
                  <input
                    value={nuevaPresPrecio}
                    onChange={(e) => setNuevaPresPrecio(e.target.value)}
                    
                    
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    placeholder="Precio"
                    title="Precio de venta"
                  />
                  <input
                    value={nuevaPresDescuento}
                    onChange={(e) => setNuevaPresDescuento(e.target.value)}
                    
                    
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    placeholder="Desc %"
                    title="Descuento %"
                  />
                  <input
                    value={nuevaPresCodigo}
                    onChange={(e) => setNuevaPresCodigo(e.target.value)}
                    
                    
                    className="w-32 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    placeholder="Código (opc)"
                    title="Código de barras (opcional)"
                  />

                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const tipoId = (nuevaPresTipoId || (tiposPresentacionOptions?.[0]?.id ?? '')).toString();
                      if (!tipoId) return;
                      if (!nuevaPresEsBase) {
                        if (!nuevaPresEquivId) return;
                        if (!String(nuevaPresEquivCantidad || '').trim()) return;
                      }

                      await onAgregarPresentacion?.({
                        productoId,
                        tipoPresentacionId: tipoId,
                        cantidad: nuevaPresCantidad || '1',
                        unidadMedida: nuevaPresUnidad || '',
                        esUnidadBase: nuevaPresEsBase,
                        equivalenciaContenidaId: nuevaPresEsBase ? null : nuevaPresEquivId,
                        equivalenciaCantidad: nuevaPresEsBase ? null : nuevaPresEquivCantidad,
                        precio: nuevaPresPrecio,
                        descuento: nuevaPresDescuento,
                        codigoBarra: nuevaPresCodigo,
                      });

                      setNuevaPresTipoId('');
                      setNuevaPresCantidad('1');
                      setNuevaPresUnidad('');
                      setNuevaPresEsBase(false);
                      setNuevaPresEquivId('');
                      setNuevaPresEquivCantidad('');
                      setNuevaPresPrecio('');
                      setNuevaPresDescuento('');
                      setNuevaPresCodigo('');
                    }}
                    className="px-3 py-1.5 text-sm font-medium rounded bg-gray-800 text-white hover:bg-gray-900"
                    title="Agregar presentación"
                  >
                    <Icon icono="plus" className="text-sm" />
                  </button>
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Tipo y equivalencia requeridos (si no es base). Precio, descuento y código opcionales.
                </div>
              </td>

              <td className="px-3 py-2 text-sm sticky right-0 bg-white z-10" />
            </tr>
          )}

        {/* Presentaciones como renglones adicionales */}
        {presentacionesOrdenadas.map((pres) => {
          const rowId = `${productoId}::pres::${pres.id}`;
          const editPres = (editsPresentaciones && pres?.id && editsPresentaciones[pres.id]) ? editsPresentaciones[pres.id] : {};
          const stockCerrado = editPres?.stockCerrado ?? pres?.stock?.stockCerrado ?? 0;
          const precioPres = editPres?.precio ?? pres?.precio ?? '';
          const descuentoPres = editPres?.descuento ?? pres?.descuento ?? 0;
          const esBasePres = Boolean(pres?.esUnidadBase);
          const relacionActual = Array.isArray(pres?.contenedoras) ? pres.contenedoras[0] : null;
          const equivalenciaContenidaId = editPres?.equivalenciaContenidaId ?? relacionActual?.presentacionContenidaId ?? '';
          const equivalenciaCantidad = editPres?.equivalenciaCantidad ?? relacionActual?.cantidad ?? '';
          const equivalenciaRelacionId = editPres?.equivalenciaRelacionId ?? relacionActual?.id ?? null;
          const factorBase = baseId && calcularFactorAUnidadBase
            ? calcularFactorAUnidadBase(producto, pres.id, baseId)
            : null;
          const factorTexto = Number.isFinite(Number(factorBase))
            ? Number(factorBase).toLocaleString('es')
            : null;
          const filaPresActiva = activeRowId === rowId;
          const esFilaFocused = focusedRowId === rowId;
          // Selección por-presentación (permite múltiples) O compatibilidad con la selección única por producto
          const esPresSeleccionada = Boolean(presentacionesSeleccionadasMap?.[pres.id]) || presentacionSeleccionadaPorProducto?.[productoId] === pres.id;

          // Para permitir editar presentaciones tanto si la presentación está activa como si la fila del producto está en edición
          const presentacionEditable = Boolean(editable) && (filaPresActiva || filaActiva);


          return (
            <tr
              key={rowId}
              className={`transition-colors ${filaPresActiva ? 'bg-blue-50' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSetFocused?.(rowId);
                // Activar edición de presentación si corresponde
                if (editable) {
                  onSetActiveRowId?.(filaPresActiva ? null : rowId);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editable) {
                  e.preventDefault();
                  onSetActiveRowId?.(filaPresActiva ? null : rowId);
                }
                if (e.key === 'Escape' && filaPresActiva) {
                  e.preventDefault();
                  onSetActiveRowId?.(null);
                }
              }}
              tabIndex={0}
              style={{ outline: 'none' }}
            >
              <td className={`px-3 py-2 text-sm ${bgCellPres} select-text`}>
                {!presentacionEditable ? (
                  <div className="flex items-center gap-2">
                    {esBasePres && (
                      <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Base</span>
                    )}
                    <span
                      className={`text-xs ${presentacionSeleccionadaPorProducto?.[productoId] === pres.id ? 'font-semibold text-blue-900' : 'text-gray-800'}`}
                      title={presentacionSeleccionadaPorProducto?.[productoId] === pres.id ? 'Presentación seleccionada' : 'Presentación'}
                    >
                      {pres?.tipoPresentacion?.nombre || 'Presentación'}
                    </span>
                    {pres.codigoBarra && (
                      <span className="text-[10px] text-gray-400 ml-1">({pres.codigoBarra})</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={esBasePres}
                        onChange={(e) => setPresentacionCampo(pres.id, { esUnidadBase: e.target.checked })}
                        
                      />
                      Base
                    </label>
                    <select
                      value={editPres?.tipoPresentacionId ?? pres?.tipoPresentacionId ?? ''}
                      onChange={(e) => setPresentacionCampo(pres.id, { tipoPresentacionId: e.target.value })}
                      
                      
                      className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                      title="Tipo de empaque"
                    >
                      <option value="">Tipo…</option>
                      {(tiposPresentacionOptions || []).map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                    <input
                      value={editPres?.codigoBarra ?? pres?.codigoBarra ?? ''}
                      onChange={(e) => setPresentacionCampo(pres.id, { codigoBarra: e.target.value })}
                      
                      
                      className="w-32 px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                      placeholder="Código barra"
                      title="Código de barras (opcional)"
                    />
                  </div>
                )}
              </td>

              {showCodigo && (
                <td className={`px-3 py-2 text-sm ${bgCellPres}`}>
                  {/* Código de barra ahora se edita en la primera columna */}
                  <span className="text-xs text-gray-400">—</span>
                </td>
              )}

              {showCategoria && (
                <td className={`px-3 py-2 text-sm ${bgCellPres}`}>
                  {!presentacionEditable ? (
                    <div className="flex items-center gap-2">
                      {!esBasePres && equivalenciaContenidaId && (
                        <span className="text-[11px] text-gray-500">
                          {equivalenciaCantidad || 1}× {presentaciones.find(p => p.id === equivalenciaContenidaId)?.tipoPresentacion?.nombre || 'base'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {!esBasePres && (
                        <>
                          <input
                            type="number"
                            min="1"
                            value={equivalenciaCantidad || ''}
                            onChange={(e) => setPresentacionCampo(pres.id, { equivalenciaCantidad: e.target.value })}
                            
                            
                            className="w-14 px-2 py-1 border border-gray-300 rounded text-xs bg-white text-right"
                            placeholder="Cant"
                          />
                          <span className="text-gray-400">×</span>
                          <select
                            value={equivalenciaContenidaId}
                            onChange={(e) => setPresentacionCampo(pres.id, { equivalenciaContenidaId: e.target.value })}
                            
                            
                            className="px-1 py-0.5 border border-gray-300 rounded text-xs bg-white"
                          >
                            <option value="">—</option>
                            {presentaciones.filter((p) => p?.id && p.id !== pres.id).map((p) => (
                              <option key={p.id} value={p.id}>{p?.tipoPresentacion?.nombre || 'Pres'}</option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  )}
                </td>
              )}

              {showTamano && (
                <td className={`px-3 py-2 text-sm text-gray-600 whitespace-nowrap ${bgCellPres}`}>
                  {!presentacionEditable ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {pres.cantidad != null ? pres.cantidad : '—'} {pres.unidadMedida || ''}
                      </span>
                      {!esBasePres && factorTexto && (
                        <span className="text-[11px] text-gray-500">
                          = {factorTexto} {basePresentacion?.unidadMedida || 'u'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <input
                          value={editPres?.cantidad ?? pres?.cantidad ?? ''}
                          onChange={(e) => setPresentacionCampo(pres.id, { cantidad: e.target.value })}
                          
                          
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                          placeholder="Cant"
                          title="Cantidad"
                        />
                        <input
                          value={editPres?.unidadMedida ?? pres?.unidadMedida ?? ''}
                          onChange={(e) => setPresentacionCampo(pres.id, { unidadMedida: e.target.value })}
                          
                          
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                          placeholder="Unidad"
                          title="Unidad medida"
                        />
                      </div>
                      {!esBasePres && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-gray-500">Equiv:</span>
                          <input
                            value={equivalenciaCantidad === null || equivalenciaCantidad === undefined ? '' : String(equivalenciaCantidad)}
                            onChange={(e) => setPresentacionCampo(pres.id, {
                              equivalenciaCantidad: e.target.value,
                              equivalenciaRelacionId,
                            })}
                            
                            
                            className="w-14 px-1 py-0.5 border border-gray-300 rounded text-xs bg-white"
                            placeholder="×"
                            title="Cantidad contenida"
                          />
                          <span className="text-[11px] text-gray-500">×</span>
                          <select
                            value={equivalenciaContenidaId}
                            onChange={(e) => setPresentacionCampo(pres.id, {
                              equivalenciaContenidaId: e.target.value,
                              equivalenciaRelacionId,
                            })}
                            
                            
                            className="px-1 py-0.5 border border-gray-300 rounded text-xs bg-white"
                            title="Presentación contenida"
                          >
                            <option value="">—</option>
                            {presentaciones.filter((p) => p?.id && p.id !== pres.id).map((p) => (
                              <option key={p.id} value={p.id}>{p?.tipoPresentacion?.nombre || 'Pres'}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              )}

              {showPrecio && (
                <td className={`px-3 py-2 text-sm whitespace-nowrap ${bgCellPres}`}>
                  {!presentacionEditable ? (
                    <div className="flex flex-col items-start gap-1">
                      <div className="font-medium text-gray-900">
                        {pres?.precio != null && pres?.precio !== ''
                          ? <>${Number(pres.precio).toLocaleString()}</>
                          : '—'}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={precioPres === null || precioPres === undefined ? '' : String(precioPres)}
                        onChange={(e) => setPresentacionCampo(pres.id, { precio: e.target.value })}

                        className="w-28 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 text-right"
                        placeholder="Precio"
                        title="Precio presentación"
                      />
                    </div>
                  )}
                </td>
              )}

              {showDescuento && (
                <td className={`px-3 py-2 text-sm text-center ${bgCellPres}`}>
                  {!presentacionEditable ? (
                    Number(pres?.descuento || 0) > 0 ? (
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">-{Number(pres.descuento)}%</span>
                    ) : (
                      '—'
                    )
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={descuentoPres === null || descuentoPres === undefined ? '' : String(descuentoPres)}
                      onChange={(e) => setPresentacionCampo(pres.id, { descuento: e.target.value })}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-right"
                      placeholder="Desc %"
                      title="Descuento (%)"
                    />
                  )}
                </td>
              )}

              {showStock && (
                <td className={`px-3 py-2 text-sm text-center ${bgCellPres}`}>
                  {!presentacionEditable ? (
                    <div className="flex flex-col items-center">
                      <span className="font-medium text-gray-900">{stockCerrado}</span>
                      {!esBasePres && factorTexto && stockCerrado > 0 && (
                        <span className="text-[11px] text-gray-500">
                          ({stockCerrado * Number(factorBase)} {basePresentacion?.unidadMedida || 'u'})
                        </span>
                      )}
                    </div>
                  ) : (
                    <input
                      value={stockCerrado === null || stockCerrado === undefined ? '' : String(stockCerrado)}
                      onChange={(e) => setPresentacionCampo(pres.id, { stockCerrado: e.target.value })}

                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 text-center"
                      placeholder="Stock"
                      title="Stock cerrado en esta presentación"
                    />
                  )}
                </td>
              )}

              <td className={`px-3 py-2 text-sm sticky right-0 z-10 ${bgCellPres}`}>
                <div className="flex items-center justify-end gap-1">
                  {/* Botón producir solo para base */}
                  {!esNuevo && esBasePres && pres.puedeProducir && (
                    <button
                      type="button"
                      onClick={() => onProducir?.(pres.id)}
                      className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Producir unidades base"
                    >
                      <Icon icono="plus-circle" className="text-base" />
                    </button>
                  )}

                  {/* Botones abrir/cerrar siempre visibles como iconos */}
                  {!esNuevo && !esBasePres && (
                    <button
                      type="button"
                      onClick={() => onAbrirCaja?.(pres.id)}
                      className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                      title="Abrir 1 empaque (convierte a suelto)"
                    >
                      <Icon icono="box-open" className="text-base" />
                    </button>
                  )}

                  {!esNuevo && !esBasePres && (
                    <button
                      type="button"
                      onClick={() => onCerrarCaja?.(pres.id)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Cerrar 1 empaque (convierte de suelto a cerrado)"
                    >
                      <Icon icono="box" className="text-base" />
                    </button>
                  )}

                  {productoPresentacionParaPedido && (
                    <BotonAgregarPedido
                      producto={productoPresentacionParaPedido}
                      variant="outline"
                      size="xs"
                      onSuccess={() => {}}
                    />
                  )}

                  {editable && !esNuevo && (
                    <button
                      type="button"
                      onClick={() => onEliminarPresentacion?.(pres.id)}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar presentación"
                    >
                      <Icon icono="trash-can" className="text-base" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </>
    }
    </>
  );

};

export default ProductoFila;
