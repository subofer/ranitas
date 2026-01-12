"use client"

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createAuditLog } from '@/lib/actions/audit';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const notificationIdRef = useRef(0);

  /**
   * Cerrar una notificación
   */
  const closeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /**
   * Mostrar una notificación
   * @param {string} message - Mensaje
   * @param {string} type - success, error, warning, info
   * @param {number} duration - Tiempo en ms (0 = sin auto-cierre)
   * @param {Object} options - Opciones adicionales
   */
  const notify = useCallback((
    message,
    type = 'info',
    duration = 5000,
    options = {}
  ) => {
    const id = ++notificationIdRef.current;

    const notification = {
      id,
      message,
      type,
      duration,
      timestamp: new Date(),
      ...options,
    };

    setNotifications((prev) => [...prev, notification]);

    // Auto-cerrar si tiene duración
    if (duration > 0) {
      setTimeout(() => {
        closeNotification(id);
      }, duration);
    }

    return id;
  }, [closeNotification]);

  /**
   * Mostrar error y crear audit log
   * Se usa para errores graves que deben ser auditados
   */
  const notifyError = useCallback(
    async (message, options = {}) => {
      const notificationId = notify(message, 'error', options.duration || 5000, options);

      // Crear audit log en segundo plano para errores
      try {
        await createAuditLog({
          level: options.critical ? 'CRITICAL' : 'ERROR',
          category: options.category || 'UI',
          action: options.action || 'ERROR_NOTIFICATION',
          message,
          metadata: {
            notificationId,
            critical: options.critical || false,
            ...options.metadata,
          },
          path: typeof window !== 'undefined' ? window.location.pathname : '',
        });
      } catch (error) {
        console.error('Error creando audit log:', error);
      }

      return notificationId;
    },
    [notify]
  );

  /**
   * Mostrar success
   */
  const notifySuccess = useCallback(
    (message, options = {}) => {
      return notify(message, 'success', options.duration || 3000, options);
    },
    [notify]
  );

  /**
   * Mostrar warning
   */
  const notifyWarning = useCallback(
    (message, options = {}) => {
      return notify(message, 'warning', options.duration || 4000, options);
    },
    [notify]
  );

  /**
   * Mostrar info
   */
  const notifyInfo = useCallback(
    (message, options = {}) => {
      return notify(message, 'info', options.duration || 3000, options);
    },
    [notify]
  );

  /**
   * Agregar notificación con configuración avanzada (incluye acción)
   */
  const addNotification = useCallback((notificationConfig) => {
    const id = ++notificationIdRef.current;

    const notification = {
      id,
      message: notificationConfig.message,
      type: notificationConfig.type || 'info',
      duration: notificationConfig.duration || 5000,
      timestamp: new Date(),
      action: notificationConfig.action || null, // {label, onClick}
    };

    setNotifications((prev) => [...prev, notification]);

    // Auto-cerrar si tiene duración
    if (notification.duration > 0) {
      setTimeout(() => {
        closeNotification(id);
      }, notification.duration);
    }

    return id;
  }, [closeNotification]);

  const value = {
    notifications,
    notify,
    notifyError,
    notifySuccess,
    notifyWarning,
    notifyInfo,
    addNotification,
    closeNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe usarse dentro de NotificationProvider');
  }
  return context;
};
