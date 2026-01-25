import { NextResponse } from 'next/server'
import { getProductos } from '@/prisma/consultas/productos'

export async function GET() {
  try {
    const { productos } = await getProductos({ take: undefined })
    
    return NextResponse.json({ 
      ok: true, 
      productos 
    })
  } catch (error) {
    console.error('Error obteniendo productos:', error)
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 })
  }
}
