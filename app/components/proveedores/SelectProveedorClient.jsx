"use client"

import FilterSelect from "../formComponents/FilterSelect";
import { getProveedoresCompletos } from "@/prisma/consultas/proveedores";
import useSelect from "@/app/hooks/useSelect";

const SelectProveedorClient =  ({...props}) => {
  const { data: proveedores } = useSelect(getProveedoresCompletos)

  return (
    <FilterSelect
      options={proveedores}
      valueField={"id"}
      textField={"nombre"}
      placeholder={"Elija provincia"}
      label={"Elija provincia"}
      {...props}
    />
  )
};

export default SelectProveedorClient;

