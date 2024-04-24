"use client"
import useSelect from "@/app/hooks/useSelect";
import FilterSelect from "../formComponents/FilterSelect";
import { getProveedoresSelect} from "@/prisma/consultas/proveedores";

const SelectProveedorClient = ({...props}) => {
  const { data: proveedores, busy } = useSelect(getProveedoresSelect, "proveedores")

  return (
    <FilterSelect
      options={proveedores}
      valueField={"id"}
      textField={"nombre"}
      label="Proveedor"
      placeholder="Elija un Proveedor"
      busy={busy}
      {...props}
    />
  )
};

export default SelectProveedorClient;
