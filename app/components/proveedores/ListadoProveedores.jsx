"use server"

import { getProveedoresCompletos } from "@/prisma/consultas/proveedores";
import { RenglonProveedor } from "./RenglonProveedor";
import { Tabla } from "../Tablas/Tablas ";


const ListadoProveedores = async (props) => {
  const columnas = [
    'id',
    'Cuit',
    'Nombre',
    'E-mail',
    'Condicion Iva',
    'telefono',
    ''
  ]
  const proveedores = await getProveedoresCompletos()

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
