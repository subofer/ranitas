import { NextResponse } from 'next/server'
import buscarCuitOnline from '@/lib/buscarCuitOnline'

/**
 * POST - Buscar datos de un CUIT en internet
 */
export async function POST(req) {
  try {
    const { cuit } = await req.json()
    
    if (!cuit) {
      return NextResponse.json(
        { ok: false, error: 'CUIT es requerido' },
        { status: 400 }
      )
    }

    console.log('🔍 Buscando CUIT en internet:', cuit)
    
    const resultados = await buscarCuitOnline(cuit)
    
    return NextResponse.json({ 
      ok: true, 
      resultados 
    })

  } catch (error) {
    console.error('❌ Error buscando CUIT:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Error al buscar el CUIT' },
      { status: 500 }
    )
  }
}
