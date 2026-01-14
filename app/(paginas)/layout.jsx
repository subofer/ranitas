import NavBarHorizontal from '@/components/Navegacion/NavBarHorizontal'
import { ErrorNotificationProvider } from '@/hooks/useErrorNotification'
import NotificationRenderer from '@/components/ui/NotificationRenderer'
import NotificationProviderClient from '@/components/NotificationProviderClient'
import NotificationPanel from '@/components/ui/NotificationPanel'

export default async function Layout({ children }) {
  return (
    <NotificationProviderClient>
      <ErrorNotificationProvider>
        <div className={`flex flex-col w-full h-full overflow-x-hidden pb-2`}>
          <div id="modalUnico" hidden={true} className='fixed top-0 left-0 w-screen h-screen bg-black' style={{zIndex:9999}}>
            nada
          </div>
          <NavBarHorizontal />
          <div className={`
          flex flex-col flex-1
          w-full max-w-full
            px-2 mx-auto
            pt-10
            overflow-y-auto
            `} >
              {children}
          </div>
          <NotificationRenderer />
          <NotificationPanel />
        </div>
      </ErrorNotificationProvider>
    </NotificationProviderClient>
  );
}