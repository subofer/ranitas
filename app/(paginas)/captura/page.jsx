"use client"
import CameraCapture from "@/app/components/formComponents/CameraCapture"

export default function CargarFacturaPage() {
  const onCapture = (captura) => {
    console.log(captura)
  }
  return(
    <CameraCapture onCapture={onCapture}/>
  )
}
