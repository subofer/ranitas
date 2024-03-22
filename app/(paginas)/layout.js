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
      <body className="flex flex-col md:flex-row w-screen h-screen">
        <NavBar className='w-full md:w-64 h-auto md:h-screen'/>
        <div className='px-6 pt-6 w-full overflow-y-auto scroll-custom'>
          {children}
        </div>
      </body>
    </html>
  );
}
