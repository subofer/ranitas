"use server"

import { getProveedores } from "@/prisma/consultas/proveedores";
import { RenglonProveedor } from "./RenglonProveedor";
import { Tabla } from "../Tablas ";


const ListadoProveedores = async (props) => {
  const columnas = ['id', 'Cuit', 'Nombre']
  const proveedores = await getProveedores()

  return (
    <Tabla
      columnas={columnas}
      titulo={"Proveedores"}
      {...props}
    >
      {proveedores.map((p,i) => (
        <RenglonProveedor key={i} item={p}/>
      ))}
    </Tabla>
  )
};

export default ListadoProveedores;
