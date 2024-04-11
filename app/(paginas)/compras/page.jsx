"use server"
import CargaFacturaForm from "@/app/components/formularios/CargarFactura"
import { getProductos } from "@/prisma/consultas/productos"
import { getProveedores } from "@/prisma/consultas/proveedores"

export default async function CargarFacturaPage() {
  const proveedores = await getProveedores()
  const productos = await getProductos()

  return(
    <main className="mx-auto">
      <CargaFacturaForm
        proveedoresProps={{options:proveedores}}
        productosProps={{options:productos}}
        />
    </main>
  )
}
