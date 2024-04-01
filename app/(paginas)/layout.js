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
      <body className="flex w-screen h-screen min-w-[1024px] overflow-hidden">
        <NavBar className='flex w-fit md:w-64 md:h-screen h-screen'/>
        <main className='flex flex-col p-4'>
            {children}
        </main>

      </body>
    </html>
  );
}
