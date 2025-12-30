import { getContactosCompletos } from "@/prisma/serverActions/contactos"
import ListadoContactosCliente from "./ListadoContactosCliente"

export default async function ListadoContactos(props) {
  const columnas = ['id', 'Cuit', 'Nombre', 'E-mail', 'Tipo', 'telefono', '']
  const contactos = await getContactosCompletos()

  return (
    <ListadoContactosCliente
      columnas={columnas}
      contactos={contactos}
      {...props}
    />
  )
}
