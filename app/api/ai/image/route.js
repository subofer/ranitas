import { NextResponse } from 'next/server'
import sharp from 'sharp'
import prisma from '@/prisma/prisma'
import { guardarAuditoriaIaFailure } from '@/prisma/serverActions/facturaActions'

// Configuración de timeout para esta ruta (10 minutos)
// NOTE: Ollama external dependency removed; now we call local vision microservice which hosts Qwen
const VISION_HOST = process.env.VISION_HOST || 'http://vision:8000'
export const maxDuration = 600 // segundos
export const dynamic = 'force-dynamic'

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
  factura: `Analiza la imagen de la factura/remito y devuelve EXCLUSIVAMENTE un JSON estricto que cumpla exactamente con el esquema solicitado abajo. Responde SOLO con JSON, sin texto adicional ni explicaciones. Si algún campo no aplica, devuelve 0, false, "" o [] según corresponda.

REGLAS CLAVE (resumido y preciso):
- NUMÉRICOS: Devuelve todos los montos como números (tipo number). Usa punto decimal (1234.56). Elimina símbolos ($, ¢) y espacios.
- FORMATOS ARGENTINOS: Interpreta "1.234,50" como 1234.50, "1200,5" como 1200.50.
- DECIMALES: prioridad a la parte derecha si hay ambigüedad.
- DEVOLUCIONES: Si hay indicio o palabra "devolución"/"nota de crédito"/"devolu...", marca el ítem con "es_devolucion": true y su subtotal debe ser NEGATIVO en subtotal_original/subtotal_calculado. Además sumar su valor absoluto en totales.devoluciones_total (positivo).
- DESCUENTOS: Extrae descuentos por ítem como "descuento" (monto) y el total en "totales.descuento_total". Si hay descuentos detallados, devolverlos en "totales.descuentos" como array de { nombre, monto }.
- ITEMS: Cada item debe incluir cantidad_documento, precio_unitario, subtotal_original y subtotal_calculado (ambos numéricos). Si OCR no detecta alguno, usar 0.
- IMPUESTOS: Desglose por impuesto en "totales.impuestos" (nombre,tipo,monto) y sumar en "totales.impuestos_total".
- PAGOS/ESTADO: Si hay información de pago, devolver documento.monto_pagado (number) y documento.estado_pago (string) y marcar documento.pagado (boolean) si corresponde.
- NOTAS MANUSCRITAS/ANOTACIONES: Extraer texto manuscrito y colocarlo en extras.texto_mano y/o documento.anotaciones_marginales.
- ROBUSTEZ: Si detectás códigos, prefijos o tags (ej: [D552]), preservalos en descripcion_exacta pero intenta limpiar descripcion_limpia para emparejar productos.
- CONVERSIÓN A PRESENTACIONES (CRÍTICO): Para cada ítem intenta normalizar la "presentacion" en un objeto estandarizado y devuelve candidatos de mapeo. Por cada ítem devuelve los siguientes campos:
  - presentacion_normalizada: string (ej: "CAJA 12x500g" o "500g")
  - tipo_presentacion_nombre: string (CAJA, PACK, UNIDAD, BOLSON, etc.)
  - unidades_por_presentacion: number
  - presentacion_base: string (ej: "500g", "1L")
  - presentacion_candidates: [{ "nombre": "", "unidades_por_presentacion": 0, "presentacion_base": "", "confidence": 0.0, "match_tokens": "" }]
  - producto_candidates: [{ "nombre": "", "codigo_proveedor": "", "confidence": 0.0 }]
- CALCULOS: Devuelve también totales.total_calculado calculado como suma de items menos descuentos + impuestos + recargos. Si el LLM detecta un total impreso lo coloca en totales.total_impreso y calcular la diferencia en totales.diferencia.

JSON SCHEMA (devuelve SOLO este objeto):
{
  "documento": { "tipo": "", "numero": "", "fecha": "DD/MM/AAAA", "estado_pago": "", "monto_pagado": 0, "cuenta_corriente": { "estado": "", "monto": 0 }, "anotaciones_marginales": "" },
  "emisor": { "nombre": "", "cuit": "", "telefono": "", "iva": "", "direccion_completa_manual": "", "emails": [], "datos_bancarios": { "banco": "", "cbu": "", "alias": "" } },
  "items": [{ "ordenEnFactura":0, "descripcion_exacta":"", "descripcion_limpia":"", "nombre_producto":"", "presentacion_normalizada":"", "tipo_presentacion_nombre":"", "unidades_por_presentacion":1, "presentacion_base":"", "cantidad_documento":0, "precio_unitario":0, "descuento":0, "subtotal_original":0, "subtotal_calculado":0, "es_devolucion":false, "observaciones":"", "presentacion_candidates":[], "producto_candidates":[] }],
  "totales": { "subtotal_items":0, "devoluciones_total":0, "descuento_total":0, "descuentos":[], "recargos_total":0, "impuestos_total":0, "impuestos":[{"nombre":"","tipo":"","monto":0}], "total_impreso":0, "total_calculado":0, "diferencia":0, "detalle_diferencia":"" },
  "candidatos_presentaciones": [],
  "candidatos_productos": [],
  "extras": { "texto_mano":"" }
}

IMPORTANTE: Responde solo con el JSON exacto. No uses cadenas para montos ni agregues comentarios. Entrega valores numéricos siempre como numbers. Para los candidatos utiliza campos numéricos de confianza (0.0-1.0) y normaliza unidades (ej: 500g -> "500g" o "0.5kg"). Si hay ambigüedad en una cifra, intenta la interpretación contable más probable (coma como decimal si aplica).`,

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

// -----------------------------
// Heurística de fallback (JS)
// -----------------------------
function simpleInvoiceParserJS(text) {
  // Extract basic header and items using lightweight heuristics as a fallback
  if (!text || typeof text !== 'string') return null

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const dateRe = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  const cuitRe = /(\d{2}-\d{8}-\d|\d{11})/g
  const nroRe = /(?:Nro|Nº|Numero|Factura|Núm)[:\s]*([A-Za-z0-9\-\/]+)/i
  const moneyRe = /\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d{2})?/g

  const parsed = { emisor: { nombre: '', cuit: '' }, documento: { numero: '', fecha: null, totales: {} }, items: [] }

  if (lines.length) parsed.emisor.nombre = lines[0]

  // Find CUIT and date and nro in first 12 lines
  for (let i = 0; i < Math.min(12, lines.length); i++) {
    const l = lines[i]
    const cuit = (l.match(cuitRe) || [])[0]
    if (cuit && !parsed.emisor.cuit) parsed.emisor.cuit = cuit
    const d = l.match(dateRe)
    if (d && !parsed.documento.fecha) parsed.documento.fecha = d[1]
    const n = l.match(nroRe)
    if (n && !parsed.documento.numero) parsed.documento.numero = n[1]
  }

  // Totals: look for line with 'total' bottom-up
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 12); i--) {
    const l = lines[i].toLowerCase()
    if (l.includes('total')) {
      const m = (l.match(moneyRe) || [])
      if (m.length) {
        parsed.documento.totales.total = m[m.length - 1]
        break
      }
    }
  }

  // Items: look for lines with money patterns and 2-4 tokens at end (qty price subtotal)
  const itemCandidates = []
  for (const l of lines) {
    const m = l.match(moneyRe)
    if (m && m.length >= 1) {
      // tokenise
      const parts = l.split(/\s{2,}|\s\t|\t/).map(p => p.trim()).filter(Boolean)
      if (parts.length >= 2) itemCandidates.push(l)
    }
  }

  // Try extract qty, price, subtotal from candidate lines by tokenizing by spaces
  let orden = 1
  for (const l of itemCandidates) {
    const tokens = l.split(/\s+/).filter(Boolean)
    // heuristic: last 1-2 tokens are money
    const money = tokens.filter(t => /\d[\d\.,]+/.test(t))
    if (money.length >= 1) {
      const subtotal = money[money.length - 1]
      const precio = money.length >= 2 ? money[money.length - 2] : subtotal
      // description: tokens before first money token
      const firstMoneyIdx = tokens.findIndex(t => /\d[\d\.,]+/.test(t))
      const desc = tokens.slice(0, firstMoneyIdx).join(' ') || l
      parsed.items.push({ ordenEnFactura: orden++, descripcion_exacta: desc, descripcion_limpia: desc, cantidad_documento: null, precio_unitario: precio, subtotal_original: subtotal, descuento: 0, impuestos: 0, es_devolucion: false })
    }
  }

  return parsed
}

function validateParsedInvoice(parsed) {
  const errors = []
  if (!parsed) { errors.push('parsed_missing'); return errors }
  const nombre = parsed.emisor?.nombre || ''
  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 3 || /^\d+$/.test(nombre.trim())) errors.push('emisor_nombre_invalid')
  const cuit = parsed.emisor?.cuit || ''
  if (cuit && !/^(\d{2}-\d{8}-\d|\d{11})$/.test(String(cuit).trim())) errors.push('cuit_bad_format')
  const numero = parsed.documento?.numero || ''
  if (!numero || String(numero).trim().length < 2) errors.push('documento_numero_invalid')
  if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) errors.push('items_missing')
  // Validate item numbers
  const itemIssues = parsed.items.filter(it => {
    // description too short or numeric only
    const d = String(it.descripcion_exacta || it.descripcion_limpia || '')
    if (!d || d.trim().length < 2) return true
    // price/subtotal parsable
    const p = it.precio_unitario
    const s = it.subtotal || it.subtotal_original
    if (p === undefined || p === null || (String(p).trim() === '')) return true
    if (s === undefined || s === null || (String(s).trim() === '')) return true
    return false
  })
  if (itemIssues.length > 0) errors.push('items_bad')
  return errors
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

    // Usar directamente la API del microservicio vision (local Qwen)
    const prompt = PROMPTS[mode] || PROMPTS.general
    
    console.log('📤 Enviando imagen optimizada al microservicio vision para DocRes + OCR + Qwen...')
    console.log('   - Modelo sugerido por frontend:', model)
    console.log('   - Modo:', mode)
    console.log('   - Tamaño imagen optimizada:', optimized.length, 'chars')
    const tBeforeVision = Date.now()

    let data
    let tAfterVision

    try {
      // Convert optimized base64 to binary and attach as a Blob for FormData
      const optimizedBuffer = Buffer.from(optimized, 'base64')
      const form = new FormData()
      // Use Web Blob in Node (Node 18+ supports global Blob). Fallback to Buffer if not available.
      let blobForForm
      try {
        blobForForm = new Blob([optimizedBuffer], { type: 'image/jpeg' })
      } catch (e) {
        // older Node/builds may not have Blob global - use Buffer directly
        blobForForm = optimizedBuffer
      }

      // Append image; some runtimes expect (name, Blob, filename)
      try {
        form.append('image', blobForForm, image.name || 'upload.jpg')
      } catch (appendErr) {
        // As a last resort try object form to appease different FormData implementations
        form.append('image', blobForForm)
      }

      form.append('enhance', '1')
      form.append('mode', mode)
      try { form.append('model', model) } catch(e) { console.warn('Could not append model to form:', e.message) }
      // Send explicit prompt for invoices to the vision microservice so Docker Qwen uses the same schema
      try { form.append('prompt', prompt) } catch(e) { console.warn('Could not append prompt to form:', e.message) }

      // Forward optional flags if needed (could be exposed from frontend later)
      let resp
      try {
        resp = await fetch(`${VISION_HOST}/restore`, { method: 'POST', body: form })
      } catch (fetchErr) {
        console.error('❌ No se pudo conectar al microservicio vision:', fetchErr.message)

        // Intento de recuperación: si VISION_HOST apunta a 'vision', probar 'http://localhost:8000' para entornos de desarrollo
        if (VISION_HOST && VISION_HOST.includes('vision')) {
          try {
            console.info('🔁 Intentando fallback a http://localhost:8000 (entorno dev)')
            resp = await fetch('http://localhost:8000/restore', { method: 'POST', body: form })
          } catch (fallbackErr) {
            console.error('❌ Fallback a localhost falló:', fallbackErr.message)
            try {
              await guardarAuditoriaIaFailure({ model: 'qwen', mode, fileName: image.name, fileSize: image.size, responseStatus: 0, errorText: fallbackErr.message, timing: { before: tBeforeVision, after: Date.now() } })
            } catch (audErr) {
              console.warn('⚠️ No se pudo registrar auditoría de fallo IA:', audErr.message)
            }
            return NextResponse.json({ ok: false, error: 'Vision microservice not available', retryable: true }, { status: 502 })
          }
        } else {
          try {
            await guardarAuditoriaIaFailure({ model: 'qwen', mode, fileName: image.name, fileSize: image.size, responseStatus: 0, errorText: fetchErr.message, timing: { before: tBeforeVision, after: Date.now() } })
          } catch (audErr) {
            console.warn('⚠️ No se pudo registrar auditoría de fallo IA:', audErr.message)
          }
          return NextResponse.json({ ok: false, error: 'Vision microservice not available', retryable: true }, { status: 502 })
        }
      }

      tAfterVision = Date.now()
      if (!resp.ok) {
        const text = await resp.text()
        console.error('❌ Vision service returned error:', resp.status, text)

        // Si el error indica que vision no pudo identificar la imagen, intentar reenviar la imagen ORIGINAL (no optimizada)
        if (/cannot identify image file/i.test(text)) {
          console.warn('🔁 Vision no pudo identificar la imagen optimizada; reenviando imagen ORIGINAL como fallback')
          try {
            const originalBuffer = Buffer.from(original, 'base64')
            const fallbackForm = new FormData()
            let fallbackBlob
            try { fallbackBlob = new Blob([originalBuffer], { type: image.type || 'image/jpeg' }) } catch (e) { fallbackBlob = originalBuffer }
            try { fallbackForm.append('image', fallbackBlob, image.name || 'upload.jpg') } catch (e) { fallbackForm.append('image', fallbackBlob) }
            fallbackForm.append('enhance', '1')
            fallbackForm.append('mode', mode)
            try { fallbackForm.append('model', model) } catch(e) { console.warn('Could not append model to fallback form:', e.message) }

            let fallbackResp
            try {
              fallbackResp = await fetch(`${VISION_HOST}/restore`, { method: 'POST', body: fallbackForm })
            } catch (frErr) {
              console.error('❌ Fallback to vision with original image failed:', frErr.message)
              // Continue to record original error
            }

            if (fallbackResp && fallbackResp.ok) {
              const fv = await fallbackResp.json()
              console.log('✅ Fallback to original image succeeded')
              data = {
                response: fv.extraction ? (typeof fv.extraction === 'string' ? fv.extraction : JSON.stringify(fv.extraction)) : (fv.ocr_text || ''),
                model: fv.extraction_meta?.model || 'qwen',
                created_at: new Date().toISOString(),
                done: true,
                vision_meta: fv
              }
            } else {
              // No success re-sending original - record audit and return original error
              try {
                await guardarAuditoriaIaFailure({ model: 'qwen', mode, fileName: image.name, fileSize: image.size, responseStatus: resp.status, errorText: text, timing: { before: tBeforeVision, after: tAfterVision } })
              } catch (audErr) {
                console.warn('⚠️ No se pudo registrar auditoría de fallo IA:', audErr.message)
              }
              return NextResponse.json({ ok: false, error: 'Vision microservice error', details: text }, { status: 502 })
            }
          } catch (fallbackErr) {
            console.error('❌ Fallback processing failed:', fallbackErr)
            try {
              await guardarAuditoriaIaFailure({ model: 'qwen', mode, fileName: image.name, fileSize: image.size, responseStatus: resp.status, errorText: text, timing: { before: tBeforeVision, after: tAfterVision } })
            } catch (audErr) {
              console.warn('⚠️ No se pudo registrar auditoría de fallo IA:', audErr.message)
            }
            return NextResponse.json({ ok: false, error: 'Vision microservice error', details: text }, { status: 502 })
          }
        }

        try {
          await guardarAuditoriaIaFailure({ model: 'qwen', mode, fileName: image.name, fileSize: image.size, responseStatus: resp.status, errorText: text, timing: { before: tBeforeVision, after: tAfterVision } })
        } catch (audErr) {
          console.warn('⚠️ No se pudo registrar auditoría de fallo IA:', audErr.message)
        }
        return NextResponse.json({ ok: false, error: 'Vision microservice error', details: text }, { status: 502 })
      }

      const vdata = await resp.json()
      console.log('✅ Vision response received in', ((tAfterVision - tBeforeVision) / 1000).toFixed(2), 's')

      // Normalize into `data` (keeping compatibility with existing flow)
      data = {
        response: vdata.extraction ? (typeof vdata.extraction === 'string' ? vdata.extraction : JSON.stringify(vdata.extraction)) : (vdata.ocr_text || ''),
        model: vdata.extraction_meta?.model || 'qwen',
        created_at: new Date().toISOString(),
        done: true,
        vision_meta: vdata
      }

      console.log('📦 Estructura de respuesta vision:', Object.keys(vdata))
      
    } catch (visionErr) {
      tAfterVision = Date.now()

      console.error('❌ Error llamando al microservicio vision:', visionErr)

      const errorMsg = visionErr.message || String(visionErr)
      let userMsg = errorMsg

      // Detectar errores internos del modelo (si el texto contiene GGML_ASSERT)
      if (/GGML_ASSERT|assert\(|panic/i.test(errorMsg)) {
        userMsg = `Error interno del modelo: ${errorMsg.split('\n')[0]}. Intenta reintentar o usa otro modelo.`
      }

      try {
        await guardarAuditoriaIaFailure({ 
          model: 'qwen', 
          mode, 
          fileName: image.name, 
          fileSize: image.size, 
          responseStatus: 500, 
          errorText: userMsg, 
          timing: { before: tBeforeVision, after: tAfterVision } 
        })
      } catch (audErr) {
        console.warn('⚠️ No se pudo guardar auditoría de fallo IA:', audErr.message)
      }

      return NextResponse.json({ 
        ok: false, 
        error: `Error de IA (vision): ${userMsg}`,
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

            // Asegurar que los subtotales de una devolución sean NEGATIVOS (según especificación)
            try {
              const unit = Number(normalized.precio_unitario || normalized.precio || 0) || 0
              const qty = Number(normalized.cantidad || normalized.cantidad_documento || 0) || 0
              const rawSubtotal = Number(normalized.subtotal || 0) || 0
              const assumed = Math.abs(rawSubtotal) || Math.abs(unit * qty) || 0
              const negative = assumed > 0 ? -Math.abs(assumed) : 0

              // Aplicar a campos clave para asegurar coherencia en el downstream
              normalized.subtotal = negative
              normalized.subtotal_original = negative
              normalized.subtotal_calculado = negative
            } catch (subtotalErr) {
              console.warn('⚠️ Error al normalizar subtotales de devolución:', subtotalErr.message)
            }

            // Limpiar tags y prefijos (ej: [D552] Devoluci|n ...)
            let cleaned = descripcion.replace(/\[[^\]]+\]/g, '')
            cleaned = cleaned.replace(/\bdevolu\w*\b|\bdev\b|\bdevolución\b/ig, '')
            cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-áéíóúÁÉÍÓÚ,]/g, '')
            cleaned = cleaned.replace(/\s+/g, ' ').trim()
            normalized.descripcion_limpia = cleaned || descripcion

            // Intentar inferir producto y presentacion desde la DB
            try {
              // Primero intentar emparejar contra alias de proveedor (ProveedorSkuAlias), para mejorar matches cuando el proveedor usa nombres propios
              try {
                const aliasMatch = await prisma.proveedorSkuAlias.findFirst({
                  where: {
                    OR: [
                      { nombreEnProveedor: { contains: normalized.descripcion_limpia, mode: 'insensitive' } },
                      { sku: { contains: normalized.descripcion_limpia, mode: 'insensitive' } }
                    ]
                  },
                  include: { presentacion: true, producto: true, proveedor: true }
                })

                if (aliasMatch) {
                  normalized.productoInferido = aliasMatch.producto ? { id: aliasMatch.producto.id, nombre: aliasMatch.producto.nombre } : normalized.productoInferido
                  if (aliasMatch.presentacion) normalized.presentacionInferida = { id: aliasMatch.presentacion.id, nombre: aliasMatch.presentacion.nombre }
                  normalized.proveedorAlias = { proveedorId: aliasMatch.proveedorId, proveedorNombre: aliasMatch.proveedor?.nombre || null, sku: aliasMatch.sku || null, nombreEnProveedor: aliasMatch.nombreEnProveedor || null, confidence: 0.95 }
                  console.log('🔎 Match por alias de proveedor encontrado:', normalized.proveedorAlias)
                }
              } catch (aliasErr) {
                console.warn('⚠️ Error buscando alias de proveedor:', aliasErr.message)
              }

              // Si alias no resolvió, buscar producto por nombre/descripcion/presentacion
              if (!normalized.productoInferido) {
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

              // Intento rápido: extraer CUIT/numero/fecha directamente de OCR si faltan campos críticos
              try {
                const rawOcr = (vdata && vdata.ocr_text) ? vdata.ocr_text : (data?.vision_meta?.ocr_text || responseText || '')
                try {
                  if ((!parsedData.emisor || !parsedData.emisor.cuit) && rawOcr) {
                    const cuitMatch = rawOcr.match(/(\d{2}-\d{8}-\d|\d{11})/)
                    if (cuitMatch) {
                      parsedData.emisor = { ...parsedData.emisor, cuit: cuitMatch[0] }
                      console.log('🔎 CUIT heurístico detectado y aplicado:', cuitMatch[0])
                    }
                  }

                  // Primary pattern search for document number
                  if ((!parsedData.documento || !parsedData.documento.numero || String(parsedData.documento.numero).trim().length < 2) && rawOcr) {
                    const nroMatch = rawOcr.match(/(?:Nro|Nº|Numero|Factura|Núm)[:\s]*([A-Za-z0-9\-\/]+)/i)
                    if (nroMatch) {
                      parsedData.documento = { ...parsedData.documento, numero: nroMatch[1] }
                      console.log('🔎 Nro documento heurístico detectado y aplicado (primario):', nroMatch[1])
                    } else {
                      // Fallback: find common invoice/folio patterns like 0400-00172176 or long digit runs
                      const fallbackMatch = rawOcr.match(/(\d{3,4}-\d{5,}|\d{6,}|\d{3,}-\d{3,})/)
                      if (fallbackMatch) {
                        parsedData.documento = { ...parsedData.documento, numero: fallbackMatch[0] }
                        console.log('🔎 Nro documento heurístico detectado y aplicado (fallback):', fallbackMatch[0])
                      }
                    }
                  }

                  if ((!parsedData.documento || !parsedData.documento.fecha) && rawOcr) {
                    const dateMatch = rawOcr.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/)
                    if (dateMatch) {
                      parsedData.documento = { ...parsedData.documento, fecha: dateMatch[1] }
                      console.log('🔎 Fecha heurística detectada y aplicada:', dateMatch[1])
                    }
                  }
                } catch (quickErr) { console.warn('⚠️ Heurística rápida falló:', quickErr.message) }
              } catch(e) { console.warn('⚠️ Error preparando OCR heurístico:', e.message) }

              // Validar la factura y usar heurística JS si la extracción falla en campos críticos
              try {
                const errors = validateParsedInvoice(parsedData)
                if (errors.length) {
                  console.warn('⚠️ Validación fallida de factura:', errors)
                  const ocrForHeur = (vdata?.ocr_text || data?.vision_meta?.ocr_text) || responseText || ''
                  const heur = simpleInvoiceParserJS(ocrForHeur)
                  if (heur) {
                    console.log('🔁 Heurística encontró:', heur)
                    // Rellenar emisor/documento si faltan o son inválidos
                    if ((!parsedData.emisor || !parsedData.emisor.nombre || String(parsedData.emisor.nombre).trim().length < 3) && heur.emisor?.nombre) {
                      parsedData.emisor = { ...parsedData.emisor, ...heur.emisor }
                      parsedData._heuristic_applied = true
                    }
                    if ((!parsedData.documento || !parsedData.documento.numero || String(parsedData.documento.numero).trim().length < 2) && heur.documento?.numero) {
                      parsedData.documento = { ...parsedData.documento, ...heur.documento }
                      parsedData._heuristic_applied = true
                    }

                    // Reemplazar items si los items originales estaban claramente malos
                    if (errors.includes('items_missing') || errors.includes('items_bad')) {
                      parsedData.items = (heur.items || []).map((it, i) => ({
                        ordenEnFactura: i+1,
                        descripcion_exacta: String(it.descripcion_exacta || it.descripcion_limpia || '').trim(),
                        descripcion_limpia: String(it.descripcion_limpia || it.descripcion_exacta || '').trim(),
                        cantidad_documento: Number(fixArgentineNumber(it.cantidad_documento || it.cantidad || 0)) || 0,
                        precio_unitario: Number(fixArgentineNumber(it.precio_unitario || it.precio || 0)) || 0,
                        subtotal_original: Number(fixArgentineNumber(it.subtotal_original || it.subtotal || 0)) || 0,
                        subtotal_calculado: Number(fixArgentineNumber(it.subtotal_original || it.subtotal || 0)) || 0,
                        descuento: Number(fixArgentineNumber(it.descuento || 0)) || 0,
                        impuestos: Number(fixArgentineNumber(it.impuestos || 0)) || 0,
                        es_devolucion: !!it.es_devolucion,
                        presentacion_normalizada: it.presentacion_normalizada || '',
                        presentacion_candidates: it.presentacion_candidates || [],
                        producto_candidates: it.producto_candidates || []
                      }))
                      parsedData._heuristic_applied = true
                      console.log('✅ Items reemplazados por heurística (count=' + parsedData.items.length + ')')
                    }
                  }

                  // Revalidar
                  const post = validateParsedInvoice(parsedData)
                  console.log('🔁 Resultado validación post-heurística:', post)
                  if (post.length) {
                    parsedData._needs_manual_review = true
                    parsedData._raw_ocr = vdata?.ocr_text || data?.vision_meta?.ocr_text || ''
                    parsedData._raw_output = data.response || ''
                    try {
                      await guardarAuditoriaIaFailure({ model: data.model || 'qwen', mode, fileName: image.name, fileSize: image.size, responseStatus: 200, errorText: `Validation issues: ${errors.join(',')}`, timing: { before: tBeforeVision, after: Date.now() } })
                    } catch (audErr) {
                      console.warn('⚠️ No se pudo registrar auditoría de validación:', audErr.message)
                    }

                    // Último recurso: intentar reintento con un modelo más grande (si no estamos ya usando uno pesado)
                    try {
                      const heavyModel = 'qwen/Qwen-2.5-VL'
                      if ((model || '').toLowerCase() !== heavyModel.toLowerCase()) {
                        console.info(`🔁 Reintento con modelo pesado ${heavyModel} para mejorar extracción`) 
                        const retryForm = new FormData()
                        try {
                          let optBuf = Buffer.from(optimized, 'base64')
                          let b
                          try { b = new Blob([optBuf], { type: 'image/jpeg' }) } catch(e) { b = optBuf }
                          try { retryForm.append('image', b, image.name || 'upload.jpg') } catch(e) { retryForm.append('image', b) }
                        } catch (e) {
                          console.warn('⚠️ No se pudo preparar imagen para reintento:', e.message)
                        }
                        retryForm.append('enhance', '1')
                        retryForm.append('mode', mode)
                        retryForm.append('model', heavyModel)
                        try { retryForm.append('prompt', prompt + '\n\n// Reintento con modelo pesado para mejorar campos críticos') } catch(e) {}

                        let retryResp = null
                        try {
                          retryResp = await fetch(`${VISION_HOST}/restore`, { method: 'POST', body: retryForm })
                        } catch (fetchErr) {
                          console.warn('⚠️ Reintento con modelo pesado falló al conectar a vision:', fetchErr.message)
                        }

                        if (retryResp && retryResp.ok) {
                          const rv = await retryResp.json().catch(()=>null)
                          if (rv) {
                            // Re-parse JSON salida del modelo pesado si viene
                            const newText = rv.extraction ? (typeof rv.extraction === 'string' ? rv.extraction : JSON.stringify(rv.extraction)) : (rv.ocr_text || '')
                            const jsonMatch2 = (newText || '').match(/\{[\s\S]*\}/)
                            if (jsonMatch2) {
                              try {
                                const newParsed = JSON.parse(jsonMatch2[0])
                                parsedData = newParsed
                                parsedData._retried_with = heavyModel
                                console.log('✅ Reintento con modelo pesado produjo JSON parseable')
                              } catch (eJson) {
                                console.warn('⚠️ Reintento con modelo pesado devolvió JSON inválido:', eJson.message)
                              }
                            }
                          }
                        } else {
                          console.warn('⚠️ Reintento con modelo pesado no devolvió éxito')
                        }
                      }
                    } catch (errRetry) {
                      console.warn('⚠️ Error durante reintento con modelo pesado:', errRetry.message)
                    }
                  } else {
                    console.log('✅ Heurística solucionó la validación')
                  }
                }
              } catch (vErr) {
                console.warn('⚠️ Error durante validación/heurística:', vErr.message)
              }
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
      visionMs: (typeof tBeforeVision !== 'undefined' && typeof tAfterVision !== 'undefined') ? (tAfterVision - tBeforeVision) : undefined,
      parseMs: (typeof tAfterParsing !== 'undefined') ? (tAfterParsing - (typeof tAfterVision !== 'undefined' ? tAfterVision : tStart)) : undefined,
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
