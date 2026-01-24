"use server"

export const consultarAHere = async (object, prompt) => {
  // Reemplazo de Cohere: ahora usamos el endpoint local de Ollama (/api/ollama/chat)
  const combinedPrompt = `given a text and an object, analyze the object and the text and return a JSON following the provided object structure. If no info, return empty object with nulls.\n\nobject:${JSON.stringify(object)}\n\ntext:${prompt}`
  try {
    const res = await fetch('/api/ollama/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OLLAMA_DEFAULT || 'default', prompt: combinedPrompt })
    })
    const data = await res.json()
    if (data?.ok) return { text: data.text }
    return { error: data?.error || 'No response from Ollama' }
  } catch (e) {
    return { error: e.message }
  }
}
