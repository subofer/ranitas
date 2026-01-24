import { streamText } from 'ai'
import { ollama } from 'ollama-ai-provider'

export async function POST(req) {
  try {
    const body = await req.json()
    const { model, prompt } = body
    
    console.log('💬 Chat request:', { model, promptLength: prompt?.length })
    
    if (!model || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Model y prompt son requeridos' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    try {
      // Usar streamText del Vercel AI SDK
      const result = await streamText({
        model: ollama(model),
        prompt: prompt,
        maxTokens: 4000,
        temperature: 0.7
      })

      console.log('✅ Stream iniciado para modelo:', model)
      return result.toTextStreamResponse()
      
    } catch (aiError) {
      console.error('❌ Error con AI SDK:', aiError.message)
      
      // Fallback a Ollama directo
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}`)
      }

      console.log('✅ Usando fallback HTTP directo')
      
      // Transformar el stream de Ollama
      const encoder = new TextEncoder()
      const transformedStream = new ReadableStream({
        async start(controller) {
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              
              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split('\n').filter(Boolean)
              
              for (const line of lines) {
                try {
                  const json = JSON.parse(line)
                  if (json.response) {
                    controller.enqueue(encoder.encode(json.response))
                  }
                } catch (e) {
                  // Ignorar líneas no-JSON
                }
              }
            }
          } catch (err) {
            controller.error(err)
          } finally {
            controller.close()
          }
        }
      })

      return new Response(transformedStream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: 'Error procesando solicitud',
        details: error.message 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
