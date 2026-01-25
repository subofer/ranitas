"use client"
import { AiProvider } from "@/context/AiContext"
import { OllamaStatusProvider } from "@/context/OllamaStatusContext"

export default function AiProviderClient({ children }) {
  return (
    <AiProvider>
      <OllamaStatusProvider autoRefresh={true} refreshInterval={5000}>
        {children}
      </OllamaStatusProvider>
    </AiProvider>
  )
}
