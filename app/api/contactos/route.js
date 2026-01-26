import { NextResponse } from 'next/server'
import prisma from '@/prisma/prisma'

/**
 * GET - Obtener contactos (opcionalmente filtrado por tipo)
 * Query params: ?tipo=proveedor|cliente
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get('tipo')

    const where = {}
    if (tipo === 'proveedor') {
      where.proveedor = true
    } else if (tipo === 'cliente') {
      where.cliente = true
    }

    const contactos = await prisma.contactos.findMany({
      where,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        nombreFantasia: true,
        cuit: true,
        proveedor: true,
        cliente: true,
        marca: true,
      }
    })

    return NextResponse.json({ 
      ok: true, 
      contactos 
    })

  } catch (error) {
    console.error('❌ Error obteniendo contactos:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener contactos' },
      { status: 500 }
    )
  }
}

/**
 * POST - Crear un nuevo contacto/proveedor
 */
export async function POST(req) {
  try {
    const data = await req.json()
    
    // Validar campos obligatorios
    if (!data.nombre || !data.cuit) {
      return NextResponse.json(
        { error: 'Nombre y CUIT son obligatorios' },
        { status: 400 }
      )
    }

    // Limpiar CUIT (quitar guiones)
    const cuitLimpio = data.cuit.replace(/-/g, '')

    // Verificar si ya existe un contacto con ese CUIT
    let existente
    try {
      existente = await prisma.contactos.findUnique({ where: { cuit: cuitLimpio } })
    } catch (e) {
      // Si falla por migración/columna faltante, devolver mensaje claro
      const msg = String(e?.message || '').toLowerCase()
      if (msg.includes('nombrefantasia') || msg.includes('nombrefantasia') || msg.includes('contactos.nombrefantasia')) {
        console.error('❌ Error de migración detectado al buscar contacto:', e.message)
        return NextResponse.json({ ok: false, error: 'Error de esquema: falta columna Contactos.nombreFantasia en la base de datos. Ejecuta `npx prisma migrate dev` o aplica la migración correspondiente.' }, { status: 500 })
      }
      throw e
    }

    if (existente) {
      // Return the existing contact so the client can propose actions (usar existente / crear alias)
      return NextResponse.json(
        { ok: false, error: 'Ya existe un contacto con ese CUIT', contacto: existente },
        { status: 409 }
      )
    }

    // Crear el nuevo contacto con direcciones si vienen
    // Armamos el objeto de datos y en caso de error por migración (columna faltante)
    // reintentamos sin el campo opcional 'nombreFantasia'.
    const contactCreateData = {
      cuit: cuitLimpio,
      nombre: data.nombre,
      nombreFantasia: data.nombreFantasia || null,
      telefono: data.telefono || '0800-completar-telefono',
      persona: data.condicionIva || null,
      iva: data.condicionIva || null,
      esInterno: false,
      esProveedor: data.esProveedor !== false, // Por defecto true
      esMarca: data.esMarca || false,
      // Si hay email, crear registro
      // Emails: aceptar string con comas o array
      ...((data.email || data.emails) && (() => {
        const emailsArr = Array.isArray(data.emails) ? data.emails : (typeof data.email === 'string' ? data.email.split(',').map(e => e.trim()).filter(Boolean) : [])
        return emailsArr.length > 0 ? { emails: { create: emailsArr.map(email => ({ email })) } } : {}
      })()),
      // Direcciones: array con { idProvincia, idLocalidad, idCalle, numeroCalle, detalles }
      ...(Array.isArray(data.direcciones) && data.direcciones.length > 0 && {
        direcciones: {
          create: data.direcciones.map(d => ({
            idProvincia: d.idProvincia || null,
            idLocalidad: d.idLocalidad || null,
            idCalle: d.idCalle || null,
            idLocalidadCensal: d.idLocalidadCensal || null,
            numeroCalle: d.numeroCalle ? parseInt(d.numeroCalle) : null,
            detalles: d.detalles || null,
            depto: d.depto || null
          }))
        }
      })
    }

    let nuevoContacto
    try {
      nuevoContacto = await prisma.contactos.create({
        data: contactCreateData,
        include: { emails: true, direcciones: true }
      })
    } catch (e) {
      // Si falla por columna faltante (migración no aplicada), reintentar sin campos opcionales
      const msg = String(e?.message || '').toLowerCase()
      if (msg.includes('column') && msg.includes('nombrefantasia')) {
        // Reintentar sin nombreFantasia
        const safeData = { ...contactCreateData }
        delete safeData.nombreFantasia
        try {
          nuevoContacto = await prisma.contactos.create({ data: safeData, include: { emails: true, direcciones: true } })
        } catch (e2) {
          console.error('❌ Error creando contacto (retry sin nombreFantasia):', e2)
          throw e2
        }
      } else {
        console.error('❌ Error creando contacto:', e)
        throw e
      }
    }

    console.log('✅ Contacto creado:', nuevoContacto.nombre, '-', nuevoContacto.cuit)

    return NextResponse.json({ 
      ok: true, 
      contacto: nuevoContacto 
    })

  } catch (error) {
    console.error('❌ Error creando contacto:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear el contacto' },
      { status: 500 }
    )
  }
}
