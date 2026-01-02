"use server"

import ListadoVenta from "@/components/venta/ListadoVenta"
import { getLastDocumentosVenta } from "@/prisma/consultas/documentos"

export default async function Venta({numeroVenta}) {
  const ultimaVenta = getLastDocumentosVenta("SALIDA", "FACTURA")
  return(
    <section className="flex flex-col gap-3 w-full h-full mx-auto max-h-full md:h-fit">
      <div className="
        flex
        max-h-full
        lg:max-h-full
        w-full
        max-w-[1600px]
        mx-auto
        overflow-x-hidden
        ">
        <ListadoVenta ultimaVenta={ultimaVenta}/>
      </div>

    </section>
  )
}
