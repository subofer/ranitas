"use client"

import { useNotification } from '@/context/NotificationContext';
import Icon from '@/components/formComponents/Icon';

const notificationStyles = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'check-circle',
    iconColor: 'text-green-600',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'exclamation-circle',
    iconColor: 'text-red-600',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'exclamation-triangle',
    iconColor: 'text-yellow-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'info-circle',
    iconColor: 'text-blue-600',
  },
};

function NotificationItem({ notification, onClose }) {
  const style = notificationStyles[notification.type] || notificationStyles.info;

  return (
    <div
      className={`
        ${style.bg} ${style.border}
        border rounded-lg shadow-md p-4 mb-3
        flex items-start gap-3
        animate-fadeIn
        max-w-md
      `}
      role="alert"
    >
      <Icon
        icono={style.icon}
        className={`${style.iconColor} flex-shrink-0 mt-0.5`}
      />
      <div className="flex-1">
        <p className={`${style.text} text-sm font-medium`}>
          {notification.message}
        </p>
        {notification.action && (
          <button
            onClick={() => {
              notification.action.onClick();
              onClose(notification.id);
            }}
            className={`${style.text} hover:opacity-75 transition mt-2 text-xs font-semibold underline`}
          >
            {notification.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(notification.id)}
        className={`${style.text} hover:opacity-75 transition flex-shrink-0`}
        aria-label="Cerrar notificación"
      >
        <Icon icono="times" className="text-lg" />
      </button>
    </div>
  );
}

export default function NotificationPanel() {
  const { notifications, closeNotification } = useNotification();

  return (
    <div
      className="fixed top-4 right-4 z-50 max-h-screen overflow-y-auto"
      style={{ maxWidth: '400px' }}
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={closeNotification}
        />
      ))}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
