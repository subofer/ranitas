"use server";
import NavBarHorizontal from '../components/Navegacion/NavBarHorizontal'
import './globals.css'

export const metadata = {
  title: 'Gestion Productos',
  description: 'Gestion de productos',
}

export default async function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />
      </head>
      <body className={`flex flex-col w-screen h-screen overflow-auto pb-2`}>
        <div id="modalUnico" hidden={true} className='fixed top-0 left-0 w-screen h-screen bg-black' style={{zIndex:9999}}>
          nada
        </div>
        <NavBarHorizontal />
        <div className={`
        flex flex-col
        w-screen max-w-screen
          h-screen max-h-screen
          px-4 mx-auto
          hideScroll
          `} >
            {children}
        </div>

      </body>
    </html>
  );
}