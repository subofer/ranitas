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
    <html lang="es" className="bg-neutral-200 w-screen h-screen">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />
      </head>
      <body className={`flex ${vertical? "flex-row": "flex-col"} w-screen h-full min-w-[800px] overflow-hidden`}>
        {vertical ? <NavBarVertical className='flex w-fit '/> : <NavBarHorizontal className='flex w-fit '/>}
        <main className='pt-10 flex flex-col h-screen w-full p-2'>
            {children}
        </main>

      </body>
    </html>
  );
}
