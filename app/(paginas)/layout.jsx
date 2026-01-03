import NavBarHorizontal from '@/components/Navegacion/NavBarHorizontal'
import { ErrorNotificationProvider, useErrorNotification } from '@/hooks/useErrorNotification'
import ErrorNotification from '@/components/ui/ErrorNotification'

function NotificationRenderer() {
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
}

export default async function Layout({ children }) {
  return (
    <ErrorNotificationProvider>
      <div className={`flex flex-col w-screen min-h-screen`}>
        <div id="modalUnico" hidden={true} className='fixed top-0 left-0 w-screen h-screen bg-black' style={{zIndex:9999}}>
          nada
        </div>
        <NavBarHorizontal />
        <div className={`
        flex flex-col flex-1
        w-screen max-w-screen
          px-4 mx-auto
          hideScroll
          `} >
            {children}
        </div>
        <NotificationRenderer />
      </div>
    </ErrorNotificationProvider>
  );
}