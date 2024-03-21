"use client"
// FiltroTablaProductos.jsx (Client Component)
import React, { useState } from 'react';

const FiltroTablaProductos = ({ onFiltroChange }) => {
  const [filtro, setFiltro] = useState('');

  return (
    <input
      type="text"
      placeholder="Filtrar..."
      value={filtro}
      onChange={(e) => {
        setFiltro(e.target.value);
        onFiltroChange(e.target.value);
      }}
      className="input border border-gray-400 rounded"
    />
  );
};

export default FiltroTablaProductos;
