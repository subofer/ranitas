import { NextResponse } from 'next/server'
import prisma from '@/prisma/prisma'

export async function POST(req) {
  try {
    const { text } = await req.json()
    if (!text || text.trim().length < 2) {
      return NextResponse.json({ ok: true, resultados: [] })
    }

    const q = text.trim()
    // Buscar calles que contengan la cadena (case-insensitive)
    const calles = await prisma.calles.findMany({
      where: {
        nombre: { contains: q, mode: 'insensitive' }
      },
      take: 20
    })

    // Mapear resultados con info básica de provincia/localidad
    const resultados = await Promise.all(calles.map(async (c) => {
      const provincia = await prisma.provincias.findUnique({ where: { id: c.idProvincia } })
      // Buscar localidad por idLocalidadCensal
      const localidad = await prisma.localidades.findFirst({ where: { idLocalidadCensal: c.idLocalidadCensal } })
      return {
        id: c.id,
        nombre: c.nombre,
        idProvincia: c.idProvincia,
        provincia: provincia?.nombre || null,
        idLocalidadCensal: c.idLocalidadCensal,
        localidad: localidad?.nombre || null
      }
    }))

    return NextResponse.json({ ok: true, resultados })
  } catch (error) {
    console.error('Error en /api/geo/search:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}