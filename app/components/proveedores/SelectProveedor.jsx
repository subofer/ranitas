"use server"
import { getProveedoresCompletos } from "@/prisma/consultas/proveedores";
import SelectProveedorClient from "./SelectProveedorClient";

const SelectProveedor =  async (props) => {
  const proveedores = await getProveedoresCompletos()
  return (
    <SelectProveedorClient
      options={proveedores}
      valueField={"id"}
      textField={"nombre"}
      {...props}
    />
  )
};

export default SelectProveedor;
