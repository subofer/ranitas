import NavBar from '../components/Navegacion/NavBar'
import './globals.css'

export const metadata = {
  title: 'Gestion Productos',
  description: 'Gestion de productos',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="bg-neutral-200">
      <head>
        {/* Agrego iconos de Font Awesome */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />
      </head>
      <body className="flex w-screen h-screen min-w-[900px]">
        <NavBar className='flex w-fit md:w-64 md:h-screen h-screen'/>
        <div className='flex-grow overflow-y-auto scroll-custom px-4 pt-2 min-w-[500px]'>
          {children}
        </div>
      </body>
    </html>
  );
}
