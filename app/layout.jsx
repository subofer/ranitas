import './globals.css'
import AiProviderClient from '@/components/ai/AiProviderClient'
import { ThemeProvider } from '@/context/ThemeContext'

export const metadata = {
  title: 'Sistema de Gestión - Las Ranitas',
  description: 'Sistema completo de gestión de productos e inventario',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />
      </head>
      <body>
        <ThemeProvider>
          <AiProviderClient>
            {children}
          </AiProviderClient>
        </ThemeProvider>
      </body>
    </html>
  )
}
