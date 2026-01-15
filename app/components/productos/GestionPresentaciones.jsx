"use client";

import { useState } from 'react';
import Button from '../formComponents/Button';
import SelectTipoPresentacion from './SelectTipoPresentacion';
import ProveedoresPresentacionPanel from './ProveedoresPresentacionPanel';
import Icon from '../formComponents/Icon';

export const GestionPresentaciones = ({ presentaciones = [], onChange }) => {
  const [nuevaPresentacion, setNuevaPresentacion] = useState({
    nombre: '',
    codigoBarra: '',
    tipoPresentacionId: '',
    cantidad: 1,
    unidadMedida: '',
    precio: '',
    descuento: 0,
    contenidoPorUnidad: '',
    unidadContenido: '',
    esUnidadBase: false,
  });

  const eliminarPresentacion = (id) => {
    const presentacionesActualizadas = presentaciones.filter((p) => p.id !== id);
    onChange(presentacionesActualizadas);
  };

  const actualizarPresentacion = (id, campo, valor) => {
    const presentacionesActualizadas = presentaciones.map((p) => {
      if (p.id !== id) return p;
      return { ...p, [campo]: valor };
    });
    onChange(presentacionesActualizadas);
  };

  const setBase = (id) => {
    const presentacionesActualizadas = presentaciones.map((p) => ({
      ...p,
      esUnidadBase: p.id === id,
    }));
    onChange(presentacionesActualizadas);
  };

  const agregarPresentacion = () => {
    if (!nuevaPresentacion.nombre || !nuevaPresentacion.tipoPresentacionId) return;

    const newId = Date.now().toString();
    const esPrimera = presentaciones.length === 0;
    const nueva = {
      id: newId,
      ...nuevaPresentacion,
      esUnidadBase: esPrimera ? true : Boolean(nuevaPresentacion.esUnidadBase),
    };

    let presentacionesActualizadas = [...presentaciones, nueva];

    if (nueva.esUnidadBase) {
      presentacionesActualizadas = presentacionesActualizadas.map((p) => ({
        ...p,
        esUnidadBase: p.id === newId,
      }));
    }

    onChange(presentacionesActualizadas);
    setNuevaPresentacion({
      nombre: '',
      codigoBarra: '',
      tipoPresentacionId: '',
      cantidad: 1,
      unidadMedida: '',
      precio: '',
      descuento: 0,
      contenidoPorUnidad: '',
      unidadContenido: '',
      esUnidadBase: false,
    });
  };

  const inputClass =
    'w-full px-2 py-1 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-0 focus:border-slate-400';
  const thClass = 'px-2 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap';
  const tdClass = 'px-2 py-2 align-top';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon icono="box" className="text-gray-600 text-lg mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Presentaciones</h2>
          </div>
          <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
            {presentaciones.length} presentación{presentaciones.length !== 1 ? 'es' : ''}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={thClass}>Base</th>
                <th className={thClass}>Nombre</th>
                <th className={thClass}>Tipo</th>
                <th className={thClass}>Cant.</th>
                <th className={thClass}>Unidad</th>
                <th className={thClass}>Precio</th>
                <th className={thClass}>Desc %</th>
                <th className={thClass}>Cont. x un</th>
                <th className={thClass}>Un. cont.</th>
                <th className={thClass}>Código barra</th>
                <th className={thClass}></th>
              </tr>
            </thead>

            <tbody className="bg-white overflow-visible">
              {presentaciones.map((presentacion) => (
                <tr key={presentacion.id} className="border-b border-gray-100">
                  <td className={tdClass}>
                    <input
                      type="radio"
                      name="presentacion_base"
                      checked={Boolean(presentacion.esUnidadBase)}
                      onChange={() => setBase(presentacion.id)}
                      className="h-4 w-4 accent-gray-700"
                      title="Unidad base (stock suelto)"
                    />
                  </td>

                  <td className={tdClass}>
                    <input
                      value={presentacion.nombre || ''}
                      onChange={(e) => actualizarPresentacion(presentacion.id, 'nombre', e.target.value)}
                      placeholder="Ej: Caja x 12"
                      className={inputClass}
                    />
                  </td>

                  <td className={tdClass}>
                    <SelectTipoPresentacion
                      value={presentacion.tipoPresentacionId}
                      onChange={({ value }) => actualizarPresentacion(presentacion.id, 'tipoPresentacionId', value)}
                      className="text-sm"
                    />
                  </td>

                  <td className={tdClass}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={presentacion.cantidad ?? ''}
                      onChange={(e) => actualizarPresentacion(presentacion.id, 'cantidad', parseFloat(e.target.value) || 1)}
                      className={inputClass + ' text-right'}
                    />
                  </td>

                  <td className={tdClass}>
                    <input
                      value={presentacion.unidadMedida || ''}
                      onChange={(e) => actualizarPresentacion(presentacion.id, 'unidadMedida', e.target.value)}
                      placeholder="un, kg, lt"
                      className={inputClass}
                    />
                  </td>

                  <td className={tdClass}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={presentacion.precio ?? ''}
                      onChange={(e) => actualizarPresentacion(presentacion.id, 'precio', e.target.value)}
                      className={inputClass + ' text-right'}
                      placeholder="(opcional)"
                    />
                  </td>

                  <td className={tdClass}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={presentacion.descuento ?? 0}
                      onChange={(e) => actualizarPresentacion(presentacion.id, 'descuento', e.target.value)}
                      className={inputClass + ' text-right'}
                      placeholder="0"
                    />
                  </td>

                  <td className={tdClass}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={presentacion.contenidoPorUnidad ?? ''}
                      onChange={(e) => actualizarPresentacion(presentacion.id, 'contenidoPorUnidad', e.target.value)}
                      className={inputClass + ' text-right'}
                    />
                  </td>

                  <td className={tdClass}>
                    <input
                      value={presentacion.unidadContenido || ''}
                      onChange={(e) => actualizarPresentacion(presentacion.id, 'unidadContenido', e.target.value)}
                      placeholder="gr, ml"
                      className={inputClass}
                    />
                  </td>

                  <td className={tdClass}>
                    <input
                      value={presentacion.codigoBarra || ''}
                      onChange={(e) => actualizarPresentacion(presentacion.id, 'codigoBarra', e.target.value)}
                      placeholder="(opcional)"
                      className={inputClass}
                    />
                  </td>

                  <td className={tdClass}>
                    <button
                      onClick={() => eliminarPresentacion(presentacion.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar presentación"
                      type="button"
                    >
                      <Icon icono="eliminar" className="text-sm" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Renglón para agregar */}
              <tr className="bg-gray-50">
                <td className={tdClass}>
                  <input
                    type="radio"
                    name="presentacion_base"
                    checked={Boolean(nuevaPresentacion.esUnidadBase)}
                    onChange={() => setNuevaPresentacion((prev) => ({ ...prev, esUnidadBase: true }))}
                    className="h-4 w-4 accent-gray-700"
                    title="Unidad base (stock suelto)"
                  />
                </td>
                <td className={tdClass}>
                  <input
                    value={nuevaPresentacion.nombre}
                    onChange={(e) => setNuevaPresentacion((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nueva presentación"
                    className={inputClass}
                  />
                </td>
                <td className={tdClass}>
                  <SelectTipoPresentacion
                    value={nuevaPresentacion.tipoPresentacionId}
                    onChange={({ value }) => setNuevaPresentacion((prev) => ({ ...prev, tipoPresentacionId: value }))}
                    className="text-sm"
                  />
                </td>
                <td className={tdClass}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={nuevaPresentacion.cantidad}
                    onChange={(e) => setNuevaPresentacion((prev) => ({ ...prev, cantidad: parseFloat(e.target.value) || 1 }))}
                    className={inputClass + ' text-right'}
                  />
                </td>
                <td className={tdClass}>
                  <input
                    value={nuevaPresentacion.unidadMedida}
                    onChange={(e) => setNuevaPresentacion((prev) => ({ ...prev, unidadMedida: e.target.value }))}
                    placeholder="un, kg, lt"
                    className={inputClass}
                  />
                </td>

                <td className={tdClass}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={nuevaPresentacion.precio}
                    onChange={(e) => setNuevaPresentacion((prev) => ({ ...prev, precio: e.target.value }))}
                    placeholder="(opcional)"
                    className={inputClass + ' text-right'}
                  />
                </td>

                <td className={tdClass}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={nuevaPresentacion.descuento}
                    onChange={(e) => setNuevaPresentacion((prev) => ({ ...prev, descuento: e.target.value }))}
                    placeholder="0"
                    className={inputClass + ' text-right'}
                  />
                </td>
                <td className={tdClass}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={nuevaPresentacion.contenidoPorUnidad}
                    onChange={(e) => setNuevaPresentacion((prev) => ({ ...prev, contenidoPorUnidad: e.target.value }))}
                    className={inputClass + ' text-right'}
                  />
                </td>
                <td className={tdClass}>
                  <input
                    value={nuevaPresentacion.unidadContenido}
                    onChange={(e) => setNuevaPresentacion((prev) => ({ ...prev, unidadContenido: e.target.value }))}
                    placeholder="gr, ml"
                    className={inputClass}
                  />
                </td>
                <td className={tdClass}>
                  <input
                    value={nuevaPresentacion.codigoBarra}
                    onChange={(e) => setNuevaPresentacion((prev) => ({ ...prev, codigoBarra: e.target.value }))}
                    placeholder="(opcional)"
                    className={inputClass}
                  />
                </td>
                <td className={tdClass}>
                  <Button
                    tipo="enviar"
                    onClick={agregarPresentacion}
                    disabled={!nuevaPresentacion.nombre || !nuevaPresentacion.tipoPresentacionId}
                    className="py-1 h-[32px] flex items-center"
                  >
                      Guardar
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-600">
          Marcá una sola presentación como <b>Base</b> (stock suelto).
        </p>
      </div>

      <ProveedoresPresentacionPanel presentaciones={presentaciones} />
    </div>
  );
};

export default GestionPresentaciones;
