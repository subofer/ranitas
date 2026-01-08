"use client"
import { useState, useEffect } from 'react';
import Icon from '../formComponents/Icon';
import { useErrorNotification } from '@/hooks/useErrorNotification';

const ErrorNotification = ({ message, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Esperar la animación de fade out
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message);
      // Podríamos mostrar un toast de "copiado" aquí
    } catch (error) {
      console.error('Error copiando al portapapeles:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon icono="exclamation-triangle" className="text-red-400 text-lg" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Error
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p className="break-words">{message}</p>
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={copyToClipboard}
              className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded transition-colors"
              title="Copiar error al portapapeles"
            >
              <Icon icono="copy" className="text-xs mr-1 inline" />
              Copiar
            </button>
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook para manejar notificaciones de error

// Componente contenedor que usa el context
export const ErrorNotificationContainer = () => {
  const { notifications, closeError } = useErrorNotification();

  return (
    <>
      {notifications.map((notification) => (
        <ErrorNotification
          key={notification.id}
          message={notification.message}
          duration={notification.duration}
          onClose={() => closeError(notification.id)}
        />
      ))}
    </>
  );
};


export default ErrorNotification;
