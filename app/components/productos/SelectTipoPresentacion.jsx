"use client"
import { useEffect, useState } from 'react';
import { getTiposPresentacion } from '@/prisma/serverActions/tiposPresentacion';
import FilterSelect from '../formComponents/FilterSelect';

export const SelectTipoPresentacion = ({ value, onChange, ...props }) => {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarTipos = async () => {
      try {
        const { error, data } = await getTiposPresentacion();
        if (!error) {
          setTipos(data);
        }
      } catch (error) {
        console.error('Error cargando tipos de presentación:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarTipos();
  }, []);

  const opciones = tipos.map(tipo => ({
    id: tipo.id,
    nombre: tipo.nombre
  }));

  return (
    <div className="relative w-full">
      <FilterSelect
        value={value}
        onChange={onChange}
        options={opciones}
        valueField="id"
        textField="nombre"
        loading={loading}
        placeholder="Buscar tipo de empaque..."
        compact={true}
        {...props}
      />
    </div>
  );
};

export default SelectTipoPresentacion;
