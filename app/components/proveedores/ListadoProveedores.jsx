"use server"

import { getProveedores } from "@/prisma/consultas/proveedores";
import { Tabla } from "../Tablas";
import { RenglonProveedor } from "./RenglonProveedor";

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
