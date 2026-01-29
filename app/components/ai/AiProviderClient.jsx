"use client"
import { AiProvider } from "@/context/AiContext"
import { VisionStatusProvider } from "@/context/VisionStatusContext"

export default function AiProviderClient({ children }) {
  return (
    <AiProvider>
      <VisionStatusProvider autoRefresh={true} refreshInterval={5000}>
        {children}
      </VisionStatusProvider>
    </AiProvider>
  )
}
