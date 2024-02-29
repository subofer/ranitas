import './globals.css'
import { Inter } from 'next/font/google'
import prisma from '../prisma/prisma'
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
        <div className='px-6 pt-6 w-full'>
          {children}
        </div>
      </body>
    </html>
  )
}
