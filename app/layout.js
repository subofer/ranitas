import './globals.css'
import NavBar from './components/Navegacion/NavBar'

export const metadata = {
  title: 'Gestion Productos',
  description: 'Gestion de productos',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="bg-neutral-200">
      <body className="w-screen h-screen flex flex-row">
        <NavBar className='w-64 h-screen'/>
        <div className='px-6 pt-6 w-full overflow-y-auto scroll-custom'>
          {children}
        </div>
      </body>
    </html>
  )
}
