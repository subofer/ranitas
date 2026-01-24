"use client"
import { AiProvider } from "@/context/AiContext"

export default function AiProviderClient({ children }) {
  return (
    <AiProvider>
      {children}
    </AiProvider>
  )
}
