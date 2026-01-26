"use server"

import { cargarURL, finalizarNavegacion } from '@/lib/puppeteerSession'
import prisma from '@/prisma/prisma'

/**
 * Busca información detallada de un producto usando Puppeteer y Google
 * @param {Object} params - Parámetros de búsqueda
 * @param {string} params.nombre - Nombre del producto
 * @param {string} params.marca - Marca del producto (opcional)
 * @param {string} params.codigoBarras - Código de barras (opcional)
 * @param {string} params.descripcion - Descripción adicional (opcional)
 * @returns {Promise<Object>} Información completa del producto
 */
export async function buscarProductoConIA({ 
  nombre, 
  marca, 
  codigoBarras, 
  descripcion 
}) {
  let pagina = null
  let navegador = null
  
  try {
    console.log('🔍 Buscando información del producto:', { nombre, marca, codigoBarras })
    
    // Construir consulta de búsqueda optimizada
    const terminos = [
      codigoBarras,
      marca,
      nombre,
      descripcion
    ].filter(Boolean).join(' ')
    
    const queryGoogle = encodeURIComponent(terminos)
    const url = `https://www.google.com/search?q=${queryGoogle}&tbm=shop`
    
    console.log('🌐 URL de búsqueda:', url)
    
    // Navegar a Google Shopping
    const nav = await cargarURL(url, false) // false = headless
    pagina = nav.pagina
    navegador = nav.navegador
    
    if (!pagina) {
      throw new Error('No se pudo inicializar el navegador')
    }
    
    // Esperar a que cargue el contenido
    await pagina.waitForSelector('.sh-dgr__content', { timeout: 10000 }).catch(() => null)
    
    // Extraer información de productos
    const productos = await pagina.evaluate(() => {
      const resultados = []
      
      // Intentar múltiples selectores (Google cambia frecuentemente)
      const productCards = document.querySelectorAll('.sh-dgr__grid-result, .sh-dlr__list-result')
      
      productCards.forEach((card, index) => {
        if (index >= 5) return // Limitar a 5 resultados
        
        try {
          const tituloEl = card.querySelector('.tAxDx, .Xjkr3b')
          const precioEl = card.querySelector('.a8Pemb, .kHxwFf')
          const tiendaEl = card.querySelector('.aULzUe, .E5ocAb')
          const imagenEl = card.querySelector('img')
          const enlaceEl = card.querySelector('a')
          
          const titulo = tituloEl?.textContent?.trim() || ''
          const precio = precioEl?.textContent?.trim() || ''
          const tienda = tiendaEl?.textContent?.trim() || ''
          const imagen = imagenEl?.src || ''
          const enlace = enlaceEl?.href || ''
          
          if (titulo) {
            resultados.push({
              titulo,
              precio,
              tienda,
              imagen,
              enlace
            })
          }
        } catch (err) {
          console.error('Error procesando resultado:', err)
        }
      })
      
      return resultados
    })
    
    console.log(`✅ Encontrados ${productos.length} resultados`)
    
    // Si no encontró nada en Shopping, intentar búsqueda normal
    if (productos.length === 0) {
      console.log('🔄 Intentando búsqueda normal...')
      await pagina.goto(`https://www.google.com/search?q=${queryGoogle}`, { 
        waitUntil: 'networkidle2' 
      })
      
      // Extraer información de snippets de búsqueda normal
      const resultadosNormales = await pagina.evaluate(() => {
        const results = []
        const searchResults = document.querySelectorAll('.g, .tF2Cxc')
        
        searchResults.forEach((result, index) => {
          if (index >= 5) return
          
          try {
            const tituloEl = result.querySelector('h3')
            const descripcionEl = result.querySelector('.VwiC3b, .s')
            const enlaceEl = result.querySelector('a')
            
            const titulo = tituloEl?.textContent?.trim() || ''
            const descripcion = descripcionEl?.textContent?.trim() || ''
            const enlace = enlaceEl?.href || ''
            
            if (titulo) {
              results.push({ titulo, descripcion, enlace })
            }
          } catch (err) {
            console.error('Error procesando resultado normal:', err)
          }
        })
        
        return results
      })
      
      console.log(`✅ Búsqueda normal: ${resultadosNormales.length} resultados`)
      productos.push(...resultadosNormales)
    }
    
    // Extraer categorías y marca de los resultados
    const categorias = new Set()
    let marcaDetectada = marca || ''
    
    productos.forEach(p => {
      const texto = `${p.titulo} ${p.descripcion || ''}`.toLowerCase()
      
      // Detectar categorías comunes
      if (texto.includes('alimento') || texto.includes('comida')) categorias.add('Alimentos')
      if (texto.includes('bebida') || texto.includes('drink')) categorias.add('Bebidas')
      if (texto.includes('limpieza') || texto.includes('cleaning')) categorias.add('Limpieza')
      if (texto.includes('higiene') || texto.includes('personal care')) categorias.add('Higiene')
      if (texto.includes('snack') || texto.includes('golosina')) categorias.add('Snacks')
      
      // Si no hay marca, intentar detectarla del título
      if (!marcaDetectada && p.titulo) {
        const palabras = p.titulo.split(' ')
        if (palabras.length > 0) {
          marcaDetectada = palabras[0] // Primera palabra suele ser la marca
        }
      }
    })
    
    // Analizar el contenido para extraer información estructurada
    const productoInfo = {
      nombre: nombre || productos[0]?.titulo || 'Sin nombre',
      marca: marcaDetectada,
      descripcion: productos[0]?.descripcion || descripcion || '',
      categorias: Array.from(categorias),
      codigoBarras: codigoBarras || null,
      imagenes: productos.filter(p => p.imagen).map(p => p.imagen),
      preciosReferencia: productos
        .filter(p => p.precio)
        .map(p => ({
          tienda: p.tienda,
          precio: p.precio,
          enlace: p.enlace
        })),
      fuente: 'google_search',
      resultadosCrudos: productos
    }
    
    // Guardar auditoría de búsqueda
    try {
      await prisma.auditLog.create({
        data: {
          accion: 'BUSCAR_PRODUCTO_IA',
          detalles: {
            consulta: terminos,
            resultados: productos.length,
            producto: productoInfo.nombre,
            marca: productoInfo.marca,
            categorias: productoInfo.categorias
          },
          userId: 'sistema'
        }
      })
    } catch (audErr) {
      console.warn('⚠️ No se pudo guardar auditoría:', audErr.message)
    }
    
    return productoInfo
    
  } catch (error) {
    console.error('❌ Error buscando producto:', error)
    
    // Guardar auditoría de error
    try {
      await prisma.auditLog.create({
        data: {
          accion: 'BUSCAR_PRODUCTO_IA_ERROR',
          detalles: {
            error: error.message,
            nombre,
            marca,
            codigoBarras
          },
          userId: 'sistema'
        }
      })
    } catch (audErr) {
      console.warn('⚠️ No se pudo guardar auditoría de error:', audErr.message)
    }
    
    return {
      nombre: nombre || 'Producto desconocido',
      marca: marca || null,
      descripcion: descripcion || '',
      categorias: [],
      codigoBarras: codigoBarras || null,
      error: error.message,
      fuente: 'error'
    }
    
  } finally {
    // Cerrar navegador
    if (pagina && navegador) {
      await finalizarNavegacion(pagina, navegador)
    }
  }
}

/**
 * Busca y crea/actualiza un producto en la base de datos
 * @param {Object} itemFactura - Item de la factura con información parcial
 * @returns {Promise<Object>} Producto creado/actualizado
 */
export async function buscarYGuardarProducto(itemFactura) {
  try {
    const { 
      nombre_producto, 
      descripcion_exacta,
      tipo_presentacion_nombre,
      unidades_por_presentacion,
      presentacion_base
    } = itemFactura
    
    console.log('🔍 Buscando y guardando producto:', nombre_producto)
    
    // Buscar información completa del producto
    const infoProducto = await buscarProductoConIA({
      nombre: nombre_producto,
      descripcion: descripcion_exacta
    })
    
    console.log('✅ Información encontrada:', infoProducto)
    
    // Verificar si el producto ya existe en la BD
    let producto = await prisma.productos.findFirst({
      where: {
        OR: [
          { nombre: { contains: nombre_producto, mode: 'insensitive' } },
          { descripcion: { contains: nombre_producto, mode: 'insensitive' } }
        ]
      },
      include: {
        presentaciones: true,
        categorias: true
      }
    })
    
    // Si no existe, crear producto nuevo
    if (!producto) {
      console.log('📦 Creando nuevo producto...')
      
      // Buscar o crear categorías
      const categoriasIds = []
      for (const catNombre of infoProducto.categorias) {
        let categoria = await prisma.categorias.findFirst({
          where: { nombre: { equals: catNombre, mode: 'insensitive' } }
        })
        
        if (!categoria) {
          categoria = await prisma.categorias.create({
            data: { nombre: catNombre }
          })
        }
        
        categoriasIds.push({ id: categoria.id })
      }
      
      // Buscar o crear marca
      let marca = null
      if (infoProducto.marca) {
        marca = await prisma.contactos.findFirst({
          where: { 
            nombre: { equals: infoProducto.marca, mode: 'insensitive' },
            marca: true
          }
        })
        
        if (!marca) {
          marca = await prisma.contactos.create({
            data: {
              nombre: infoProducto.marca,
              marca: true
            }
          })
        }
      }
      
      // Crear producto
      producto = await prisma.productos.create({
        data: {
          nombre: infoProducto.nombre,
          descripcion: infoProducto.descripcion,
          marcaId: marca?.id,
          categorias: {
            connect: categoriasIds
          },
          // Crear presentación base
          presentaciones: {
            create: {
              nombre: presentacion_base || 'Unidad',
              esUnidadBase: true,
              stock_base: 0,
              stock_empaque: 0,
              tiposPresentacion: tipo_presentacion_nombre || 'UNIDAD'
            }
          }
        },
        include: {
          presentaciones: true,
          categorias: true
        }
      })
      
      console.log('✅ Producto creado:', producto.id)
      
      // Auditoría
      try {
        await prisma.auditLog.create({
          data: {
            accion: 'CREAR_PRODUCTO_DESDE_IA',
            detalles: {
              productoId: producto.id,
              nombre: producto.nombre,
              marca: infoProducto.marca,
              categorias: infoProducto.categorias,
              fuente: 'google_search'
            },
            userId: 'sistema'
          }
        })
      } catch (audErr) {
        console.warn('⚠️ No se pudo guardar auditoría:', audErr.message)
      }
    }
    
    return producto
    
  } catch (error) {
    console.error('❌ Error guardando producto:', error)
    throw error
  }
}
