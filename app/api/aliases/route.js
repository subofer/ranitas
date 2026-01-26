import { NextResponse } from 'next/server'
import { crearAliasContacto } from '@/prisma/serverActions/aliasActions'

/**
 * POST - Crear un alias para un contacto existente
 * Body: { contactoId, alias, fuente, observaciones }
 */
export async function POST(req) {
  try {
    const data = await req.json()
    const { contactoId, alias, fuente = 'MANUAL', observaciones } = data

    if (!contactoId || !alias || !alias.trim()) {
      return NextResponse.json({ ok: false, error: 'contactoId y alias son requeridos' }, { status: 400 })
    }

    // Invocar la acción del server que valida y crea el alias
    const resultado = await crearAliasContacto({ contactoId, alias: alias.trim(), fuente, observaciones })

    if (!resultado || !resultado.alias) {
      return NextResponse.json({ ok: false, error: resultado.error || 'No se pudo crear alias' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, alias: resultado.alias, yaExistia: resultado.yaExistia || false })

  } catch (error) {
    console.error('❌ Error en /api/aliases:', error)
    return NextResponse.json({ ok: false, error: error.message || 'Error creando alias' }, { status: 500 })
  }
}
