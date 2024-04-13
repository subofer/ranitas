"use client"
import { useState } from "react"
import QrCodeScanner from "@/app/components/camara/Scanner"

export default function CargarFacturaPage() {
  const [captura, setCaptura] = useState(null)
  const onCapture = (code) => {
    console.log(code)
    setCaptura(code)
  }
  return(
    <>
    {captura}
      <QrCodeScanner
        onScan={onCapture}
        onError={(error) => console.error(error)}
      />
    </>
  )
}
