'use server'

import prisma from '../prisma'
import { upsertAliasPresentacionProveedor } from './aliasesProveedor'

/**
 * Busca un proveedor por CUIT o nombre similar
 * @param {string} cuit - CUIT del proveedor
 * @param {string} nombre - Nombre del proveedor
 * @returns {Object|null} Proveedor encontrado o null
 */
export async function buscarProveedor(cuit, nombre) {
  try {
    // Primero intentar buscar por CUIT exacto
    if (cuit && cuit.trim()) {
      const porCuit = await prisma.contacto.findFirst({
        where: {
          cuit: cuit.trim(),
          es_proveedor: true
        },
        select: {
          id: true,
          nombre: true,
          nombre_fantasia: true,
          cuit: true,
          email: true,
          telefono: true,
          direccion: true,
          frecuencia_entrega: true
        }
      })
      
      if (porCuit) {
        return { proveedor: porCuit, confianza: 'alta', metodo: 'cuit' }
      }
    }

    // Si no encuentra por CUIT, buscar por nombre similar
    if (nombre) {
      const nombreLimpio = nombre.trim().toLowerCase()
      
      const porNombre = await prisma.contacto.findMany({
        where: {
          es_proveedor: true,
          OR: [
            { nombre: { contains: nombreLimpio, mode: 'insensitive' } },
            { nombre_fantasia: { contains: nombreLimpio, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          nombre: true,
          nombre_fantasia: true,
          cuit: true,
          email: true,
          telefono: true,
          direccion: true,
          frecuencia_entrega: true
        },
        take: 5
      })

      if (porNombre.length > 0) {
        // Calcular similitud básica (coincidencias de palabras)
        const conSimilitud = porNombre.map(p => {
          const nombreDB = (p.nombre || '').toLowerCase()
          const nombreFantasia = (p.nombre_fantasia || '').toLowerCase()
          const palabrasFactura = nombreLimpio.split(' ')
          
          let coincidencias = 0
          palabrasFactura.forEach(palabra => {
            if (nombreDB.includes(palabra) || nombreFantasia.includes(palabra)) {
              coincidencias++
            }
          })
          
          const similitud = coincidencias / palabrasFactura.length
          
          return {
            ...p,
            similitud
          }
        })

        // Ordenar por similitud
        conSimilitud.sort((a, b) => b.similitud - a.similitud)
        
        const mejor = conSimilitud[0]
        return {
          proveedor: mejor,
          confianza: mejor.similitud > 0.7 ? 'alta' : mejor.similitud > 0.4 ? 'media' : 'baja',
          metodo: 'nombre',
          alternativas: conSimilitud.slice(1, 3)
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error buscando proveedor:', error)
    throw error
  }
}

/**
 * Busca un producto por descripción similar
 * @param {string} descripcion - Descripción del producto
 * @param {number} proveedorId - ID del proveedor (opcional)
 * @returns {Array} Lista de productos similares con alias
 */
export async function buscarProducto(descripcion, proveedorId = null) {
  try {
    const descripcionLimpia = descripcion.trim().toLowerCase()
    
    const productos = await prisma.producto.findMany({
      where: {
        OR: [
          { nombre: { contains: descripcionLimpia, mode: 'insensitive' } },
          { descripcion: { contains: descripcionLimpia, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        stock_base: true,
        stock_empaque: true,
        marca: {
          select: {
            id: true,
            nombre: true
          }
        },
        presentaciones: {
          select: {
            id: true,
            nombre: true,
            precio_compra: true,
            precio_venta: true,
            stock_empaque: true,
            factor_conversion: true,
            alias_proveedor: proveedorId ? {
              where: { proveedor_id: proveedorId },
              select: {
                alias: true,
                proveedor_id: true
              }
            } : {
              select: {
                alias: true,
                proveedor_id: true
              }
            }
          }
        }
      },
      take: 10
    })

    // Calcular similitud incluyendo alias
    const conSimilitud = productos.map(p => {
      const nombreDB = (p.nombre || '').toLowerCase()
      const descripcionDB = (p.descripcion || '').toLowerCase()
      const palabrasFactura = descripcionLimpia.split(' ').filter(pal => pal.length > 2)
      
      // Obtener todos los alias
      const aliases = p.presentaciones?.flatMap(pres => 
        pres.alias_proveedor?.map(a => a.alias.toLowerCase()) || []
      ) || []
      
      let coincidencias = 0
      let mejorAlias = null
      let maxCoincidenciasAlias = 0
      
      palabrasFactura.forEach(palabra => {
        if (nombreDB.includes(palabra) || descripcionDB.includes(palabra)) {
          coincidencias++
        }
        
        // Buscar en alias
        aliases.forEach((alias, idx) => {
          if (alias.includes(palabra)) {
            coincidencias++
            const coincidenciasAlias = palabrasFactura.filter(p => alias.includes(p)).length
            if (coincidenciasAlias > maxCoincidenciasAlias) {
              maxCoincidenciasAlias = coincidenciasAlias
              // Encontrar el alias original (con mayúsculas)
              const aliasOriginal = p.presentaciones.flatMap(pres => 
                pres.alias_proveedor || []
              ).find(a => a.alias.toLowerCase() === alias)
              mejorAlias = aliasOriginal?.alias
            }
          }
        })
      })
      
      const similitud = palabrasFactura.length > 0 ? coincidencias / palabrasFactura.length : 0
      
      return {
        ...p,
        similitud,
        mejorAlias
      }
    })

    // Ordenar por similitud
    conSimilitud.sort((a, b) => b.similitud - a.similitud)
    
    return conSimilitud.filter(p => p.similitud > 0.3)
  } catch (error) {
    console.error('Error buscando producto:', error)
    throw error
  }
}

/**
 * Busca pedidos relacionados con una factura
 * @param {number} proveedorId - ID del proveedor
 * @param {string} numeroFactura - Número de factura
 * @param {string} fechaFactura - Fecha de factura
 * @returns {Array} Lista de pedidos relacionados
 */
export async function buscarPedidosRelacionados(proveedorId, numeroFactura, fechaFactura) {
  try {
    const fechaInicio = new Date(fechaFactura)
    fechaInicio.setDate(fechaInicio.getDate() - 30) // 30 días antes
    
    const fechaFin = new Date(fechaFactura)
    fechaFin.setDate(fechaFin.getDate() + 7) // 7 días después
    
    const pedidos = await prisma.pedido.findMany({
      where: {
        proveedor_id: proveedorId,
        fecha_pedido: {
          gte: fechaInicio,
          lte: fechaFin
        },
        estado: {
          in: ['pendiente', 'enviado', 'recibido_parcial']
        }
      },
      select: {
        id: true,
        fecha_pedido: true,
        fecha_entrega_estimada: true,
        estado: true,
        total: true,
        items: {
          select: {
            id: true,
            producto_id: true,
            presentacion_id: true,
            cantidad: true,
            precio_unitario: true,
            producto: {
              select: {
                nombre: true
              }
            },
            presentacion: {
              select: {
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha_pedido: 'desc'
      },
      take: 5
    })

    return pedidos
  } catch (error) {
    console.error('Error buscando pedidos:', error)
    throw error
  }
}

/**
 * Verifica si ya existe una factura con el mismo número
 * @param {string} numeroFactura - Número de factura
 * @param {number} proveedorId - ID del proveedor
 * @returns {Object|null} Factura existente o null
 */
export async function verificarFacturaDuplicada(numeroFactura, proveedorId) {
  try {
    const factura = await prisma.factura.findFirst({
      where: {
        numero: numeroFactura,
        proveedor_id: proveedorId
      },
      select: {
        id: true,
        numero: true,
        fecha: true,
        total: true,
        estado: true
      }
    })

    return factura
  } catch (error) {
    console.error('Error verificando factura duplicada:', error)
    throw error
  }
}

/**
 * Prepara datos para buscar producto en internet
 * @param {string} descripcion - Descripción del producto
 * @returns {Object} Objeto con URLs y queries preparadas
 */
export async function prepararBusquedaWeb(descripcion) {
  try {
    const terminos = descripcion.trim()
    const encodedTerminos = encodeURIComponent(terminos)
    
    return {
      google: `https://www.google.com/search?q=${encodedTerminos}`,
      mercadoLibre: `https://listado.mercadolibre.com.ar/${encodedTerminos.replace(/ /g, '-')}`,
      googleImages: `https://www.google.com/search?q=${encodedTerminos}&tbm=isch`,
      query: terminos,
      sugerencias: [
        `${terminos} precio`,
        `${terminos} mayorista`,
        `${terminos} especificaciones`,
        `${terminos} código de barras`
      ]
    }
  } catch (error) {
    console.error('Error preparando búsqueda web:', error)
    throw error
  }
}

/**
 * Guarda una auditoría de edición manual de factura
 * @param {Object} datos - Datos de la auditoría
 */
export async function guardarAuditoriaEdicion(datos) {
  try {
    const { campo, valorAnterior, valorNuevo, contexto } = datos
    
    // Log por ahora (TODO: implementar tabla de auditoría)
    console.log('📝 Auditoría EDITAR_FACTURA_IA:', {
      campo,
      valorAnterior,
      valorNuevo,
      contexto,
      timestamp: new Date().toISOString()
    })
    
    return { ok: true }
  } catch (error) {
    console.error('Error guardando auditoría:', error)
    return { ok: false, error: error.message }
  }
}

/**
 * Procesa un item de factura y crea alias de proveedor si no existe
 * Genera tarea pendiente si el producto no está mapeado
 * @param {Object} item - Item de la factura
 * @param {string} proveedorId - ID del proveedor
 * @returns {Object} Resultado del procesamiento
 */
export async function procesarItemFactura({ item, proveedorId }) {
  try {
    if (!proveedorId || !item?.descripcion) {
      console.warn('⚠️ Datos incompletos para procesar item')
      return { success: false, mensaje: 'Datos incompletos' }
    }

    const descripcion = item.descripcion.trim()
    const sku = item.codigo_producto || item.codigo || descripcion
    
    // Buscar si ya existe un alias para este SKU/descripción
    const aliasExistente = await prisma.proveedorSkuAlias.findFirst({
      where: {
        proveedorId: proveedorId,
        OR: [
          { sku: sku },
          { nombreEnProveedor: descripcion }
        ]
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

    if (aliasExistente) {
      console.log('✅ Alias existente encontrado:', aliasExistente.id)
      
      // Si el alias ya tiene producto/presentación mapeado
      if (aliasExistente.productoId || aliasExistente.presentacionId) {
        return {
          success: true,
          alias: aliasExistente,
          mapeado: true,
          mensaje: 'Producto ya mapeado'
        }
      }
      
      // Si no está mapeado, verificar si hay tarea pendiente
      const tareaPendiente = await prisma.correccionPendiente.findFirst({
        where: {
          estado: 'ABIERTO',
          tipo: 'ALIAS_PRESENTACION_PROVEEDOR',
          payload: {
            path: ['aliasId'],
            equals: aliasExistente.id
          }
        }
      })

      return {
        success: true,
        alias: aliasExistente,
        mapeado: false,
        tieneTareaPendiente: !!tareaPendiente,
        tareaPendiente,
        mensaje: tareaPendiente ? 'Tarea pendiente existente' : 'Sin mapear'
      }
    }

    // No existe alias, crear uno nuevo sin mapear
    console.log('🆕 Creando nuevo alias sin mapear')
    
    const resultado = await upsertAliasPresentacionProveedor({
      proveedorId,
      productoId: null,
      presentacionId: null,
      sku,
      nombreEnProveedor: descripcion
    })

    return {
      success: true,
      alias: resultado.alias,
      mapeado: false,
      tieneTareaPendiente: true,
      mensaje: 'Alias creado con tarea pendiente'
    }

  } catch (error) {
    console.error('❌ Error procesando item de factura:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
