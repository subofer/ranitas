import { NextResponse } from 'next/server'
import sharp from 'sharp'
import prisma from '@/prisma/prisma'
import { guardarAuditoriaOllamaFailure } from '@/prisma/serverActions/facturaActions'
import { Ollama } from 'ollama'

// Configuración de timeout para esta ruta (10 minutos)
export const maxDuration = 600 // segundos
export const dynamic = 'force-dynamic'

const OLLAMA_HOST = 'http://localhost:11434'
const ollama = new Ollama({ host: OLLAMA_HOST })

/**
 * Normaliza dimensiones a múltiplos de 28 (requerido por Qwen2.5-VL)
 * Qwen2.5-VL usa parches de 28x28, debe ser exacto o falla con GGML_ASSERT
 */
function normalizeToMultipleOf28(width, height, maxSize = 896) {
  // Calcular el lado más largo
  const maxDimension = Math.max(width, height)
  
  // Si ya es menor que maxSize, escalar al múltiplo de 28 más cercano
  let targetSize = maxSize
  
  if (maxDimension < maxSize) {
    // Encontrar el múltiplo de 28 más cercano que no exceda la dimensión original
    targetSize = Math.floor(maxDimension / 28) * 28
    // Asegurar un mínimo de 672 (24 * 28) para buena calidad
    if (targetSize < 672) targetSize = 672
  }
  
  // Calcular proporciones
  const scale = targetSize / maxDimension
  let newWidth = Math.round(width * scale)
  let newHeight = Math.round(height * scale)
  
  // Forzar a múltiplos de 28
  newWidth = Math.round(newWidth / 28) * 28
  newHeight = Math.round(newHeight / 28) * 28
  
  // Asegurar mínimos
  if (newWidth < 28) newWidth = 28
  if (newHeight < 28) newHeight = 28
  
  console.log(`📏 Normalizado: ${width}x${height} → ${newWidth}x${newHeight} (múltiplo de 28)`)
  
  return { width: newWidth, height: newHeight }
}

/**
 * Construye una versión "segura" de la imagen para Qwen2.5-VL:
 * - Square (anchura==altura)
 * - Múltiplos de 28
 * - Tamaño mínimo 672, máximo 896
 * - Sin cambios de color/contraste agresivos (solo resize + padding)
 */
async function makeSafeImageForQwen(buffer, minSize = 672, maxSize = 896) {
  try {
    const img = sharp(buffer).rotate()
    const meta = await img.metadata()
    const width = meta.width || 0
    const height = meta.height || 0

    // Escalar hacia abajo si excede el maxSize
    let scale = 1
    const maxDim = Math.max(width, height)
    if (maxDim > maxSize) {
      scale = maxSize / maxDim
    }

    const targetShort = Math.round((Math.min(width, height) * scale))
    const scaledW = Math.round(width * scale)
    const scaledH = Math.round(height * scale)

    // Calcular lado objetivo como múltiplo de 28, asegurando al menos minSize
    const targetSide = Math.ceil(Math.max(minSize, Math.max(scaledW, scaledH)) / 28) * 28

    // Redimensionar dentro del cuadro objetivo
    const resized = await img.resize({ width: scaledW, height: scaledH, fit: 'inside', kernel: 'lanczos3' }).toBuffer()

    const padLeft = Math.floor((targetSide - scaledW) / 2)
    const padRight = targetSide - scaledW - padLeft
    const padTop = Math.floor((targetSide - scaledH) / 2)
    const padBottom = targetSide - scaledH - padTop

    const final = await sharp(resized)
      .extend({
        top: padTop > 0 ? padTop : 0,
        bottom: padBottom > 0 ? padBottom : 0,
        left: padLeft > 0 ? padLeft : 0,
        right: padRight > 0 ? padRight : 0,
        background: { r: 255, g: 255, b: 255 }
      })
      .jpeg({ quality: 98, progressive: false })
      .toBuffer()

    const m = await sharp(final).metadata()
    console.log(`🔒 Imagen segura: ${m.width}x${m.height} (múltiplos de 28)`)
    return final
  } catch (err) {
    console.warn('⚠️ No se pudo generar imagen segura para Qwen:', err.message)
    throw err
  }
}

/**
 * Optimiza la imagen para análisis más rápido:
 * - Normaliza a múltiplos de 28x28 (requerido por Qwen2.5-VL)
 * - Convierte a escala de grises (reduce tamaño ~66%)
 * - Auto-recorta el documento detectando bordes
 * - Aumenta contraste para mejor OCR
 * - Comprime para reducir tokens
 * 
 * @param {Buffer} imageBuffer - Buffer de la imagen original
 * @returns {Promise<{optimized: string, original: string, metadata: object}>}
 */
async function optimizeImageForAI(imageBuffer) {
  try {
    const image = sharp(imageBuffer)
    const metadata = await image.metadata()
    
    console.log('📐 Imagen original:', metadata.width, 'x', metadata.height, metadata.format)
    
    // Normalizar dimensiones a múltiplos de 28 (requerido por Qwen2.5-VL)
    const normalized = normalizeToMultipleOf28(metadata.width, metadata.height, 896)
    
    // Crear versión optimizada para el modelo (procesamiento muy suave)
    // Estrategia:
    //  - Evitar cambios de color o brillo (no greyscale, no normalize, no sharpen)
    //  - No escalar si la imagen está por debajo de maxSize; solo hacer downscale si es necesario
    //  - Rellenar (pad) para llegar a múltiplos de 28 en lugar de recortar o deformar la imagen
    const maxSize = 896

    // Calcular dimensiones de resize (solo si el lado mayor > maxSize)
    let resizeWidth = metadata.width
    let resizeHeight = metadata.height
    if (Math.max(metadata.width, metadata.height) > maxSize) {
      const scale = maxSize / Math.max(metadata.width, metadata.height)
      resizeWidth = Math.round(metadata.width * scale)
      resizeHeight = Math.round(metadata.height * scale)
      console.log(`🔽 Downscale aplicado: ${metadata.width}x${metadata.height} → ${resizeWidth}x${resizeHeight}`)
    }

    // Calcular dimensiones objetivo como múltiplos de 28 (usamos ceil para pad)
    const targetWidth = Math.ceil(resizeWidth / 28) * 28
    const targetHeight = Math.ceil(resizeHeight / 28) * 28

    const padLeft = Math.floor((targetWidth - resizeWidth) / 2)
    const padRight = targetWidth - resizeWidth - padLeft
    const padTop = Math.floor((targetHeight - resizeHeight) / 2)
    const padBottom = targetHeight - resizeHeight - padTop

    // Preparar el pipeline mínimo: resize si aplicó, luego pad para alcanzar múltiplos de 28
    let pipeline = image.clone()
    if (resizeWidth !== metadata.width || resizeHeight !== metadata.height) {
      pipeline = pipeline.resize(resizeWidth, resizeHeight, { fit: 'inside', kernel: 'lanczos3' })
    }

    pipeline = pipeline.extend({
      top: padTop > 0 ? padTop : 0,
      bottom: padBottom > 0 ? padBottom : 0,
      left: padLeft > 0 ? padLeft : 0,
      right: padRight > 0 ? padRight : 0,
      background: { r: 255, g: 255, b: 255 }
    })

    // Comprimir suavemente (quality alto para preservar detalles y color)
    const optimizedBuffer = await pipeline
      .jpeg({ quality: 98, progressive: false })
      .toBuffer()
    
    const optimizedMeta = await sharp(optimizedBuffer).metadata()
    
    // Verificar que las dimensiones sean múltiplos de 28
    if (optimizedMeta.width % 28 !== 0 || optimizedMeta.height % 28 !== 0) {
      console.warn(`⚠️ ADVERTENCIA: Dimensiones NO son múltiplos de 28: ${optimizedMeta.width}x${optimizedMeta.height}`)
    } else {
      console.log(`✅ Dimensiones verificadas: ${optimizedMeta.width}x${optimizedMeta.height} (${optimizedMeta.width/28}x${optimizedMeta.height/28} parches)`)
    }
    
    const originalBase64 = imageBuffer.toString('base64')
    const optimizedBase64 = optimizedBuffer.toString('base64')
    
    // Verificar que el base64 sea puro (sin prefijos)
    if (optimizedBase64.includes('data:') || optimizedBase64.includes(';base64,')) {
      throw new Error('Base64 contiene prefijos inválidos')
    }
    
    const reduction = ((1 - (optimizedBase64.length / originalBase64.length)) * 100).toFixed(1)
    
    console.log('✂️ Imagen procesada (mínimo):', optimizedMeta.width, 'x', optimizedMeta.height)
    console.log('📊 Cambio de tamaño:', reduction + '%', 
                `(${originalBase64.length} → ${optimizedBase64.length} caracteres)`)
    
    return {
      optimized: optimizedBase64,
      original: originalBase64,
      metadata: {
        original: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: originalBase64.length
        },
        optimized: {
          width: optimizedMeta.width,
          height: optimizedMeta.height,
          format: 'jpeg',
          size: optimizedBase64.length
        },
        reduction: `${reduction}%`
      }
    }
  } catch (error) {
    console.warn('⚠️ Error optimizando imagen, usando original:', error.message)
    const originalBase64 = imageBuffer.toString('base64')
    return {
      optimized: originalBase64,
      original: originalBase64,
      metadata: { error: error.message }
    }
  }
}

// Prompts optimizados para obtener JSON estructurado
const PROMPTS = {
  factura: `Analiza la factura/remito y genera un JSON detallado.
REGLAS TÉCNICAS:
  Es importante que seas un excelente contador, data entry que quiere documentar todos los aspectos de la factura.
- DECIMALES: Prioridad derecha (ej: 1.200,50 -> coma es decimal). Eliminar "$" y espacios.
- NUMÉRICOS: Devuelve los valores numéricos PUROS (por ejemplo: 1234.56). No devuelvas símbolos monetarios ni formatos con puntos/miles o comas como strings; normaliza a número.
- STOCK/MANUSCRITO: Texto a mano manda. Tachado = Cantidad 0. Notas de pago/deuda a "anotaciones_marginales".
- DEVOLUCIONES: Si dice "Devolución" o similar (puede tener typos), marca "es_devolucion": true y entrega el valor como negativo en el subtotal (ej: -123.45) y también agrega la suma absoluta en "totales.devoluciones_total".
- PACKAGING: Mapear "Caja 15x 200g" -> {tipo: "CAJA", unidades: 15, base: "200g"}.
- NOMBRES_PRODUCTOS: Es importante que extraigas todo lo que puedas del nombre, intentando mantener la coherencia, sin abreviaturas raras.
- ANOTACIONES: Captura todo lo que puedas del texto manuscrito, analizando su contexto (ej: "PAGADO", "ANULADO", "PARCIAL", "DEBE", "ENTREGUÉ $XXX", restas inferidas, etc) y guárdalo en "extras.texto_mano" o en "documento.anotaciones_marginales" según corresponda.
- CUENTA_CORRIENTE: Extrae cualquier saldo o estado de cuenta mencionado (ACTIVA, DEBE, A FAVOR) y pagos parciales/excedentes.

JSON SCHEMA (IMPORTANTE - devuelve SOLO JSON):
{
  "documento": { "tipo": "", "numero": "", "fecha": "DD/MM/AAAA", "estado_pago": "", "monto_pagado": 0, "cuenta_corriente": { "estado": "", "monto": 0 }, "anotaciones_marginales": "" },
  "emisor": { "nombre": "", "cuit": "", "telefono": "", "iva": "", "direccion_completa_manual": "", "emails": [], "datos_bancarios": { "banco": "", "cbu": "", "alias": "" } },
  "items": [{ "ordenEnFactura":0, "descripcion_exacta": "", "nombre_producto": "", "tipo_presentacion_nombre": "", "unidades_por_presentacion": 1, "presentacion_base": "", "cantidad_documento": 0, "precio_unitario": 0, "subtotal_original": 0, "subtotal_calculado": 0, "es_devolucion": false, "descuento": 0, "observaciones": "" }],
  "totales": {
     "subtotal_items": 0,                       // suma neta de subtotales (incluye devoluciones negativas)
     "devoluciones_total": 0,                  // suma absoluta de devoluciones (positiva, para mostrar como '- $X')
     "descuento_total": 0,                     // monto total de descuentos aplicados
     "descuentos": [],                         // listado detallado de descuentos (opcional)
     "recargos_total": 0,
     "impuestos_total": 0,                     // suma de todos los impuestos
     "impuestos": [{ "nombre": "", "tipo": "", "monto": 0 }], // desglose por impuesto
     "total_impreso": 0,
     "total_calculado": 0,
     "diferencia": 0,
     "detalle_diferencia": ""
  },
  "extras": { "texto_mano": "" }
}

NOTA: Si algún campo no aplica, devuelve el valor numérico 0 o una lista vacía. Para las devoluciones: además de marcar "es_devolucion": true en el item, incluye su monto en "devoluciones_total" como valor positivo (UI lo mostrará como -).`,
  }

const pepe = {
  factura: `Actúa como un experto en auditoría fiscal y gestión de inventarios. Analiza la imagen y extrae un JSON respetando estas reglas:
          1. HEURÍSTICA NUMÉRICA (CRÍTICO):
            - Prioridad decimal: Si hay un separador seguido de 1 o 2 dígitos al final (ej: "120.7" o "1234,5") -> DECIMAL.
            - Doble separador: "1.234,50" -> Punto MILES, Coma DECIMAL.
            - Símbolos: Elimina "$", " " y sufijos ".-".
            - Devoluciones/Notas de Crédito: Deben ser valores NEGATIVOS, remover la palabra devolucion del nombre del articulo usar solo el valor "es_devolucion".

          1.1. EXTRACCIÓN DEL EMISOR (DETALLE DE MEMBRETE):
            Captura todos los datos del emisor para permitir la creación de un nuevo contacto. Usa estos campos exactos del schema:
            - nombre: Razón social o nombre principal.
            - cuit: Extraer con guiones si están presentes (ej: 30-50554465-6).
            - telefono: Si hay varios, sepáralos por coma.
            - iva: Condición frente al IVA (Responsable Inscripto, Monotributo, etc.).
            - DIRECCIONES: Extraer calle, número, localidad y provincia del membrete.
            - EMAILS: Buscar cualquier dirección de correo electrónico.
            - CUENTA_BANCARIA: Buscar CBU, Alias o Banco si figuran para pagos.


          2. CONCILIACIÓN Y ANOTACIONES MANUSCRITAS:
            - El bolígrafo mata la imprenta: Si algo está tachado, cantidad = 0.
            - Pero si algo esta circulado o con un tilde o puntito es probable que sea revisado y válido. tambien contemplarlo y registrarlo.
            - Intentar capturar todo el texto escrito a mano, analizar su contexto y guardar lo que se entendio y lo que dice.enviarlo en json como extras
            - Restas inferidas: Si hay un "-24" anotado, deduce a qué ítem afecta según su precio unitario y ajusta el stock.
            - Estados: Busca "PAGADO", "ANULADO", "PARCIAL", "DEBE", "ENTREGUÉ $XXX".

          3. CUENTA CORRIENTE Y PAGOS:
            - Extrae cualquier saldo anterior o estado de cuenta mencionado (ACTIVA, DEBE, A FAVOR).
            - Si hay una anotación de pago parcial o excedente, capturarla.

          4. LÓGICA DE PRESENTACIONES (SCHEMA PRISMA):
            - Clasifica 'tipo_presentacion_nombre' según los tipos válidos (CAJA, PACK, BOLSÓN, UNIDAD, etc.).
            - Mapea: "Caja 15x 200g" -> tipo_presentacion_nombre: "CAJA", unidades_por_presentacion: 15, presentacion_base: "200g".
            - Si dice algo similar a devolucion, marca el ítem como es_devolucion: true y ajusta cantidades/precios en consecuencia y asumi que el produucto es el mismo sin la palabra devolucion, y que puede estar truncado, ayudate por codgos y contexto.

            6. CÁLCULO DE DIFERENCIAS:
            - Compara el 'total_impreso' contra el 'total_calculado' (post-tachaduras y ajustes). Indica la diferencia exacta.

          6. TOLERANCIA A ERRORES DE OCR/IMPRESIÓN (FUZZY MATCHING):
            - Si detectas palabras con caracteres extraños (ej: "Devoluci|n", "Factur@", "C@ntidad"), interprétalas por contexto contable.
            - "Devoluci|n" -> debe entenderse como "Devolución" y activar la lógica de valores NEGATIVOS (es_devolucion: true).
            - Ignora prefijos de sistema entre corchetes (ej: "[D552]") para el nombre del producto, pero mantelos en 'descripcion_exacta' entendiendo que son codigos propios del proveedor que luego se pueden usar para entender que se esta devolviendo.

          RESPONDE EXCLUSIVAMENTE EN ESTE FORMATO JSON:
          {
            "documento": {
              "tipo": "", "numero": "", "fecha": "DD/MM/AAAA",
              "estado_pago": "", "monto_pagado": 0,
              "cuenta_corriente": { "estado": "", "monto": 0 },
              "anotaciones_marginales": ""
            },
            "emisor": {
              "nombre": "",
              "cuit": "",
              "telefono": "",
              "iva": "",
              "direccion_completa_manual": "", 
              "emails": [],
              "datos_bancarios": { "banco": "", "cbu": "", "alias": "" },
              "inicio_actividades": ""
            },
            "items": [{
              "descripcion_exacta": "",
              "nombre_producto": "",
              "tipo_presentacion_nombre": "", 
              "unidades_por_presentacion": 1, 
              "presentacion_base": "",
              "cantidad_documento": 0,
              "precio_unitario": 0,
              "subtotal_original": 0,
              "subtotal_calculado": 0,
              "es_devolucion": false,
              "observaciones": ""
            }],
            "totales": {
              "total_impreso": 0,
              "total_calculado": 0,
              "diferencia": 0,
              "detalle_diferencia": ""
            }
          }`,


  producto: `Analiza este producto y extrae la información en formato JSON:
              {
                "marca": "nombre de la marca",
                "nombre": "nombre del producto",
                "presentacion": "descripción de la presentación (ej: 500g, 1L, pack x12)",
                "codigo_barras": "código de barras si es visible",
                "categorias": ["categoría1", "categoría2"],
                "descripcion": "descripción visible en el envase"
              }

              Responde SOLO con el JSON, sin texto adicional.`,

                general: `Describe detalladamente qué ves en esta imagen. Incluye:
              - Objetos principales
              - Texto visible
              - Colores predominantes
              - Cualquier información relevante`
              }

export async function POST(req) {
  try {
    const tStart = Date.now()
    console.log('🖼️ Iniciando análisis de imagen...')
    
    const formData = await req.formData()
    const image = formData.get('image')
    const model = formData.get('model') || 'minicpm-v'
    const mode = formData.get('mode') || 'general'
    
    if (!image) {
      console.error('❌ No se recibió imagen')
      const tNow = Date.now()
      return NextResponse.json({ ok: false, error: 'No se recibió imagen', metadata: { timing: { totalMs: tNow - tStart, human: `${tNow - tStart}ms` } } }, { status: 400 })
    }

    console.log('📋 Parámetros:', { 
      model, 
      mode, 
      fileName: image.name, 
      fileSize: image.size,
      fileType: image.type 
    })

    // Convertir imagen a buffer
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Optimizar imagen para el modelo (grises, auto-crop, compresión)
    console.log('🔧 Optimizando imagen para análisis...')
    const { optimized, original, metadata: imageMeta } = await optimizeImageForAI(buffer)
    
    console.log('✅ Imágenes preparadas:')
    console.log('   - Original:', imageMeta.original?.size || original.length, 'chars')
    console.log('   - Optimizada:', imageMeta.optimized?.size || optimized.length, 'chars')
    if (imageMeta.reduction) console.log('   - Reducción:', imageMeta.reduction)

    // Usar directamente la API de Ollama (compatible con v1)
    const prompt = PROMPTS[mode] || PROMPTS.general
    
    console.log('✅ Usando SDK oficial de Ollama')
    console.log('📤 Enviando a Ollama...')
    console.log('   - Modelo:', model)
    console.log('   - Modo:', mode)
    console.log('   - Tamaño imagen optimizada:', optimized.length, 'chars')
    const tBeforeOllama = Date.now()
    
    let data
    let tAfterOllama
    
    try {
      console.log('🔄 Generando con SDK de Ollama...')
      
      // El SDK de Ollama espera un array de strings base64 (sin el prefijo data:image)
      // Ya tenemos optimized como base64 string puro
      let response
      try {
        response = await ollama.generate({
          model: model,
          prompt: prompt,
          images: [optimized], // Array de base64 strings
          stream: false,
          format: 'json',
          options: {
            temperature: 0,
            num_ctx: 4096
          }
        })
      } catch (firstErr) {
        const firstMsg = String(firstErr.message || firstErr)
        // Si detectamos GGML_ASSERT (error de shape/dimensiones), intentar reintento con imagen "segura"
        if (/GGML_ASSERT|assert\(|panic/i.test(firstMsg) || (/an error was encountered while running the model/i.test(firstMsg) && model && /qwen/i.test(model))) {
          console.warn('⚠️ Error GGML_ASSERT detectado en Ollama. Intentando reintento con imagen segura (square, múltiplos de 28)...')
          try {
            // Crear buffer desde base64 y generar versión segura
            const optimizedBuffer = Buffer.from(optimized, 'base64')
            const safeBuffer = await makeSafeImageForQwen(optimizedBuffer)
            const safeBase64 = safeBuffer.toString('base64')

            // Auditoría de intento de fallback
            try {
              await prisma.auditLog.create({
                data: {
                  accion: 'OLLAMA_FAILURE',
                  detalles: { fallback: true, model, originalFile: image.name },
                  userId: 'sistema'
                }
              })
            } catch (audErr) {
              console.warn('⚠️ No se pudo registrar auditoría de fallback Ollama:', audErr.message)
            }

            // Reintentar con la imagen segura
            response = await ollama.generate({
              model: model,
              prompt: prompt,
              images: [safeBase64],
              stream: false,
              format: 'json',
              options: {
                temperature: 0,
                num_ctx: 4096
              }
            })
            console.log('✅ Reintento con imagen segura exitoso')
          } catch (retryErr) {
            // Si falla el reintento, propagar el error para que entre al catch principal
            throw retryErr
          }
        } else {
          throw firstErr
        }
      }

      tAfterOllama = Date.now()
      console.log(`✅ Respuesta recibida en ${((tAfterOllama - tBeforeOllama) / 1000).toFixed(1)}s`)
      
      // El SDK devuelve la respuesta en response.response
      data = {
        response: response.response,
        model: response.model || model,
        created_at: response.created_at,
        done: response.done
      }
      
      console.log('📦 Estructura de respuesta:', Object.keys(response))
      
    } catch (ollamaError) {
      tAfterOllama = Date.now()
      
      console.error('❌ Error de Ollama SDK:', ollamaError)
      
      const errorMsg = ollamaError.message || String(ollamaError)
      let userMsg = errorMsg
      
      // Detectar errores internos del modelo
      if (/GGML_ASSERT|assert\(|panic/i.test(errorMsg)) {
        userMsg = `Error interno del modelo: ${errorMsg.split('\n')[0]}. Intenta reintentar o usa otro modelo.`
      }
      
      try {
        await guardarAuditoriaOllamaFailure({ 
          model, 
          mode, 
          fileName: image.name, 
          fileSize: image.size, 
          responseStatus: 500, 
          errorText: userMsg, 
          timing: { before: tBeforeOllama, after: tAfterOllama } 
        })
      } catch (audErr) {
        console.warn('⚠️ No se pudo guardar auditoría de fallo Ollama:', audErr.message)
      }
      
      return NextResponse.json({ 
        ok: false, 
        error: `Error de Ollama: ${userMsg}`,
        retryable: true
      }, { status: 500 })
    }
    
    let responseText = data.response || ''
    let parsedData = null
    console.log('📝 Respuesta texto (primeros 500 chars):', responseText.substring(0, 500))
    const tAfterParsing = Date.now()
    if (mode === 'factura' || mode === 'producto') {
      try {
        // Extraer JSON de la respuesta
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0])
          console.log('✅ JSON parseado exitosamente')
          console.log('📊 Estructura JSON:', Object.keys(parsedData))
          
          // POST-PROCESAMIENTO: Corregir números argentinos mal interpretados
          if (mode === 'factura' && parsedData) {
            // Normalizar: productos → items, itens → items
            if (parsedData.productos && !parsedData.items) {
              parsedData.items = parsedData.productos
              delete parsedData.productos
              console.log('✅ Normalizado: productos → items')
            }
            if (parsedData.itens && !parsedData.items) {
              parsedData.items = parsedData.itens
              delete parsedData.itens
              console.log('✅ Normalizado: itens → items')
            }
            
            // Normalizar número del documento
            if (parsedData.documento) {
              if (parsedData.documento.número_completo && !parsedData.documento.numero) {
                parsedData.documento.numero = parsedData.documento.número_completo
              }
            }
            
            // Corregir totales
            if (parsedData.totales) {
              const getNumber = (v) => {
                if (v === undefined || v === null || v === '') return undefined
                const n = Number(v)
                return Number.isFinite(n) ? n : fixArgentineNumber(v)
              }

              // Valores base
              parsedData.totales.neto = getNumber(parsedData.totales.neto)
              parsedData.totales.iva = getNumber(parsedData.totales.iva)
              parsedData.totales.total = getNumber(parsedData.totales.total)

              // Detectar descuentos en múltiples variantes y normalizarlos
              const discountKeys = ['descuento_total','descuentos','descuento','descuentos_total','total_descuento']
              let dval = undefined
              for (const k of discountKeys) {
                if (parsedData.totales[k] !== undefined && parsedData.totales[k] !== null && parsedData.totales[k] !== '') {
                  dval = getNumber(parsedData.totales[k])
                  break
                }
              }

              // Si 'descuentos' viene como array con detalles, sumar sus montos
              if ((dval === undefined || dval === null) && Array.isArray(parsedData.totales.descuentos)) {
                const sumFromArray = parsedData.totales.descuentos.reduce((s, x) => s + (getNumber(x.monto) || getNumber(x.valor) || 0), 0)
                dval = sumFromArray || dval
              }

              // Si no viene, sumar descuentos por ítem
              if ((dval === undefined || dval === null) && Array.isArray(parsedData.items)) {
                const sumItemsDiscount = parsedData.items.reduce((s, it) => s + (Number(it.descuento || 0)), 0)
                dval = sumItemsDiscount || 0
              }

              // Normalizar: almacenar como número POSITIVO representando el monto total de descuentos
              parsedData.totales.descuento_total = Math.abs(Number(dval || 0))

              // Manejar impuestos detallados (array) para extraer IVA y total si existen
              if (parsedData.totales.impuestos && Array.isArray(parsedData.totales.impuestos)) {
                // Buscar entradas que contengan 'iva' en su nombre
                const ivaItems = parsedData.totales.impuestos.filter(i => /iva/i.test(i.nombre || '') || /iva/i.test(String(i.tipo || '')))
                if (ivaItems.length > 0) {
                  parsedData.totales.iva = ivaItems.reduce((s, x) => s + (getNumber(x.monto) || 0), 0)
                }

                // Calcular impuestos_total como suma de montos si no viene explícito
                const impuestosSum = parsedData.totales.impuestos.reduce((s, x) => s + (getNumber(x.monto) || getNumber(x.valor) || 0), 0)
                if ((parsedData.totales.impuestos_total === undefined || parsedData.totales.impuestos_total === null) && impuestosSum) {
                  parsedData.totales.impuestos_total = impuestosSum
                }
              }

              // Asegurar total_impreso si el modelo lo reconoció (raw)
              parsedData.totales.total_impreso = (getNumber(parsedData.totales.total_impreso) !== undefined ? getNumber(parsedData.totales.total_impreso) : undefined)

              // Propuesta de cálculo determinista: sumar items y generar valores calculados por el backend (NO confiar en cálculos del LLM)
              if (Array.isArray(parsedData.items)) {
                const sumNeto = parsedData.items.reduce((s, it) => {
                  const unit = Number(it.precio_unitario ?? it.precio ?? 0)
                  const qty = Number(it.cantidad_documento ?? it.cantidad ?? 0)
                  const lineRaw = (it.subtotal_calculado ?? it.subtotal_original ?? it.subtotal ?? (unit * qty))
                  const line = Number(lineRaw || 0)
                  return s + (isFinite(line) ? line : 0)
                }, 0)

                parsedData.totales.sugerido = parsedData.totales.sugerido || {}
                parsedData.totales.sugerido.subtotal_items = sumNeto

                // Calcular devoluciones_total (suma absoluta de items marcados como devolución o con subtotales negativos)
                const devolucionesSum = parsedData.items.reduce((s, it) => {
                  const rawLine = (it.subtotal_calculado ?? it.subtotal_original ?? it.subtotal)
                  const line = Number(rawLine ?? 0)
                  const isDevol = !!it.es_devolucion || !!it.devolucion || (line < 0)
                  return s + (isDevol ? Math.abs(line) : 0)
                }, 0)
                parsedData.totales.devoluciones_total = devolucionesSum

                // Determinar descuento a usar para cálculos con prioridad:
                // 1) totales.descuento_ticket (si LLM lo reconoció en totales)
                // 2) arreglo totales.descuentos (sumatoria)
                // 3) suma de descuentos por item
                let descuentoTicket = undefined
                const discountKeys = ['descuento_total','descuentos','descuento','descuentos_total','total_descuento']
                for (const k of discountKeys) {
                  if (parsedData.totales[k] !== undefined && parsedData.totales[k] !== null && parsedData.totales[k] !== '') {
                    descuentoTicket = getNumber(parsedData.totales[k])
                    break
                  }
                }
                if ((descuentoTicket === undefined || descuentoTicket === null) && Array.isArray(parsedData.totales.descuentos)) {
                  const sumFromArray = parsedData.totales.descuentos.reduce((s, x) => s + (getNumber(x.monto) || getNumber(x.valor) || 0), 0)
                  if (sumFromArray) descuentoTicket = sumFromArray
                }
                if ((descuentoTicket === undefined || descuentoTicket === null) && Array.isArray(parsedData.items)) {
                  const sumItemsDiscount = parsedData.items.reduce((s, it) => s + (Number(it.descuento || 0)), 0)
                  descuentoTicket = sumItemsDiscount || 0
                }

                parsedData.totales.descuento_ticket = Number(descuentoTicket || 0)
                parsedData.totales.descuento_total = Math.abs(Number(parsedData.totales.descuento_ticket || 0))

                const impuestos_total = Number(parsedData.totales.impuestos_total ?? parsedData.totales.iva ?? 0)
                const recargos = Number(parsedData.totales.recargos_total ?? 0)

                // Calcular total_calculado en backend de forma determinista
                const totalCalculadoComputed = Number((sumNeto - parsedData.totales.descuento_total + recargos + impuestos_total).toFixed(2))

                // Si el LLM proporcionó un total_calculado, lo sobrescribimos y lo guardamos como referencia
                if (getNumber(parsedData.totales.total_calculado) !== undefined) {
                  parsedData.totales.total_calculado_model = getNumber(parsedData.totales.total_calculado)
                }

                parsedData.totales.total_calculado = totalCalculadoComputed
                parsedData.totales.sugerido = parsedData.totales.sugerido || {}
                parsedData.totales.sugerido.total_calculado = totalCalculadoComputed
              }

              // Calcular diferencia sugerida si es posible (no modificar campos reconocidos)
              if (typeof parsedData.totales.total_impreso === 'number') {
                const tc = (getNumber(parsedData.totales.total_calculado) !== undefined ? getNumber(parsedData.totales.total_calculado) : parsedData.totales.sugerido?.total_calculado)
                if (typeof tc === 'number') {
                  parsedData.totales.sugerido = parsedData.totales.sugerido || {}
                  parsedData.totales.sugerido.diferencia = Number((parsedData.totales.total_impreso - tc).toFixed(2))
                  if (Math.abs(parsedData.totales.sugerido.diferencia) > 0.01) {
                    parsedData.totales.revisar = true
                    parsedData.totales.sugerido.detalle = parsedData.totales.detalle_diferencia || 'Total impreso distinto a total calculado (sugerido)'
                  }
                }
              }

              console.log('💰 Totales normalizados:', parsedData.totales)
            }
            
            // Corregir totales_calculados si existen
            if (parsedData.totales_calculados) {
              parsedData.totales_calculados.neto = fixArgentineNumber(parsedData.totales_calculados.neto)
              parsedData.totales_calculados.iva = fixArgentineNumber(parsedData.totales_calculados.iva)
              parsedData.totales_calculados.total = fixArgentineNumber(parsedData.totales_calculados.total)
              console.log('🧮 Totales calculados normalizados:', parsedData.totales_calculados)
            }
            
            // Corregir items
            if (parsedData.items && Array.isArray(parsedData.items)) {
              console.log(`📦 Items encontrados: ${parsedData.items.length}`)
              console.log('📋 Primer item RAW:', JSON.stringify(parsedData.items[0], null, 2))

      const processedItems = []
      for (let idx = 0; idx < parsedData.items.length; idx++) {
        const item = parsedData.items[idx]

        // Normalizar campos con diferentes nombres
        // Sanitize and normalize description (remove newlines, collapse spaces)
        let descripcion = item.descripcion || item.nombre || item.detalle || item.producto || item.articulo || ''
        descripcion = String(descripcion).replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim()
        // Fix common OCR artifacts for 'Devolución' (e.g., 'Devoluci\n', 'Devoluci|n')
        descripcion = descripcion.replace(/devoluci[\W_]*n/ig, 'Devolución')
        descripcion = descripcion.replace(/devoluc[iy|i]\w*/ig, 'Devolución')
        const precio_unitario = item.precio_unitario || item.precio || 0
        const subtotal = item.subtotal || item.importe || item.total || 0

        const normalized = {
          ...item,
          descripcion,
          cantidad: fixArgentineNumber(item.cantidad),
          precio_unitario: fixArgentineNumber(precio_unitario),
          subtotal: fixArgentineNumber(subtotal),
          descuento: fixArgentineNumber(item.descuento || 0),
          impuestos: fixArgentineNumber(item.impuestos || 0),
          // Valores inferidos
          es_devolucion: false,
          descripcion_limpia: descripcion
        }

        // Detectar devoluciones por palabras clave y limpiar descripción
        try {
          const descLower = String(normalized.descripcion || '').toLowerCase()
          const isDevol = /devolu|devoluci|devoluci\w*|dev\b|devolución|devolución/i.test(descLower)

          if (isDevol) {
            normalized.es_devolucion = true

            // Limpiar tags y prefijos (ej: [D552] Devoluci|n ...)
            let cleaned = descripcion.replace(/\[[^\]]+\]/g, '')
            cleaned = cleaned.replace(/\bdevolu\w*\b|\bdev\b|\bdevolución\b/ig, '')
            cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-áéíóúÁÉÍÓÚ,]/g, '')
            cleaned = cleaned.replace(/\s+/g, ' ').trim()
            normalized.descripcion_limpia = cleaned || descripcion

            // Intentar inferir producto y presentacion desde la DB
            try {
              const producto = await prisma.productos.findFirst({
                where: {
                  OR: [
                    { nombre: { contains: normalized.descripcion_limpia, mode: 'insensitive' } },
                    { descripcion: { contains: normalized.descripcion_limpia, mode: 'insensitive' } },
                    { presentaciones: { some: { nombre: { contains: normalized.descripcion_limpia, mode: 'insensitive' } } } }
                  ]
                },
                include: {
                  presentaciones: {
                    select: { id: true, nombre: true, cantidad: true, unidadMedida: true, esUnidadBase: true }
                  }
                }
              })

              if (producto) {
                // Intentar emparejar presentación por nombre
                let presentacionMatch = null
                const descForMatch = normalized.descripcion_limpia.toLowerCase()
                for (const p of producto.presentaciones || []) {
                  if (!p.nombre) continue
                  if (descForMatch.includes(p.nombre.toLowerCase()) || p.nombre.toLowerCase().includes(descForMatch)) {
                    presentacionMatch = p
                    break
                  }
                }

                // Si no se encontró, intentar heurística por 'kg', 'g', 'l', 'unid'
                if (!presentacionMatch && producto.presentaciones && producto.presentaciones.length) {
                  presentacionMatch = producto.presentaciones.find(p => /kg|g|l|ml|pack|unid|unidad/i.test(p.nombre)) || producto.presentaciones[0]
                }

                normalized.productoInferido = { id: producto.id, nombre: producto.nombre }
                if (presentacionMatch) normalized.presentacionInferida = { id: presentacionMatch.id, nombre: presentacionMatch.nombre }

                // Para devoluciones: acción sobre stock
                normalized.stockAction = 'in' // devolución aumenta stock
                normalized.stockDelta = Math.abs(Number(normalized.cantidad) || 0)

                console.log('🔎 Devolución detectada - producto inferido:', normalized.productoInferido, 'presentacion:', normalized.presentacionInferida)
              } else {
                console.log('🔎 Devolución detectada pero no se pudo inferir producto:', normalized.descripcion_limpia)
              }
            } catch (dbErr) {
              console.warn('⚠️ Error consultando DB para inferir producto de devolución:', dbErr.message)
            }
          }
        } catch (errDevol) {
          console.warn('⚠️ Error detectando devoluciones:', errDevol.message)
        }

        // Eliminar campo 'nombre' si existe para evitar confusión
        if (normalized.nombre && normalized.descripcion) {
          delete normalized.nombre
        }

        if (idx === 0) {
          console.log('🔄 Primer item NORMALIZADO:', JSON.stringify(normalized, null, 2))
        }

        processedItems.push(normalized)
      }

      parsedData.items = processedItems
              console.warn('⚠️ No se encontraron items en parsedData')
            }
            
            console.log('✅ Números corregidos:', JSON.stringify(parsedData.totales))
            console.log('📦 Items finales:', parsedData.items ? parsedData.items.length : 0)

            // Normalizar información de pago / cuenta corriente si existe
            if (parsedData.documento) {
              const pagoEstado = parsedData.documento.estado_pago || parsedData.documento.pago_estado || (parsedData.pago && (parsedData.pago.estado || parsedData.pago.estado_pago)) || null
              if (pagoEstado) parsedData.documento.estado_pago = String(pagoEstado).toUpperCase()

              const montoPagadoRaw = parsedData.documento.monto_pagado ?? (parsedData.pago ? (parsedData.pago.monto_pagado ?? parsedData.pago.monto) : null)
              if (montoPagadoRaw !== null && montoPagadoRaw !== undefined && montoPagadoRaw !== '') {
                const num = Number(montoPagadoRaw)
                parsedData.documento.monto_pagado = Number.isFinite(num) ? fixArgentineNumber(num) : parsedData.documento.monto_pagado
              }

              const cuentaCorriente = parsedData.documento.cuenta_corriente || parsedData.cuenta_corriente || (parsedData.pago && parsedData.pago.cuenta_corriente) || null
              if (cuentaCorriente) parsedData.documento.cuenta_corriente = String(cuentaCorriente)

              // Inferir si está pagada (monto_pagado >= total) o si estado contiene 'PAGAD'
              if (typeof parsedData.documento.monto_pagado === 'number' && parsedData.totales && typeof parsedData.totales.total === 'number') {
                parsedData.documento.pagado = parsedData.documento.monto_pagado >= parsedData.totales.total - 0.01
              } else if (parsedData.documento.estado_pago) {
                parsedData.documento.pagado = /PAGAD/i.test(parsedData.documento.estado_pago)
              }

              console.log('💳 Pago normalizado:', parsedData.documento.estado_pago, parsedData.documento.monto_pagado, parsedData.documento.cuenta_corriente, parsedData.documento.pagado)
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ No se pudo parsear JSON, retornando texto plano')
      }
    }

    const tEnd = Date.now()
    const timing = {
      totalMs: tEnd - tStart,
      ollamaMs: (typeof tBeforeOllama !== 'undefined' && typeof tAfterOllama !== 'undefined') ? (tAfterOllama - tBeforeOllama) : undefined,
      parseMs: (typeof tAfterParsing !== 'undefined') ? (tAfterParsing - tAfterOllama) : undefined,
      human: `${(tEnd - tStart)}ms`
    }

    console.log('⏱️ Tiempos:', timing)

    return NextResponse.json({ 
      ok: true, 
      text: responseText,
      data: parsedData,
      metadata: {
        model: data.model,
        fileName: image.name,
        fileSize: image.size,
        fileType: image.type,
        mode: mode,
        timing,
        image: {
          original: original, // Imagen original sin modificar (para BD)
          optimized: optimized, // Imagen optimizada usada en análisis
          ...imageMeta // Metadatos de optimización (dimensiones, reducción, etc)
        }
      }
    })

  } catch (error) {
    const tNow = Date.now()
    console.error('❌ Error general:', error)
    return NextResponse.json({ 
      ok: false, 
      error: error.message,
      details: error.stack,
      metadata: { timing: { totalMs: (typeof tStart !== 'undefined' ? (tNow - tStart) : undefined), human: typeof tStart !== 'undefined' ? `${tNow - tStart}ms` : undefined } }
    }, { status: 500 })
  }
}

/**
 * NO corregir números - Ollama ya devuelve formato internacional correcto
 * Punto = decimal, valores negativos = devoluciones válidas
 * 
 * Ejemplos:
 * - 100.5 = cien con cincuenta (100.50) ✓
 * - -2777.76 = devolución de dos mil setecientos con setenta y seis ✓
 * - 38.6 = treinta y ocho con sesenta (38.60) ✓
 */
function fixArgentineNumber(value) {
  // Retornar el valor tal cual - no aplicar ninguna transformación
  // La IA ya interpreta correctamente el formato
  return value
}
