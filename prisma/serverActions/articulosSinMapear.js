'use server'

import prisma from '../prisma'

/**
 * Obtiene todos los detalles de documentos sin producto mapeado
 */
export async function obtenerArticulosSinMapear({ proveedorId, skip = 0, take = 50 } = {}) {
  try {
    const where = {
      productoId: null,
      descripcionPendiente: { not: null }
    }

    if (proveedorId) {
      where.documento = {
        proveedorId
      }
    }

    const [detalles, total] = await Promise.all([
      prisma.documentoDetalle.findMany({
        where,
        include: {
          documento: {
            include: {
              proveedor: true
            }
          },
          alias: {
            include: {
              proveedor: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take
      }),
      prisma.documentoDetalle.count({ where })
    ])

    // Agrupar por descripción para estadísticas
    const agrupados = {}
    detalles.forEach(detalle => {
      const key = detalle.descripcionPendiente?.toLowerCase().trim()
      if (!agrupados[key]) {
        agrupados[key] = {
          descripcion: detalle.descripcionPendiente,
          alias: detalle.alias,
          proveedor: detalle.documento.proveedor,
          cantidad: 0,
          precioPromedio: 0,
          preciosAcumulados: 0,
          facturas: []
        }
      }
      agrupados[key].cantidad += detalle.cantidad
      agrupados[key].preciosAcumulados += detalle.precioUnitario
      agrupados[key].facturas.push({
        numero: detalle.documento.numeroDocumento,
        fecha: detalle.documento.fecha,
        cantidad: detalle.cantidad,
        precio: detalle.precioUnitario
      })
    })

    // Calcular promedios
    Object.values(agrupados).forEach(item => {
      item.precioPromedio = item.preciosAcumulados / item.facturas.length
      delete item.preciosAcumulados
    })

    return {
      detalles,
      total,
      agrupados: Object.values(agrupados)
    }
  } catch (error) {
    console.error('Error obteniendo artículos sin mapear:', error)
    throw error
  }
}

/**
 * Obtiene proveedores con artículos sin mapear
 */
export async function obtenerProveedoresConPendientes() {
  try {
    const proveedores = await prisma.contactos.findMany({
      where: {
        esProveedor: true,
        documentosProveedor: {
          some: {
            detalles: {
              some: {
                productoId: null,
                descripcionPendiente: { not: null }
              }
            }
          }
        }
      },
      select: {
        id: true,
        nombre: true,
        _count: {
          select: {
            documentosProveedor: {
              where: {
                detalles: {
                  some: {
                    productoId: null,
                    descripcionPendiente: { not: null }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    return proveedores
  } catch (error) {
    console.error('Error obteniendo proveedores con pendientes:', error)
    throw error
  }
}
