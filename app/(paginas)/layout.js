import NavBar from '../components/Navegacion/NavBar'
import './globals.css'

export const metadata = {
  title: 'Gestion Productos',
  description: 'Gestion de productos',
}
export default function RootLayout({ children }) {
  return (
    <html lang="es" className="bg-neutral-200 w-screen h-screen">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />
      </head>
      <body className="flex w-screen h-screen min-w-[800px] overflow-hidden">
        <NavBar className='flex w-fit md:w-64 h-screen'/>
        <main className='flex flex-col w-full p-4'>
            {children}
        </main>

      </body>
    </html>
  );
}
