"use client"
import { useState } from "react"
import QrCodeScanner from "@/components/camara/Scanner"

export default function CapturarPage() {
  const [captura, setCaptura] = useState(null)
  const onCapture = (code) => {
    console.log(code)
    setCaptura(code)
  }
  return(
    <main className="min-h-screen">
      {captura}
      <QrCodeScanner
        onScan={onCapture}
        onError={(error) => console.error(error)}
      />
    </main>
  )
}
