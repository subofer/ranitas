"use client"
import { useEffect, useState } from 'react';
import { getTiposPresentacion } from '@/prisma/serverActions/tiposPresentacion';
import Select from '../formComponents/Select';

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
    value: tipo.id,
    text: tipo.nombre
  }));

  return (
    <Select
      value={value}
      onChange={onChange}
      options={opciones}
      valueField="value"
      textField="text"
      loading={loading}
      placeholder="Seleccionar tipo de presentación"
      {...props}
    />
  );
};

export default SelectTipoPresentacion;
