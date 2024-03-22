import React, { useEffect } from 'react';

const Toast = ({
  titulo = '',
  texto = '',
  posicion = 'top-right', // top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right
  duracion = 3000, // Duración en milisegundos antes de que el Toast desaparezca
  onClose = () => {}, // Función para ejecutar cuando el Toast se cierra
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duracion);

    return () => clearTimeout(timer);
  }, [duracion, onClose]);

  const posiciones = {
    'top-left': 'top-0 left-0',
    'top-center': 'top-0 left-1/2 transform -translate-x-1/2',
    'top-right': 'top-0 right-0',
    'center-left': 'top-1/2 left-0 transform -translate-y-1/2',
    'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
    'center-right': 'top-1/2 right-0 transform -translate-y-1/2',
    'bottom-left': 'bottom-0 left-0',
    'bottom-center': 'bottom-0 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-0 right-0',
  };

  return (
    <div className={`fixed ${posiciones[posicion]} m-4 max-w-xs w-full bg-black bg-opacity-75 text-white p-4 rounded-lg shadow-lg z-50`}>
      {titulo && <div className="font-bold">{titulo}</div>}
      {texto && <div>{texto}</div>}
    </div>
  );
};

export default Toast;
