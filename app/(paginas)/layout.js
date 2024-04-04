//import NavBar from '../components/Navegacion/NavBar'
import NavBar from '../components/Navegacion/NavBarHorizontal'
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
      <body className="flex flex-col w-screen h-full min-w-[800px] overflow-hidden">
        <NavBar className='flex w-fit '/>
        <main className='pt-10 flex flex-col h-screen w-full p-2'>
            {children}
        </main>

      </body>
    </html>
  );
}
