"use client";
import { useErrorNotification } from '@/hooks/useErrorNotification';
import ErrorNotification from '@/components/ui/ErrorNotification';

export default function NotificationRenderer() {
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
}

