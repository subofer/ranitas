"use client"
import { useState } from 'react';
import Input from '../formComponents/Input';
import Button from '../formComponents/Button';
import SelectTipoPresentacion from './SelectTipoPresentacion';
import Icon from '../formComponents/Icon';

export const GestionPresentaciones = ({ presentaciones = [], onChange }) => {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevaPresentacion, setNuevaPresentacion] = useState({
    nombre: '',
    tipoPresentacionId: '',
    cantidad: 1,
    unidadMedida: '',
    contenidoPorUnidad: '',
    unidadContenido: ''
  });

  const agregarPresentacion = () => {
    if (nuevaPresentacion.nombre && nuevaPresentacion.tipoPresentacionId) {
      const presentacionesActualizadas = [...presentaciones, {
        id: Date.now().toString(), // ID temporal
        ...nuevaPresentacion
      }];
      onChange(presentacionesActualizadas);
      setNuevaPresentacion({
        nombre: '',
        tipoPresentacionId: '',
        cantidad: 1,
        unidadMedida: '',
        contenidoPorUnidad: '',
        unidadContenido: ''
      });
      setMostrarFormulario(false);
    }
  };

  const eliminarPresentacion = (id) => {
    const presentacionesActualizadas = presentaciones.filter(p => p.id !== id);
    onChange(presentacionesActualizadas);
  };

  const actualizarPresentacion = (id, campo, valor) => {
    const presentacionesActualizadas = presentaciones.map(p =>
      p.id === id ? { ...p, [campo]: valor } : p
    );
    onChange(presentacionesActualizadas);
  };

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

      <div className="p-6 space-y-4">
        {/* Lista de presentaciones existentes */}
        {presentaciones.length > 0 ? (
          <div className="space-y-3">
            {presentaciones.map((presentacion, index) => (
              <div
                key={presentacion.id}
                className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
              >
                {/* Número de presentación */}
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>

                {/* Header con nombre y eliminar */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-lg">{presentacion.nombre}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {presentacion.cantidad} {presentacion.unidadMedida}
                      </span>
                      {presentacion.contenidoPorUnidad && (
                        <span className="text-sm text-gray-600">
                          ({presentacion.contenidoPorUnidad} {presentacion.unidadContenido} c/u)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => eliminarPresentacion(presentacion.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Eliminar presentación"
                  >
                    <Icon icono="eliminar" className="text-sm" />
                  </button>
                </div>

                {/* Campos editables en grid responsive */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Tipo</label>
                    <SelectTipoPresentacion
                      value={presentacion.tipoPresentacionId}
                      onChange={({ value }) => actualizarPresentacion(presentacion.id, 'tipoPresentacionId', value)}
                      className="text-sm"
                    />
                  </div>

                  <Input
                    label="Cantidad"
                    type="number"
                    value={presentacion.cantidad}
                    onChange={({ value }) => actualizarPresentacion(presentacion.id, 'cantidad', parseFloat(value) || 1)}
                    className="text-sm"
                  />

                  <Input
                    label="Unidad"
                    value={presentacion.unidadMedida}
                    onChange={({ value }) => actualizarPresentacion(presentacion.id, 'unidadMedida', value)}
                    className="text-sm"
                  />

                  <Input
                    label="Contenido x unidad"
                    type="number"
                    value={presentacion.contenidoPorUnidad}
                    onChange={({ value }) => actualizarPresentacion(presentacion.id, 'contenidoPorUnidad', value)}
                    className="text-sm"
                  />

                  <Input
                    label="Unidad contenido"
                    value={presentacion.unidadContenido}
                    onChange={({ value }) => actualizarPresentacion(presentacion.id, 'unidadContenido', value)}
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Icon icono="box" className="text-4xl mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No hay presentaciones</p>
            <p className="text-sm">Agrega la primera presentación para este producto</p>
          </div>
        )}

        {/* Botón para mostrar/ocultar formulario */}
        {!mostrarFormulario ? (
          <div className="text-center pt-4">
            <button
              onClick={() => setMostrarFormulario(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              <Icon icono="plus" className="mr-2 text-sm" />
              Agregar presentación
            </button>
          </div>
        ) : (
          /* Formulario para nueva presentación */
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Nueva presentación</h4>
              <button
                onClick={() => setMostrarFormulario(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Icon icono="times" className="text-lg" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Input
                label="Nombre de la presentación"
                value={nuevaPresentacion.nombre}
                onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, nombre: value }))}
                placeholder="Ej: Caja x 12 unidades"
                required
              />

              <SelectTipoPresentacion
                label="Tipo de presentación"
                value={nuevaPresentacion.tipoPresentacionId}
                onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, tipoPresentacionId: value }))}
                required
              />

              <Input
                label="Cantidad"
                type="number"
                value={nuevaPresentacion.cantidad}
                onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, cantidad: parseFloat(value) || 1 }))}
                placeholder="1"
                min="1"
              />

              <Input
                label="Unidad de medida"
                value={nuevaPresentacion.unidadMedida}
                onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, unidadMedida: value }))}
                placeholder="unidades, kg, litros..."
              />

              <Input
                label="Contenido por unidad"
                type="number"
                value={nuevaPresentacion.contenidoPorUnidad}
                onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, contenidoPorUnidad: value }))}
                placeholder="500"
                step="0.01"
              />

              <Input
                label="Unidad de contenido"
                value={nuevaPresentacion.unidadContenido}
                onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, unidadContenido: value }))}
                placeholder="gr, ml, kg..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                tipo="neutro"
                onClick={() => setMostrarFormulario(false)}
              >
                Cancelar
              </Button>
              <Button
                tipo="enviar"
                onClick={agregarPresentacion}
                disabled={!nuevaPresentacion.nombre || !nuevaPresentacion.tipoPresentacionId}
              >
                <Icon icono="plus" className="mr-2" />
                Agregar presentación
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionPresentaciones;
