"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import Button from '../formComponents/Button';
import { getTiposPresentacion } from '@/prisma/serverActions/tiposPresentacion';
import { abrirPresentacion as abrirPresentacionServer, cerrarPresentacion as cerrarPresentacionServer, producirPresentacion as producirPresentacionServer } from '@/prisma/serverActions/productos';
import ProveedoresPresentacionPanel from './ProveedoresPresentacionPanel';
import Icon from '../formComponents/Icon';

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
  conProfundidad.sort((a, b) => a._profundidad - b._profundidad);
  return conProfundidad;
};

export const GestionPresentaciones = ({ 
  presentaciones = [], 
  onChange,
  sizeProducto = '',
  unidadProducto = '',
}) => {
  const [tiposPresentacion, setTiposPresentacion] = useState([]);
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [mostrarFormNueva, setMostrarFormNueva] = useState(false);
  const [nuevaPresentacion, setNuevaPresentacion] = useState({
    tipoPresentacionId: '',
    precio: '',
    descuento: 0,
    esUnidadBase: false,
    contieneId: '',
    contieneCantidad: 1,
    codigoBarra: '',
  });

  useEffect(() => {
    getTiposPresentacion().then(({ error, data }) => {
      if (!error) setTiposPresentacion(data || []);
    });
  }, []);

  const presentacionesOrdenadas = useMemo(() => ordenarJerarquicamente(presentaciones), [presentaciones]);

  const tamañoProducto = useMemo(() => {
    const parts = [sizeProducto, unidadProducto].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '(sin tamaño)';
  }, [sizeProducto, unidadProducto]);

  // Calcular stock en términos de la unidad base
  const calcularStockEnBase = useCallback((presentacion) => {
    if (presentacion.esUnidadBase) return null; // La base no necesita conversión
    
    const eq = presentacion._equivalencia || presentacion.contenedoras?.[0];
    if (!eq) return null;
    
    const cantidad = eq.contieneCantidad || eq.cantidad || 1;
    const stock = presentacion.stock?.stockCerrado ?? 0;
    
    return stock * cantidad;
  }, []);

  // Calcular suma total de reserva (todas las presentaciones no base convertidas a unidad base)
  const calcularReservaTotal = useCallback(() => {
    return presentaciones
      .filter(p => !p.esUnidadBase)
      .reduce((total, p) => {
        const eq = p._equivalencia || p.contenedoras?.[0];
        if (!eq) return total;
        const cantidad = eq.contieneCantidad || eq.cantidad || 1;
        const stock = p.stock?.stockCerrado ?? 0;
        return total + (stock * cantidad);
      }, 0);
  }, [presentaciones]);

  const eliminarPresentacion = (id) => {
    onChange(presentaciones.filter((p) => p.id !== id));
  };

  const actualizarPresentacion = (id, campo, valor) => {
    onChange(presentaciones.map((p) => p.id !== id ? p : { ...p, [campo]: valor }));
  };

  const setBase = (id) => {
    onChange(presentaciones.map((p) => ({ ...p, esUnidadBase: p.id === id })));
  };

  const abrirPresentacion = async (id) => {
    const presentacion = presentaciones.find(p => p.id === id);
    if (!presentacion?.id || presentacion.id.startsWith('__temp__')) {
      alert('Debes guardar el producto primero antes de realizar operaciones de stock');
      return;
    }

    const result = await abrirPresentacionServer(id);
    if (result.error) {
      alert(result.msg);
    } else {
      // Recargar presentaciones desde el servidor
      window.location.reload();
    }
  };

  const cerrarPresentacion = async (id) => {
    const presentacion = presentaciones.find(p => p.id === id);
    if (!presentacion?.id || presentacion.id.startsWith('__temp__')) {
      alert('Debes guardar el producto primero antes de realizar operaciones de stock');
      return;
    }

    const result = await cerrarPresentacionServer(id);
    if (result.error) {
      alert(result.msg);
    } else {
      // Recargar presentaciones desde el servidor
      window.location.reload();
    }
  };

  const producirBase = async (id) => {
    const presentacion = presentaciones.find(p => p.id === id);
    if (!presentacion?.id || presentacion.id.startsWith('__temp__')) {
      alert('Debes guardar el producto primero antes de realizar operaciones de stock');
      return;
    }

    const cantidadProducir = prompt('¿Cuántas unidades deseas producir?', '1');
    if (!cantidadProducir || isNaN(cantidadProducir) || Number(cantidadProducir) <= 0) return;
    
    const cantidad = Number(cantidadProducir);
    const result = await producirPresentacionServer(id, cantidad);
    
    if (result.error) {
      alert(result.msg);
    } else {
      // Recargar presentaciones desde el servidor
      window.location.reload();
    }
  };

  const agregarPresentacion = () => {
    if (!nuevaPresentacion.tipoPresentacionId) return;
    if (!nuevaPresentacion.esUnidadBase && presentaciones.length > 0 && !nuevaPresentacion.contieneId) return;

    const newId = Date.now().toString();
    const esBase = presentaciones.length === 0 ? true : Boolean(nuevaPresentacion.esUnidadBase);

    const nueva = {
      id: newId,
      ...nuevaPresentacion,
      nombre: '',
      esUnidadBase: esBase,
      _equivalencia: esBase ? null : {
        contieneId: nuevaPresentacion.contieneId,
        contieneCantidad: Number(nuevaPresentacion.contieneCantidad) || 1,
      },
    };

    let actualizadas = [...presentaciones, nueva];
    if (esBase) {
      actualizadas = actualizadas.map((p) => ({ ...p, esUnidadBase: p.id === newId }));
    }
    onChange(actualizadas);

    setNuevaPresentacion({
      tipoPresentacionId: '',
      precio: '',
      descuento: 0,
      esUnidadBase: false,
      contieneId: '',
      contieneCantidad: 1,
      codigoBarra: '',
    });
    setMostrarFormNueva(false);
  };

  const copiarFila = useCallback((p) => {
    const tipo = tiposPresentacion.find(t => t.id === p.tipoPresentacionId)?.nombre || 'Presentación';
    const texto = [tipo, p.precio ? '$' + p.precio : '', p.descuento ? '-' + p.descuento + '%' : ''].filter(Boolean).join(' | ');
    navigator.clipboard?.writeText(texto);
  }, [tiposPresentacion]);

  const inputClass = 'px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 text-sm focus:outline-none focus:border-blue-400';
  const thClass = 'px-2 py-2 text-left text-xs font-semibold text-gray-600';
  const tdClass = 'px-2 py-2';

  const getNombreTipo = (tipoId) => tiposPresentacion.find(t => t.id === tipoId)?.nombre || '';

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icono="box" className="text-gray-500" />
          <h3 className="font-semibold text-gray-800">Presentaciones</h3>
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
            {presentaciones.length}
          </span>
        </div>
        <Button
          tipo="nuevo"
          onClick={() => setMostrarFormNueva(!mostrarFormNueva)}
          className="py-1 px-3 text-sm"
        >
          {mostrarFormNueva ? 'Cancelar' : '+ Agregar'}
        </Button>
      </div>

      {/* Formulario para agregar nueva presentación */}
      {mostrarFormNueva && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
              <select
                value={nuevaPresentacion.tipoPresentacionId}
                onChange={(e) => setNuevaPresentacion(p => ({ ...p, tipoPresentacionId: e.target.value }))}
                className={inputClass + ' w-full'}
              >
                <option value="">Seleccionar...</option>
                {tiposPresentacion.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {presentaciones.length === 0 ? 'Será la base' : 'Contiene'}
              </label>
              {presentaciones.length === 0 || nuevaPresentacion.esUnidadBase ? (
                <div className="flex items-center gap-2 h-[34px]">
                  <input
                    type="checkbox"
                    checked={nuevaPresentacion.esUnidadBase || presentaciones.length === 0}
                    onChange={(e) => setNuevaPresentacion(p => ({ ...p, esUnidadBase: e.target.checked }))}
                    disabled={presentaciones.length === 0}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">Es unidad base</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    value={nuevaPresentacion.contieneCantidad}
                    onChange={(e) => setNuevaPresentacion(p => ({ ...p, contieneCantidad: Number(e.target.value) || 1 }))}
                    className={inputClass + ' w-14 text-right'}
                  />
                  <span className="text-gray-400">×</span>
                  <select
                    value={nuevaPresentacion.contieneId}
                    onChange={(e) => setNuevaPresentacion(p => ({ ...p, contieneId: e.target.value }))}
                    className={inputClass + ' flex-1'}
                  >
                    <option value="">Seleccionar...</option>
                    {presentaciones.map(x => (
                      <option key={x.id} value={x.id}>
                        {getNombreTipo(x.tipoPresentacionId) || 'Pres'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={nuevaPresentacion.precio}
                onChange={(e) => setNuevaPresentacion(p => ({ ...p, precio: e.target.value }))}
                className={inputClass + ' w-full text-right'}
                placeholder="Opcional"
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Desc%</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={nuevaPresentacion.descuento}
                  onChange={(e) => setNuevaPresentacion(p => ({ ...p, descuento: e.target.value }))}
                  className={inputClass + ' w-full text-right'}
                />
              </div>
              <Button
                tipo="enviar"
                onClick={agregarPresentacion}
                disabled={!nuevaPresentacion.tipoPresentacionId || (!nuevaPresentacion.esUnidadBase && presentaciones.length > 0 && !nuevaPresentacion.contieneId)}
                className="py-1 px-4"
              >
                Agregar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        {presentaciones.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">
            No hay presentaciones. Agregá la primera que será la unidad base.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className={thClass} style={{width: '40px'}}>Base</th>
                <th className={thClass}>Tipo</th>
                <th className={thClass}>Contiene</th>
                <th className={thClass} style={{width: '90px'}}>Precio</th>
                <th className={thClass} style={{width: '70px'}}>Desc%</th>
                <th className={thClass} style={{width: '70px'}}>Stock</th>
                <th className={thClass} style={{width: '70px'}}>Equiv.</th>
                <th className={thClass} style={{width: '100px'}}>Código</th>
                <th className={thClass} style={{width: '120px'}}>Operaciones</th>
                <th className={thClass} style={{width: '40px'}}></th>
              </tr>
            </thead>
            <tbody>
              {presentacionesOrdenadas.map((p) => {
                const eq = p._equivalencia || p.contenedoras?.[0];
                const contieneId = eq?.contieneId || eq?.presentacionContenidaId || '';
                const contieneCantidad = eq?.contieneCantidad || eq?.cantidad || 1;
                const esSeleccionada = filaSeleccionada === p.id;
                const profundidad = p._profundidad || 0;
                const presentacionesDisponibles = presentaciones.filter(x => x.id !== p.id);

                return (
                  <tr 
                    key={p.id}
                    className={"border-b cursor-pointer transition-colors " + (esSeleccionada ? 'bg-blue-50' : 'hover:bg-gray-50')}
                    onClick={() => setFilaSeleccionada(p.id)}
                    onDoubleClick={() => copiarFila(p)}
                  >
                    <td className={tdClass}>
                      <input
                        type="radio"
                        name="pres_base"
                        checked={Boolean(p.esUnidadBase)}
                        onChange={() => setBase(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className={tdClass} style={{ paddingLeft: (8 + profundidad * 12) + 'px' }}>
                      <select
                        value={p.tipoPresentacionId || ''}
                        onChange={(e) => actualizarPresentacion(p.id, 'tipoPresentacionId', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={inputClass + ' w-full'}
                      >
                        <option value="">Tipo...</option>
                        {tiposPresentacion.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className={tdClass}>
                      {p.esUnidadBase ? (
                        <span className="text-xs text-gray-600 font-medium">{tamañoProducto}</span>
                      ) : (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min="1"
                            value={contieneCantidad}
                            onChange={(e) => actualizarPresentacion(p.id, '_equivalencia', {
                              contieneId,
                              contieneCantidad: Number(e.target.value) || 1,
                            })}
                            className={inputClass + ' w-12 text-right'}
                          />
                          <span className="text-gray-400">×</span>
                          <select
                            value={contieneId}
                            onChange={(e) => actualizarPresentacion(p.id, '_equivalencia', {
                              contieneId: e.target.value,
                              contieneCantidad,
                            })}
                            className={inputClass + ' flex-1'}
                          >
                            <option value="">...</option>
                            {presentacionesDisponibles.map(x => (
                              <option key={x.id} value={x.id}>
                                {getNombreTipo(x.tipoPresentacionId) || 'Pres'}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </td>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={p.precio ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+(\.\d*)?$/.test(val)) {
                            actualizarPresentacion(p.id, 'precio', val === '' ? 0 : Number(val));
                          }
                        }}
                        className={inputClass + ' w-full text-right'}
                        placeholder="0"
                      />
                    </td>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={p.descuento ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+(\.\d*)?$/.test(val)) {
                            const numVal = val === '' ? 0 : Number(val);
                            if (numVal >= 0 && numVal <= 100) {
                              actualizarPresentacion(p.id, 'descuento', numVal);
                            }
                          }
                        }}
                        className={inputClass + ' w-full text-center'}
                        placeholder="0"
                      />
                    </td>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={p.stock?.stockCerrado ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+$/.test(val)) {
                            actualizarPresentacion(p.id, 'stock', { stockCerrado: val === '' ? 0 : Number(val) });
                          }
                        }}
                        className={inputClass + ' w-full text-center'}
                        placeholder="0"
                        title="Stock cerrado"
                      />
                    </td>
                    <td className={tdClass}>
                      {p.esUnidadBase ? (
                        <div className="text-sm text-purple-600 text-center font-bold" title="Suma total de reserva en otras presentaciones">
                          {calcularReservaTotal()}
                        </div>
                      ) : calcularStockEnBase(p) !== null ? (
                        <div className="text-sm text-gray-600 text-center font-medium">
                          {calcularStockEnBase(p)}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 text-center">—</div>
                      )}
                    </td>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                      <input
                        value={p.codigoBarra || ''}
                        onChange={(e) => actualizarPresentacion(p.id, 'codigoBarra', e.target.value)}
                        className={inputClass + ' w-full font-mono text-xs'}
                        placeholder={p.esUnidadBase ? '(= producto)' : '—'}
                      />
                    </td>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 text-xs">
                        {(p._equivalencia?.contieneId || p.contenedoras?.[0]) && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); abrirPresentacion(p.id); }}
                            className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
                            title="Abrir/desempacar 1 unidad"
                          >
                            Abrir
                          </button>
                        )}
                        {!p.esUnidadBase && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); cerrarPresentacion(p.id); }}
                            className="bg-green-50 text-green-700 px-2 py-0.5 rounded hover:bg-green-100 transition-colors"
                            title="Cerrar/empacar 1 unidad"
                          >
                            Cerrar
                          </button>
                        )}
                        {p.esUnidadBase && (
                          <label className="flex items-center gap-1 text-xs cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={p.puedeProducir ?? false}
                              onChange={(e) => actualizarPresentacion(p.id, 'puedeProducir', e.target.checked)}
                              className="w-3 h-3"
                            />
                            <span>Producible</span>
                          </label>
                        )}
                        {p.esUnidadBase && p.puedeProducir && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); producirBase(p.id); }}
                            className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded hover:bg-purple-100 transition-colors"
                            title="Producir unidades"
                          >
                            Producir
                          </button>
                        )}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <button
                        onClick={(e) => { e.stopPropagation(); eliminarPresentacion(p.id); }}
                        className="p-1 text-gray-400 hover:text-red-500"
                        type="button"
                      >
                        <Icon icono="eliminar" className="text-xs" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <p className="mt-3 text-xs text-gray-500">
          <b>Base</b> = unidad suelta ({tamañoProducto}). Las demás contienen X unidades de otra presentación.
        </p>
      </div>

      <ProveedoresPresentacionPanel presentaciones={presentaciones} />
    </div>
  );
};

export default GestionPresentaciones;
