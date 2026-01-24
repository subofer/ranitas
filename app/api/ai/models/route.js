import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Usar cliente oficial de ollama
    const { Ollama } = await import('ollama')
    const ollama = new Ollama({ host: 'http://localhost:11434' })
    
    const response = await ollama.list()
    
    // La respuesta tiene formato: { models: [...] }
    const models = response?.models || []
    const modelNames = models.map(m => m.name || m.model || String(m))
    
    console.log('✅ Modelos encontrados:', modelNames)
    
    return NextResponse.json({ 
      ok: true, 
      models: modelNames 
    })
    
  } catch (ollamaError) {
    console.error('❌ Error con cliente ollama:', ollamaError.message)
    
    // Fallback: llamar directamente a la API HTTP de Ollama
    try {
      const res = await fetch('http://localhost:11434/api/tags')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      const data = await res.json()
      const models = data?.models || []
      const modelNames = models.map(m => m.name || m.model || String(m))
      
      console.log('✅ Modelos desde HTTP fallback:', modelNames)
      
      return NextResponse.json({ 
        ok: true, 
        models: modelNames 
      })
      
    } catch (httpError) {
      console.error('❌ Error con HTTP fallback:', httpError.message)
      
      return NextResponse.json({ 
        ok: false, 
        error: 'No se pudo conectar con Ollama. Verifica que esté corriendo en puerto 11434',
        details: httpError.message
      }, { status: 500 })
    }
  }
}
