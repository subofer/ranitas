import NavBarHorizontal from '../components/Navegacion/NavBarHorizontal'
import './globals.css'

export const metadata = {
  title: 'Gestion Productos',
  description: 'Gestion de productos',
}

export default function RootLayout({ children }) {

  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />
      </head>
      <body className={`w-screen h-screen lg:overflow-hidden`}>
        <div
          id="modalUnico"
          className='fixed top-0 left-0 w-screen h-screen bg-black' style={{zIndex:9999}}
          hidden={true}
        >

        </div>
        <div className='mb-2' style={{zIndex:999}}>
          <NavBarHorizontal />
        </div>
        <div className={`w-screen top-0 left-0 h-fit md:h-[1800px] overflow-hidden`} >
          {children}
        </div>
      </body>
    </html>
  );
}
