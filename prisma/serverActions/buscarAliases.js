'use server'

import prisma from '../prisma'

/**
 * Busca aliases existentes para un item de factura
 * NO crea nada, solo busca
 */
export async function buscarAliasPorItem({ proveedorId, item }) {
  try {
    if (!proveedorId || !item) {
      return { alias: null, mapeado: false, tieneAlias: false }
    }

    const descripcion = item.descripcion || item.detalle || item.producto || item.articulo
    const codigo = item.codigo || item.codigo_producto || item.sku

    if (!descripcion?.trim()) {
      return { alias: null, mapeado: false, tieneAlias: false }
    }

    // Buscar alias existente
    const alias = await prisma.proveedorSkuAlias.findFirst({
      where: {
        proveedorId,
        OR: [
          codigo ? { sku: codigo } : null,
          { nombreEnProveedor: { contains: descripcion.trim(), mode: 'insensitive' } },
          { nombreEnProveedor: { equals: descripcion.trim(), mode: 'insensitive' } }
        ].filter(Boolean)
      },
      include: {
        producto: {
          include: {
            presentaciones: {
              include: {
                unidad: true
              }
            }
          }
        },
        presentacion: {
          include: {
            unidad: true
          }
        }
      }
    })

    if (!alias) {
      return {
        alias: null,
        mapeado: false,
        tieneAlias: false,
        itemOriginal: item
      }
    }

    const mapeado = !!(alias.productoId && alias.presentacionId)

    return {
      alias,
      mapeado,
      tieneAlias: true,
      itemOriginal: item,
      producto: alias.producto,
      presentacion: alias.presentacion
    }

  } catch (error) {
    console.error('❌ Error buscando alias:', error)
    return {
      alias: null,
      mapeado: false,
      tieneAlias: false,
      error: error.message
    }
  }
}

/**
 * Busca aliases para múltiples items de una factura
 */
export async function buscarAliasesPorItems({ proveedorId, items }) {
  try {
    if (!proveedorId || !Array.isArray(items)) {
      return []
    }

    const resultados = []

    for (const item of items) {
      const resultado = await buscarAliasPorItem({ proveedorId, item })
      resultados.push(resultado)
    }

    return resultados

  } catch (error) {
    console.error('❌ Error buscando aliases:', error)
    return []
  }
}

/**
 * Crea un alias simple SIN mapear a producto
 * El usuario decidirá si y cuándo mapearlo
 */
export async function crearAliasSimple({ proveedorId, sku, nombreEnProveedor }) {
  try {
    if (!proveedorId || !nombreEnProveedor?.trim()) {
      throw new Error('Datos insuficientes para crear alias')
    }

    // Verificar si ya existe
    const existente = await prisma.proveedorSkuAlias.findFirst({
      where: {
        proveedorId,
        OR: [
          sku ? { sku } : null,
          { nombreEnProveedor: nombreEnProveedor.trim() }
        ].filter(Boolean)
      }
    })

    if (existente) {
      return {
        success: true,
        alias: existente,
        yaExistia: true,
        mensaje: 'El alias ya existía'
      }
    }

    // Crear nuevo alias sin mapear
    const alias = await prisma.proveedorSkuAlias.create({
      data: {
        proveedorId,
        sku: sku || nombreEnProveedor.trim(),
        nombreEnProveedor: nombreEnProveedor.trim(),
        productoId: null,
        presentacionId: null
      }
    })

    console.log('✅ Alias simple creado:', alias.id)

    return {
      success: true,
      alias,
      yaExistia: false,
      mensaje: 'Alias creado sin mapear'
    }

  } catch (error) {
    console.error('❌ Error creando alias simple:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Mapea un alias existente a un producto/presentación
 */
export async function mapearAliasAProducto({ aliasId, productoId, presentacionId }) {
  try {
    if (!aliasId || !productoId) {
      throw new Error('Datos insuficientes para mapear alias')
    }

    const alias = await prisma.proveedorSkuAlias.update({
      where: { id: aliasId },
      data: {
        productoId,
        presentacionId
      },
      include: {
        producto: {
          include: {
            presentaciones: true
          }
        },
        presentacion: true
      }
    })

    console.log('✅ Alias mapeado:', alias.id)

    return {
      success: true,
      alias,
      mensaje: 'Alias mapeado exitosamente'
    }

  } catch (error) {
    console.error('❌ Error mapeando alias:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
