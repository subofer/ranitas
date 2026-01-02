"use client"
import { useState } from 'react';
import Input from '../formComponents/Input';
import Button from '../formComponents/Button';
import SelectTipoPresentacion from './SelectTipoPresentacion';
import Icon from '../formComponents/Icon';

export const GestionPresentaciones = ({ presentaciones = [], onChange }) => {
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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Presentaciones</h3>

      {/* Lista de presentaciones existentes */}
      {presentaciones.map((presentacion) => (
        <div key={presentacion.id} className="border rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">{presentacion.nombre}</h4>
            <Button
              onClick={() => eliminarPresentacion(presentacion.id)}
              tipo="borrar"
              className="p-1"
            >
              <Icon icono="eliminar" className="text-xs" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Nombre"
              value={presentacion.nombre}
              onChange={({ value }) => actualizarPresentacion(presentacion.id, 'nombre', value)}
            />
            <SelectTipoPresentacion
              label="Tipo"
              value={presentacion.tipoPresentacionId}
              onChange={({ value }) => actualizarPresentacion(presentacion.id, 'tipoPresentacionId', value)}
            />
            <Input
              label="Cantidad"
              type="number"
              value={presentacion.cantidad}
              onChange={({ value }) => actualizarPresentacion(presentacion.id, 'cantidad', parseFloat(value) || 1)}
            />
            <Input
              label="Unidad de medida"
              value={presentacion.unidadMedida}
              onChange={({ value }) => actualizarPresentacion(presentacion.id, 'unidadMedida', value)}
            />
            <Input
              label="Contenido por unidad"
              type="number"
              value={presentacion.contenidoPorUnidad}
              onChange={({ value }) => actualizarPresentacion(presentacion.id, 'contenidoPorUnidad', value)}
            />
            <Input
              label="Unidad de contenido"
              value={presentacion.unidadContenido}
              onChange={({ value }) => actualizarPresentacion(presentacion.id, 'unidadContenido', value)}
            />
          </div>
        </div>
      ))}

      {/* Formulario para nueva presentación */}
      <div className="border rounded-lg p-4 space-y-2 bg-gray-50">
        <h4 className="font-medium">Agregar nueva presentación</h4>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Nombre"
            value={nuevaPresentacion.nombre}
            onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, nombre: value }))}
          />
          <SelectTipoPresentacion
            label="Tipo"
            value={nuevaPresentacion.tipoPresentacionId}
            onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, tipoPresentacionId: value }))}
          />
          <Input
            label="Cantidad"
            type="number"
            value={nuevaPresentacion.cantidad}
            onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, cantidad: parseFloat(value) || 1 }))}
          />
          <Input
            label="Unidad de medida"
            value={nuevaPresentacion.unidadMedida}
            onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, unidadMedida: value }))}
          />
          <Input
            label="Contenido por unidad"
            type="number"
            value={nuevaPresentacion.contenidoPorUnidad}
            onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, contenidoPorUnidad: value }))}
          />
          <Input
            label="Unidad de contenido"
            value={nuevaPresentacion.unidadContenido}
            onChange={({ value }) => setNuevaPresentacion(prev => ({ ...prev, unidadContenido: value }))}
          />
        </div>

        <Button
          onClick={agregarPresentacion}
          tipo="enviar"
          disabled={!nuevaPresentacion.nombre || !nuevaPresentacion.tipoPresentacionId}
        >
          Agregar presentación
        </Button>
      </div>
    </div>
  );
};

export default GestionPresentaciones;
