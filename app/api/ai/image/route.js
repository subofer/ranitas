import { NextResponse } from 'next/server'

const OLLAMA_HOST = 'http://localhost:11434'

// Prompts optimizados para obtener JSON estructurado
const PROMPTS = {
  factura: `Analiza esta FACTURA o COMPROBANTE LEGAL argentino.

            REGLAS IMPORTANTES:
            1. Los números usan formato argentino: PUNTO para miles, COMA para decimales (ej: 1.234,50)
            2. Convierte TODOS los números a formato numérico con PUNTO decimal (ej: 1234.50)
            3. El número de comprobante es CRUCIAL - incluye TODO (ej: "00005-00016947")
            4. Extrae CADA producto/item de la tabla de conceptos

            Identifica:
            - EMISOR: Nombre y CUIT del proveedor/vendedor
            - DOCUMENTO: Tipo (Factura A/B/C, Remito), Número COMPLETO y Fecha
            - ITEMS: Cada producto con descripción, cantidad, precio unitario y subtotal
            - TOTALES: Subtotal/Neto, IVA y Total final

            Responde ÚNICAMENTE con este JSON (números con punto decimal):
            {
              "emisor": { "nombre": "", "cuit": "" },
              "documento": { "tipo": "", "numero": "", "fecha": "" },
              "items": [{ "descripcion": "", "cantidad": 0, "precio_unitario": 0, "subtotal": 0 }],
              "totales": { "neto": 0, "iva": 0, "total": 0 }
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

    const data = await response.json()
    console.log('✅ Respuesta recibida de Ollama')
    
    let responseText = data.response || ''
    
    // Para facturas y productos, intentar parsear JSON
    let parsedData = null
    if (mode === 'factura' || mode === 'producto') {
      try {
        // Extraer JSON de la respuesta
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0])
          console.log('✅ JSON parseado exitosamente')
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
