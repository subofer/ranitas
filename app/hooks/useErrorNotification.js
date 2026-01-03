"use client"
import { createContext, useContext, useState } from 'react';

const ErrorNotificationContext = createContext();

export const ErrorNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showError = (message, duration = 5000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }

    return id;
  };

  const closeError = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <ErrorNotificationContext.Provider value={{ showError, closeError, notifications }}>
      {children}
    </ErrorNotificationContext.Provider>
  );
};

export const useErrorNotification = () => {
  const context = useContext(ErrorNotificationContext);
  if (!context) {
    throw new Error('useErrorNotification must be used within an ErrorNotificationProvider');
  }
  return context;
};
