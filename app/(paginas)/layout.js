import NavBarVertical from '../components/Navegacion/NavBarVertical'
import NavBarHorizontal from '../components/Navegacion/NavBarHorizontal'
import './globals.css'

export const metadata = {
  title: 'Gestion Productos',
  description: 'Gestion de productos',
}
export default function RootLayout({ children }) {
  const vertical = false
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />
      </head>

      <body className={`
        flex
        ${vertical? "flex-row": "flex-col"}
        w-screen
        max-w-full
        max-h-screen
        min-h-screen
        lg:overflow-hidden
        `}>
        <div className={`
          sticky top-0 left-0 mb-2
          h-fit
          ${vertical? "mr-2": "mb-2"}

        `}

          style={{zIndex:99999}}
        >
          {
            vertical
              ? <NavBarVertical />
              : <NavBarHorizontal />
          }
        </div>
          <div className='flex max-h-full w-auto h-screen lg:mx-auto lg:pb-14'>
            {children}
          </div>
      </body>
    </html>
  );
}
