import { NextResponse } from 'next/server'

const OLLAMA_HOST = 'http://localhost:11434'

// Prompts optimizados para obtener JSON estructurado
const PROMPTS = {
  factura: `Analiza esta FACTURA/COMPROBANTE argentino y extrae datos en JSON.

            NÚMEROS ARGENTINOS:
            - PUNTO (.) = separador de miles
            - COMA (,) = separador decimal
            - $38.600,00 → 38600.00 en JSON
            - $1.234,50 → 1234.50 en JSON
            
            EXTRAER:
            - DOCUMENTO: Tipo (Factura A/B/C, Remito, Presupuesto), Número COMPLETO (ej: 00005-00016947), Fecha (DD/MM/AAAA)
            - EMISOR: Nombre completo y CUIT (si no hay CUIT marca revisar:true)
            - ITEMS: Cada producto con descripción EXACTA, cantidad, precio_unitario, descuento, impuestos (si aplica), subtotal
            - TOTALES: Neto (subtotal), IVA, Total
            - TOTALES_CALCULADOS: Calcula: suma(subtotales) = neto, neto * alicuota_iva = iva, neto + iva = total
            
            VALIDACIÓN:
            - Si totales ≠ totales_calculados → marca revisar:true en totales
            - Presupuestos: sin CUIT ni impuestos (iva=0)
            - Si dato ilegible/dudoso → revisar:true
            
            Responde ÚNICAMENTE con JSON válido:
            {
              "items": [{"descripcion": "texto EXACTO", "cantidad": 0, "precio_unitario": 0, "descuento": 0, "impuestos": 0, "subtotal": 0, "revisar": false}],
              "documento": {"tipo": "FACTURA A/B/C | REMITO | PRESUPUESTO", "numero": "00000-00000000", "fecha": "DD/MM/AAAA", "revisar": false},
              "emisor": {"nombre": "", "cuit": "XX-XXXXXXXX-X", "revisar": false},
              "receptor": {"nombre": "", "cuit": "", "revisar": false},
              "totales": {"neto": 0, "iva": 0, "total": 0},
              "totales_calculados": {"neto": 0, "iva": 0, "total": 0},
              "revisar": false
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
    console.log('🖼️ Iniciando análisis de imagen...')
    
    const formData = await req.formData()
    const image = formData.get('image')
    const model = formData.get('model') || 'minicpm-v'
    const mode = formData.get('mode') || 'general'
    
    if (!image) {
      console.error('❌ No se recibió imagen')
      return NextResponse.json({ ok: false, error: 'No se recibió imagen' }, { status: 400 })
    }

    console.log('📋 Parámetros:', { 
      model, 
      mode, 
      fileName: image.name, 
      fileSize: image.size,
      fileType: image.type 
    })

    // Convertir imagen a base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    
    console.log('✅ Imagen convertida a base64:', base64Image.length, 'caracteres')

    // Usar directamente la API de Ollama (compatible con v1)
    const prompt = PROMPTS[mode] || PROMPTS.general
    
    console.log('📤 Enviando a Ollama...')
    
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        images: [base64Image],
        stream: false,
        format: 'json',
        options: {
          temperature: 0,
          num_ctx: 4096 // Contexto mayor para facturas largas
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error de Ollama:', response.status, errorText)
      return NextResponse.json({ 
        ok: false, 
        error: `Error de Ollama: ${response.status} - ${errorText}` 
      }, { status: 500 })
    }

    let data
    try {
      data = await response.json()
      console.log('✅ Respuesta recibida de Ollama')
    } catch (jsonError) {
      const errorText = await response.text()
      console.error('❌ Error parseando respuesta JSON:', jsonError.message)
      return NextResponse.json({ 
        ok: false, 
        error: `Error parseando respuesta: ${errorText.substring(0, 200)}` 
      }, { status: 500 })
    }
    
    let responseText = data.response || ''
    console.log('📝 Respuesta texto (primeros 500 chars):', responseText.substring(0, 500))
    
    // Para facturas y productos, intentar parsear JSON
    let parsedData = null
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
              parsedData.totales.neto = fixArgentineNumber(parsedData.totales.neto)
              parsedData.totales.iva = fixArgentineNumber(parsedData.totales.iva)
              parsedData.totales.total = fixArgentineNumber(parsedData.totales.total)
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
              
              parsedData.items = parsedData.items.map((item, idx) => {
                // Normalizar campos con diferentes nombres
                const descripcion = item.descripcion || item.nombre || item.detalle || item.producto || item.articulo || ''
                const precio_unitario = item.precio_unitario || item.precio || 0
                const subtotal = item.subtotal || item.importe || item.total || 0
                
                const normalized = {
                  ...item,
                  descripcion,
                  cantidad: fixArgentineNumber(item.cantidad),
                  precio_unitario: fixArgentineNumber(precio_unitario),
                  subtotal: fixArgentineNumber(subtotal),
                  descuento: fixArgentineNumber(item.descuento || 0),
                  impuestos: fixArgentineNumber(item.impuestos || 0)
                }
                
                // Eliminar campo 'nombre' si existe para evitar confusión
                if (normalized.nombre && normalized.descripcion) {
                  delete normalized.nombre
                }
                
                if (idx === 0) {
                  console.log('🔄 Primer item NORMALIZADO:', JSON.stringify(normalized, null, 2))
                }
                
                return normalized
              })
              
              console.log(`✅ Items normalizados: ${parsedData.items.length}`)
            } else {
              console.warn('⚠️ No se encontraron items en parsedData')
            }
            
            console.log('✅ Números corregidos:', JSON.stringify(parsedData.totales))
            console.log('📦 Items finales:', parsedData.items ? parsedData.items.length : 0)
          }
        }
      } catch (e) {
        console.warn('⚠️ No se pudo parsear JSON, retornando texto plano')
      }
    }

    return NextResponse.json({ 
      ok: true, 
      text: responseText,
      data: parsedData,
      metadata: {
        model: data.model,
        fileName: image.name,
        fileSize: image.size,
        fileType: image.type,
        mode: mode
      }
    })

  } catch (error) {
    console.error('❌ Error general:', error)
    return NextResponse.json({ 
      ok: false, 
      error: error.message,
      details: error.stack 
    }, { status: 500 })
  }
}

/**
 * Corrige números argentinos mal interpretados
 * Si el número es < 1000 y tiene decimales (ej: 38.6), probablemente sea un error
 * de interpretación del punto como decimal en lugar de miles
 */
function fixArgentineNumber(value) {
  if (typeof value !== 'number') return value
  
  // Si el número es pequeño pero tiene decimales, probablemente el punto era separador de miles
  // Ejemplo: 38.6 debería ser 38600 (del original 38.600,00)
  if (value < 1000 && value % 1 !== 0) {
    const strValue = value.toString()
    const parts = strValue.split('.')
    if (parts.length === 2 && parts[1].length <= 3) {
      // 38.6 -> 38600 (multiplica por 100)
      // 38.60 -> 38600 (multiplica por 10)  
      const decimals = parts[1].length
      const multiplier = decimals === 1 ? 100 : (decimals === 2 ? 10 : 1)
      return parseFloat(parts[0] + parts[1]) * multiplier
    }
  }
  
  return value
}
