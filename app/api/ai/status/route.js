import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Llamar al endpoint /api/ps de Ollama
    const response = await fetch('http://localhost:11434/api/ps')
    
    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    // El endpoint /api/ps retorna { models: [...] }
    // Cada modelo tiene: name, model, size, digest, expires_at, size_vram
    const models = data?.models || []
    
    return NextResponse.json({
      ok: true,
      loadedModels: models.map(m => ({
        name: m.name || m.model,
        sizeVram: m.size_vram || 0,
        size: m.size || 0,
        expiresAt: m.expires_at
      })),
      count: models.length
    })
    
  } catch (error) {
    console.error('❌ Error obteniendo estado de Ollama:', error)
    return NextResponse.json({
      ok: false,
      error: error.message,
      loadedModels: [],
      count: 0
    }, { status: 500 })
  }
}
