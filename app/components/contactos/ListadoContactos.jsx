"use server"

import { getContactosCompletos } from "@/prisma/serverActions/contactos";
import { RenglonTablaContacto } from "./RenglonTablaContacto";
import { Tabla } from "../Tablas/Tablas ";

const ListadoContactos = async (props) => {
  const columnas = [
    'id',
    'Cuit',
    'Nombre',
    'E-mail',
    'Tipo',
    'telefono',
    ''
  ]
  const contactos = await getContactosCompletos()

  return (
    <Tabla
      columnas={columnas}
      titulo={"Contactos"}
      {...props}
    >
    {
      contactos.map((p,i) => (
        <RenglonTablaContacto key={i} item={p}/>
      ))
    }
    </Tabla>
  )
};

export default ListadoContactos;
