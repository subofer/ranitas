'use server'

import prisma from '../prisma'
import { upsertAliasPresentacionProveedor } from './aliasesProveedor'

/**
 * Busca un proveedor por CUIT, nombre similar o alias
 * @param {string} cuit - CUIT del proveedor
 * @param {string} nombre - Nombre del proveedor
 * @returns {Object|null} Proveedor encontrado o null
 */
export async function buscarProveedor(cuit, nombre) {
  try {
    // Validación defensiva: asegurar que prisma esté disponible
    if (!prisma) {
      console.error('❌ Prisma client no está disponible')
      return null
    }
    
    // Primero intentar buscar por CUIT exacto
    if (cuit && cuit.trim()) {
      const porCuit = await prisma.contactos.findFirst({
        where: {
          cuit: cuit.trim(),
          esProveedor: true
        },
        select: {
          id: true,
          nombre: true,
          cuit: true,
          aliases: {
            where: { activo: true },
            select: { alias: true }
          }
        }
      })
      
      if (porCuit) {
        return { proveedor: porCuit, confianza: 'alta', metodo: 'cuit' }
      }
    }

    // Si no encuentra por CUIT, buscar por nombre o alias
    if (nombre) {
      const nombreLimpio = nombre.trim().toLowerCase()
      
      const porNombreOAlias = await prisma.contactos.findMany({
        where: {
          esProveedor: true,
          OR: [
            { nombre: { contains: nombreLimpio, mode: 'insensitive' } },
            { nombreFantasia: { contains: nombreLimpio, mode: 'insensitive' } },
            { aliases: { some: { alias: { contains: nombreLimpio, mode: 'insensitive' }, activo: true } } }
          ]
        },
        select: {
          id: true,
          nombre: true,
          cuit: true,
          nombreFantasia: true,
          aliases: {
            where: { activo: true },
            select: { alias: true }
          }
        },
        take: 5
      })

      if (porNombreOAlias.length > 0) {
        // Calcular similitud (nombre, nombre fantasía y aliases)
        const conSimilitud = porNombreOAlias.map(p => {
          const nombreDB = (p.nombre || '').toLowerCase()
          const nombreFantasiaDB = (p.nombreFantasia || '').toLowerCase()
          const aliasesDB = p.aliases.map(a => a.alias.toLowerCase())
          const palabrasFactura = nombreLimpio.split(' ')
          
          let coincidencias = 0
          let maxCoincidencias = palabrasFactura.length
          
          // Chequear nombre principal
          palabrasFactura.forEach(palabra => {
            if (nombreDB.includes(palabra)) coincidencias++
          })
          
          // Chequear nombre fantasía
          if (nombreFantasiaDB) {
            palabrasFactura.forEach(palabra => {
              if (nombreFantasiaDB.includes(palabra)) coincidencias++
            })
          }
          
          // Chequear aliases (alta prioridad)
          aliasesDB.forEach(alias => {
            const palabrasAlias = alias.split(' ')
            let coincidenciasAlias = 0
            palabrasFactura.forEach(palabra => {
              if (alias.includes(palabra)) coincidenciasAlias++
            })
            // Si el alias matchea muy bien, dar bonus
            if (coincidenciasAlias / palabrasFactura.length > 0.8) {
              coincidencias += palabrasFactura.length * 2 // Bonus por alias exacto
            } else {
              coincidencias += coincidenciasAlias
            }
          })
          
          const similitud = Math.min(1, coincidencias / maxCoincidencias)
          
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
          metodo: mejor.aliases && mejor.aliases.length > 0 ? 'alias' : 'nombre',
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
    
    const productos = await prisma.productos.findMany({
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
        stockSuelto: true,
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
            precio: true,
            skuAliases: proveedorId ? {
              where: { proveedorId: proveedorId },
              select: {
                sku: true,
                nombreEnProveedor: true,
                proveedorId: true
              }
            } : {
              select: {
                sku: true,
                nombreEnProveedor: true,
                proveedorId: true
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
        pres.skuAliases?.map(a => a.nombreEnProveedor.toLowerCase()) || []
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
                pres.skuAliases || []
              ).find(a => a.nombreEnProveedor.toLowerCase() === alias)
              mejorAlias = aliasOriginal?.nombreEnProveedor
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
    // Por ahora retornar array vacío hasta que se actualice el modelo completo
    console.warn('⚠️ buscarPedidosRelacionados: Funcionalidad pendiente de implementar con modelo actualizado')
    return []
  } catch (error) {
    console.error('Error buscando pedidos:', error)
    return []
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
    // Por ahora retornar null hasta que se actualice el modelo completo
    console.warn('⚠️ verificarFacturaDuplicada: Funcionalidad pendiente de implementar con modelo actualizado')
    return null
  } catch (error) {
    console.error('Error verificando factura duplicada:', error)
    return null
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
 * Guarda un evento de auditoría cuando la IA local falla al procesar una imagen
 * @param {Object} datos - Información del fallo
 */
export async function guardarAuditoriaIaFailure(datos) {
  try {
    const {
      model,
      mode,
      fileName,
      fileSize,
      responseStatus,
      errorText,
      timing
    } = datos

    // Log por ahora (podemos mover a una tabla de auditoría más adelante)
    console.error('🔴 Auditoría IA_FAILURE:', {
      model,
      mode,
      fileName,
      fileSize,
      responseSnippet: (String(errorText || '')).substring(0, 200),
      timing,
      timestamp: new Date().toISOString()
    })

    // Si en el futuro se quiere persistir en BD:
    // await prisma.auditorias.create({ data: { tipo: 'OLLAMA_FAILURE', payload: JSON.stringify({ model, mode, fileName, fileSize, responseStatus, errorText }), timestamp: new Date() } })

    return { ok: true }
  } catch (err) {
    console.error('Error guardando auditoría Ollama:', err)
    return { ok: false, error: err.message }
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
