'use server'

import prisma from '../prisma'

/**
 * Busca un contacto por nombre o alias
 * @param {string} nombreOAlias - Nombre o alias a buscar
 * @param {boolean} soloProveedores - Si solo buscar en proveedores
 * @returns {Promise<Contacto|null>}
 */
export async function buscarContactoPorNombreOAlias(nombreOAlias, soloProveedores = false) {
  try {
    if (!nombreOAlias || nombreOAlias.trim() === '') {
      return null
    }

    const where = {
      OR: [
        { nombre: { contains: nombreOAlias, mode: 'insensitive' } },
        { nombreFantasia: { contains: nombreOAlias, mode: 'insensitive' } },
        { aliases: { some: { alias: { contains: nombreOAlias, mode: 'insensitive' }, activo: true } } }
      ]
    }

    if (soloProveedores) {
      where.esProveedor = true
    }

    const contacto = await prisma.contactos.findFirst({
      where,
      include: {
        aliases: {
          where: { activo: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return contacto
  } catch (error) {
    console.error('Error buscando contacto por nombre o alias:', error)
    return null
  }
}

/**
 * Crea un nuevo alias para un contacto
 * @param {Object} params
 * @param {string} params.contactoId - ID del contacto
 * @param {string} params.alias - Nombre alternativo
 * @param {string} params.fuente - Fuente del alias (MANUAL, IA_SCAN, IMPORTACION)
 * @param {string} params.observaciones - Observaciones opcionales
 * @param {string} params.creadoPor - ID del usuario que crea el alias
 * @returns {Promise<AliasContacto>}
 */
export async function crearAliasContacto({ contactoId, alias, fuente = 'MANUAL', observaciones, creadoPor }) {
  try {
    // Validar campos requeridos
    if (!alias || alias.trim() === '') {
      throw new Error('El alias no puede estar vacío')
    }

    if (!contactoId) {
      throw new Error('El ID del contacto es requerido')
    }

    const aliasTrimmed = alias.trim()

    // Verificar que el alias no exista ya
    const aliasExistente = await prisma.aliasContacto.findUnique({
      where: { alias: aliasTrimmed }
    })

    if (aliasExistente) {
      // Si el alias ya existe para el mismo contacto, no es error
      if (aliasExistente.contactoId === contactoId) {
        console.log(`ℹ️ El alias "${aliasTrimmed}" ya existe para este contacto`)
        return aliasExistente
      }
      throw new Error(`El alias "${aliasTrimmed}" ya está registrado para otro contacto`)
    }

    // Verificar que el contacto exista
    const contacto = await prisma.contactos.findUnique({
      where: { id: contactoId }
    })

    if (!contacto) {
      throw new Error('Contacto no encontrado')
    }

    // Crear el alias
    const nuevoAlias = await prisma.aliasContacto.create({
      data: {
        contactoId,
        alias: aliasTrimmed,
        fuente,
        observaciones: observaciones || `Alias creado automáticamente`,
        creadoPor: creadoPor || 'sistema',
        activo: true
      },
      include: {
        contacto: {
          select: {
            id: true,
            nombre: true,
            nombreFantasia: true,
            cuit: true
          }
        }
      }
    })

    // Registrar en auditoría (TODO: integrar con sistema de auditoría)
    console.log('📝 AUDITORIA: CREAR_ALIAS_CONTACTO', {
      aliasId: nuevoAlias.id,
      contactoId,
      contactoNombre: contacto.nombre,
      alias,
      fuente,
      creadoPor
    })

    return nuevoAlias
  } catch (error) {
    console.error('Error creando alias de contacto:', error)
    
    console.error('📝 AUDITORIA: ERROR_CREAR_ALIAS_CONTACTO', {
      contactoId,
      alias,
      error: error.message,
      userId: creadoPor
    })
    
    throw error
  }
}

/**
 * Desactiva un alias de contacto
 * @param {string} aliasId - ID del alias
 * @param {string} userId - ID del usuario que desactiva
 * @returns {Promise<AliasContacto>}
 */
export async function desactivarAliasContacto(aliasId, userId) {
  try {
    const alias = await prisma.aliasContacto.update({
      where: { id: aliasId },
      data: { activo: false },
      include: {
        contacto: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    // Registrar en auditoría (TODO: integrar con sistema de auditoría)
    console.log('📝 AUDITORIA: DESACTIVAR_ALIAS_CONTACTO', {
      aliasId,
      contactoId: alias.contactoId,
      contactoNombre: alias.contacto.nombre,
      alias: alias.alias,
      userId
    })

    return alias
  } catch (error) {
    console.error('Error desactivando alias:', error)
    throw error
  }
}

/**
 * Obtiene todos los aliases de un contacto
 * @param {string} contactoId - ID del contacto
 * @returns {Promise<AliasContacto[]>}
 */
export async function obtenerAliasesContacto(contactoId) {
  try {
    const aliases = await prisma.aliasContacto.findMany({
      where: { contactoId },
      orderBy: { createdAt: 'desc' }
    })

    return aliases
  } catch (error) {
    console.error('Error obteniendo aliases:', error)
    return []
  }
}

/**
 * Vincula un nombre escaneado con un contacto existente creando un alias
 * @param {Object} params
 * @param {string} params.nombreEscaneado - Nombre que fue escaneado por IA
 * @param {string} params.contactoId - ID del contacto real
 * @param {string} params.observaciones - Observaciones opcionales
 * @param {string} params.userId - ID del usuario que hace la vinculación
 * @returns {Promise<AliasContacto>}
 */
export async function vincularNombreEscaneadoConContacto({ nombreEscaneado, contactoId, observaciones, userId }) {
  try {
    const nuevoAlias = await crearAliasContacto({
      contactoId,
      alias: nombreEscaneado,
      fuente: 'IA_SCAN',
      observaciones: observaciones || `Nombre detectado por IA al escanear factura`,
      creadoPor: userId
    })

    return nuevoAlias
  } catch (error) {
    console.error('Error vinculando nombre escaneado:', error)
    throw error
  }
}
