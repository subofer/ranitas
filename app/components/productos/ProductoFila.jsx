import { useMemo, useState } from 'react';
import Icon from '../formComponents/Icon';
import BotonAgregarPedido from '../pedidos/BotonAgregarPedido';
import Link from 'next/link';

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
  activeRowId,
  onSetActiveRowId,
  onEliminarProducto,
  onToggleSeleccion,
  esSeleccionado,
  focusedRowId,
  onSetFocused, // setProductoFocused(rowId)
  onKeyDown,
  calcularStockEquivalente,
  presentacionSeleccionadaPorProducto,
  onSetPresentacionSeleccionada,
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
    stock: true,
  };

  const showCodigo = Boolean(mostrarCodigo) && Boolean(cols.codigo);
  const showCategoria = Boolean(cols.categoria);
  const showTamano = Boolean(cols.tamano);
  const showPrecio = Boolean(cols.precio);
  const showStock = Boolean(cols.stock);

  const filaActiva = activeRowId === productoId;
  const esFilaProductoFocused = focusedRowId === productoId;

  const bgProducto = filaActiva ? 'bg-blue-200' : (esFilaProductoFocused ? 'bg-blue-200' : '');
  const bgStickyProducto = bgProducto ? bgProducto : 'bg-white group-hover:bg-gray-50';

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
  const presentacionesNoBase = presentaciones.filter((p) => p?.id && p.id !== baseId);
  const basePresentacion = baseId ? presentaciones.find((p) => p?.id === baseId) : null;

  const [nuevaPresNombre, setNuevaPresNombre] = useState('');
  const [nuevaPresTipoId, setNuevaPresTipoId] = useState('');
  const [nuevaPresCantidad, setNuevaPresCantidad] = useState('1');
  const [nuevaPresUnidad, setNuevaPresUnidad] = useState('');

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

  const stopKeyPropagation = (e) => {
    e.stopPropagation();
  };

  const stopClickPropagation = (e) => {
    e.stopPropagation();
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
    !producto ? null :
    <>
      <tr 
        key={productoId}
        ref={setRefProducto}
        className={`group transition-colors border-b ${bgProducto ? bgProducto : 'hover:bg-gray-50'}`}
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
        <td className={`px-3 py-2 sticky left-0 z-10 ${bgStickyProducto}`}>
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
        <td className="px-3 py-2 text-sm">
          {!editable || !filaActiva ? (
            <div className="space-y-1">
              <div className="font-semibold text-gray-900">{producto.nombre}</div>
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
                onKeyDown={stopKeyPropagation}
                onClick={stopClickPropagation}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                placeholder="Nombre"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select
                  value={valorMarcaId || ''}
                  onChange={(e) => setCampo({ marcaId: e.target.value || null })}
                  onKeyDown={stopKeyPropagation}
                  onClick={stopClickPropagation}
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
                  onKeyDown={stopKeyPropagation}
                  onClick={stopClickPropagation}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                  placeholder="Descripción"
                />
              </div>
            </div>
          )}
        </td>

        {/* Código de barras */}
        {showCodigo && (
          <td className="px-3 py-2 text-sm">
            {!editable || !filaActiva ? (
              <span className="text-xs text-gray-700 whitespace-nowrap">{producto.codigoBarra || '—'}</span>
            ) : (
              <input
                value={valorCodigo}
                onChange={(e) => setCampo({ codigoBarra: e.target.value })}
                onKeyDown={stopKeyPropagation}
                onClick={stopClickPropagation}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                placeholder="Código de barras"
              />
            )}
          </td>
        )}

        {/* Categoría */}
        {showCategoria && (
          <td className="px-3 py-2 text-sm">
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
                onKeyDown={stopKeyPropagation}
                onClick={stopClickPropagation}
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
          <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
            {!editable || !filaActiva ? (
              <>{producto.size || 0} {producto.unidad}</>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={valorSizeStr}
                  onChange={(e) => setCampo({ size: e.target.value })}
                  onKeyDown={stopKeyPropagation}
                  onClick={stopClickPropagation}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                  placeholder="Tamaño"
                />
                <input
                  value={valorUnidadStr}
                  onChange={(e) => setCampo({ unidad: e.target.value })}
                  onKeyDown={stopKeyPropagation}
                  onClick={stopClickPropagation}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                  placeholder="Unidad"
                />
              </div>
            )}
          </td>
        )}

        {/* Precio */}
        {showPrecio && (
          <td className="px-3 py-2 text-sm font-semibold text-green-600 whitespace-nowrap">
            {!editable || !filaActiva ? (
              <>${producto.precios?.[0]?.precio?.toLocaleString() || '0'}</>
            ) : (
              <input
                value={valorPrecioStr}
                onChange={(e) => setCampo({ precio: e.target.value })}
                onKeyDown={stopKeyPropagation}
                onClick={stopClickPropagation}
                className="w-28 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
                placeholder="Precio"
              />
            )}
          </td>
        )}

        {/* Stock */}
        {showStock && (
          <td className="px-3 py-2 text-sm text-center">
            {!editable || !filaActiva ? (
              <>
                {(() => {
                  const suelto = Number(stockSuelto) || 0;
                  const empaquetado = Number(equivalenteDesdePresentaciones) || 0;
                  const claseSuelto = suelto <= 0 ? 'text-red-700 font-bold' : (suelto < 10 ? 'text-amber-700 font-bold' : 'text-gray-900 font-semibold');
                  const claseEmp = empaquetado <= 0 ? 'text-red-700 font-bold' : (empaquetado < 10 ? 'text-amber-700 font-bold' : 'text-gray-900 font-semibold');
                  const iconClassSuelto = suelto <= 0 ? 'text-red-600' : 'text-amber-600';
                  const iconClassEmp = empaquetado <= 0 ? 'text-red-600' : 'text-amber-600';

                  return (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 ${claseSuelto}`}>
                          {suelto}
                          {suelto < 10 && <Icon icono="exclamation-triangle" className={`${iconClassSuelto} text-xs`} />}
                        </span>
                        <span className="text-gray-400">/</span>
                        <span className={`inline-flex items-center gap-1 ${claseEmp}`}>
                          {empaquetado}
                          {empaquetado < 10 && <Icon icono="exclamation-triangle" className={`${iconClassEmp} text-xs`} />}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">total: {totalEquivalente}</div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <input
                value={valorStockSueltoStr}
                onChange={(e) => setCampo({ stockSuelto: e.target.value })}
                onKeyDown={stopKeyPropagation}
                onClick={stopClickPropagation}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 text-center"
                placeholder="Stock"
                title="Stock suelto"
              />
            )}
          </td>
        )}

        {/* Acciones - sticky */}
        <td className={`px-3 py-2 text-sm sticky right-0 z-10 ${bgStickyProducto}`}>
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
                (showStock ? 1 : 0)
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={nuevaPresNombre}
                  onChange={(e) => setNuevaPresNombre(e.target.value)}
                  onKeyDown={stopKeyPropagation}
                  onClick={stopClickPropagation}
                  className="w-52 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                  placeholder="Nombre presentación"
                />
                <select
                  value={nuevaPresTipoId}
                  onChange={(e) => setNuevaPresTipoId(e.target.value)}
                  onKeyDown={stopKeyPropagation}
                  onClick={stopClickPropagation}
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
                  onKeyDown={stopKeyPropagation}
                  onClick={stopClickPropagation}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                  placeholder="Cantidad"
                  title="Cantidad"
                />
                <input
                  value={nuevaPresUnidad}
                  onChange={(e) => setNuevaPresUnidad(e.target.value)}
                  onKeyDown={stopKeyPropagation}
                  onClick={stopClickPropagation}
                  className="w-28 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                  placeholder="Unidad"
                  title="Unidad"
                />

                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const tipoId = (nuevaPresTipoId || (tiposPresentacionOptions?.[0]?.id ?? '')).toString();
                    if (!nuevaPresNombre.trim()) return;
                    if (!tipoId) return;
                    if (!nuevaPresUnidad.trim()) return;

                    await onAgregarPresentacion?.({
                      productoId,
                      nombre: nuevaPresNombre,
                      tipoPresentacionId: tipoId,
                      cantidad: nuevaPresCantidad,
                      unidadMedida: nuevaPresUnidad,
                    });

                    setNuevaPresNombre('');
                    setNuevaPresTipoId('');
                    setNuevaPresCantidad('1');
                    setNuevaPresUnidad('');
                  }}
                  className="px-3 py-1.5 text-sm font-medium rounded bg-gray-800 text-white hover:bg-gray-900"
                  title="Agregar presentación"
                >
                  Agregar presentación
                </button>
              </div>

              <div className="text-xs text-gray-500 mt-1">
                Requerido: nombre, tipo, cantidad y unidad.
              </div>
            </td>

            <td className="px-3 py-2 text-sm sticky right-0 bg-white z-10" />
          </tr>
        )}

      {/* Presentaciones como renglones adicionales */}
      {presentacionesNoBase.map((pres) => {
        const rowId = `${productoId}::pres::${pres.id}`;
        const editPres = (editsPresentaciones && pres?.id && editsPresentaciones[pres.id]) ? editsPresentaciones[pres.id] : {};
        const stockCerrado = editPres?.stockCerrado ?? pres?.stock?.stockCerrado ?? 0;
        const precioPres = editPres?.precio ?? pres?.precio ?? '';
        const descuentoPres = editPres?.descuento ?? pres?.descuento ?? 0;
        const filaPresActiva = activeRowId === rowId;
        const esFilaFocused = focusedRowId === rowId;

        const bgPres = filaPresActiva ? 'bg-blue-200' : (esFilaFocused ? 'bg-blue-200' : '');
        const bgPresRow = bgPres ? bgPres : 'bg-white hover:bg-gray-50';
        const bgCellPres = bgPres ? bgPres : 'bg-white group-hover:bg-gray-50';

        const setRefPresentacion = (el) => {
          if (!filaProductoRef) return;
          if (!filaProductoRef.current) filaProductoRef.current = {};
          if (!pres?.id) return;
          filaProductoRef.current[rowId] = el;
        };

        // Para “agregar la presentación al pedido”, reusamos BotonAgregarPedido
        // pasando el mismo producto pero con nombre contextual.
        const productoPresentacionParaPedido = esNuevo ? null : {
          ...producto,
          nombre: `${producto.nombre} · ${pres.nombre}`,
        };

        return (
          <tr
            key={rowId}
            ref={setRefPresentacion}
            className={`group border-b transition-colors ${bgPresRow}`}
            tabIndex={0}
            onFocus={() => {
              onSetFocused?.(rowId);
              onSetPresentacionSeleccionada?.(productoId, pres.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && editable) {
                e.preventDefault();
                onSetActiveRowId?.(filaPresActiva ? null : rowId);
                return;
              }
              if (e.key === 'Escape' && filaPresActiva) {
                e.preventDefault();
                onSetActiveRowId?.(null);
                return;
              }
              onKeyDown?.(e);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSetFocused?.(rowId);
              onSetPresentacionSeleccionada?.(productoId, pres.id);
              activarEdicionFila(rowId);

              requestAnimationFrame(() => {
                filaProductoRef?.current?.[rowId]?.focus?.();
              });
            }}
            style={{ outline: 'none' }}
          >
            <td className={`px-3 py-2 sticky left-0 z-10 ${bgCellPres}`}> 
              <div className="text-xs text-gray-400 text-center">↳</div>
            </td>

            <td className={`px-3 py-2 text-sm ${bgCellPres}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs ${presentacionSeleccionadaPorProducto?.[productoId] === pres.id ? 'font-semibold text-blue-900' : 'text-gray-800'}`}
                  title={presentacionSeleccionadaPorProducto?.[productoId] === pres.id ? 'Presentación seleccionada' : 'Presentación'}
                >
                  {pres.nombre}
                </span>
                {pres?.tipoPresentacion?.nombre && (
                  <span className="text-xs text-gray-500">{pres.tipoPresentacion.nombre}</span>
                )}
              </div>
            </td>

            {showCodigo && (
              <td className={`px-3 py-2 text-sm ${bgCellPres}`}>
                <span className="text-xs text-gray-700 whitespace-nowrap">{pres.codigoBarra || '—'}</span>
              </td>
            )}

            {showCategoria && (
              <td className={`px-3 py-2 text-sm text-gray-500 ${bgCellPres}`}>—</td>
            )}

            {showTamano && (
              <td className={`px-3 py-2 text-sm text-gray-600 whitespace-nowrap ${bgCellPres}`}>
                {pres.cantidad != null ? pres.cantidad : '—'} {pres.unidadMedida || ''}
              </td>
            )}

            {showPrecio && (
              <td className={`px-3 py-2 text-sm whitespace-nowrap ${bgCellPres}`}>
                {!editable || !filaPresActiva ? (
                  <div className="flex flex-col items-start">
                    <div className="font-medium text-gray-900">
                      {pres?.precio != null && pres?.precio !== ''
                        ? <>${Number(pres.precio).toLocaleString()}</>
                        : '—'}
                    </div>
                    {Number(pres?.descuento) > 0 && (
                      <div className="text-xs text-gray-500">desc {Number(pres.descuento)}%</div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <input
                      value={precioPres === null || precioPres === undefined ? '' : String(precioPres)}
                      onChange={(e) => setPresentacionCampo(pres.id, { precio: e.target.value })}
                      onKeyDown={stopKeyPropagation}
                      onClick={stopClickPropagation}
                      className="w-28 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 text-right"
                      placeholder="Precio"
                      title="Precio presentación"
                    />
                    <input
                      value={descuentoPres === null || descuentoPres === undefined ? '' : String(descuentoPres)}
                      onChange={(e) => setPresentacionCampo(pres.id, { descuento: e.target.value })}
                      onKeyDown={stopKeyPropagation}
                      onClick={stopClickPropagation}
                      className="w-28 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 text-right"
                      placeholder="Desc %"
                      title="Descuento (%)"
                    />
                  </div>
                )}
              </td>
            )}

            {showStock && (
              <td className={`px-3 py-2 text-sm text-center ${bgCellPres}`}>
                {!editable || !filaPresActiva ? (
                  <div className="font-medium text-gray-900">{stockCerrado}</div>
                ) : (
                  <input
                    value={stockCerrado === null || stockCerrado === undefined ? '' : String(stockCerrado)}
                    onChange={(e) => setPresentacionCampo(pres.id, { stockCerrado: e.target.value })}
                    onKeyDown={stopKeyPropagation}
                    onClick={stopClickPropagation}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 text-center"
                    placeholder="Reserva"
                    title="Stock cerrado (reserva)"
                  />
                )}
              </td>
            )}

            <td className={`px-3 py-2 text-sm sticky right-0 z-10 ${bgCellPres}`}>
              <div className="flex items-center justify-end gap-1">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onAbrirCaja?.(pres.id);
                    }}
                    className="px-2 py-1 text-xs font-medium rounded border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                    title="Abrir 1 caja (convierte a suelto)"
                  >
                    Abrir
                  </button>
                )}

                {editable && !esNuevo && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEliminarPresentacion?.(pres.id);
                    }}
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
  );

};

export default ProductoFila;
