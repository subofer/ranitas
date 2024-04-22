"use client"

import FilterSelect from "../formComponents/FilterSelect";
import { getProveedoresSelect } from "@/prisma/consultas/proveedores";
import useSelect from "@/app/hooks/useSelect";
import { useEffect } from "react";

const SelectProveedorClient =  ({...props}) => {
  const { data: proveedores, busy } = useSelect(getProveedoresSelect)

  return (
    <FilterSelect
      options={proveedores}
      valueField={"id"}
      textField={"nombre"}
      busy={busy}
      {...props}
    />
  )
};

export default SelectProveedorClient;

