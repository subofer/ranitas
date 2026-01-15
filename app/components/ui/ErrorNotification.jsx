"use client"
import { useState, useEffect } from 'react';
import Icon from '../formComponents/Icon';
import { useErrorNotification } from '@/hooks/useErrorNotification';

const getStyleByType = (type) => {
  switch (type) {
    case 'success':
      return {
        container: 'bg-green-50 border-green-200',
        icono: 'check-circle',
        iconClass: 'text-green-500',
        title: 'Éxito',
        titleText: 'text-green-800',
        bodyText: 'text-green-700',
        copyBtn: 'bg-green-100 hover:bg-green-200 text-green-800',
      };
    case 'info':
      return {
        container: 'bg-blue-50 border-blue-200',
        icono: 'circle-info',
        iconClass: 'text-blue-500',
        title: 'Info',
        titleText: 'text-blue-800',
        bodyText: 'text-blue-700',
        copyBtn: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
      };
    case 'error':
    default:
      return {
        container: 'bg-red-50 border-red-200',
        icono: 'exclamation-triangle',
        iconClass: 'text-red-400',
        title: 'Error',
        titleText: 'text-red-800',
        bodyText: 'text-red-700',
        copyBtn: 'bg-red-100 hover:bg-red-200 text-red-800',
      };
  }
};

const ErrorNotification = ({ message, onClose, duration = 5000, type = 'error' }) => {
  const [isVisible, setIsVisible] = useState(true);
  const styles = getStyleByType(type);

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
      className={`fixed top-4 right-4 z-50 max-w-md border rounded-lg p-4 shadow-lg transition-all duration-300 ${styles.container} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon icono={styles.icono} className={`${styles.iconClass} text-lg`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${styles.titleText}`}>
            {styles.title}
          </h3>
          <div className={`mt-2 text-sm ${styles.bodyText}`}>
            <p className="break-words">{message}</p>
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={copyToClipboard}
              className={`text-xs px-2 py-1 rounded transition-colors ${styles.copyBtn}`}
              title="Copiar al portapapeles"
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
          type={notification.type || 'error'}
          onClose={() => closeError(notification.id)}
        />
      ))}
    </>
  );
};


export default ErrorNotification;
