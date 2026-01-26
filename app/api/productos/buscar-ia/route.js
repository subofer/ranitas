import { NextResponse } from 'next/server'
import { buscarProductoConIA } from '@/lib/ia/buscarProductoConIA'

/**
 * API para buscar información de productos usando IA
 * POST /api/productos/buscar-ia
 */
export async function POST(req) {
  try {
    const body = await req.json()
    const { nombre, marca, codigoBarras, descripcion } = body
    
    if (!nombre) {
      return NextResponse.json(
        { ok: false, error: 'El nombre del producto es requerido' },
        { status: 400 }
      )
    }
    
    const resultado = await buscarProductoConIA({
      nombre,
      marca,
      codigoBarras,
      descripcion
    })
    
    return NextResponse.json({ ok: true, data: resultado })
    
  } catch (error) {
    console.error('❌ Error en API buscar-ia:', error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }
}
