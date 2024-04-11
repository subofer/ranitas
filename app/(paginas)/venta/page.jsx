"use server"

import ListadoVenta from "@/app/components/venta/ListadoVenta"
import { getLastDocumentosVenta } from "@/prisma/consultas/documentos"

export default async function Venta({numeroVenta}) {
  const ultimaVenta = getLastDocumentosVenta("SALIDA", "FACTURA")
  return(
    <div className="flex w-screen">
      <ListadoVenta ultimaVenta={ultimaVenta}/>
    </div>
  )
}