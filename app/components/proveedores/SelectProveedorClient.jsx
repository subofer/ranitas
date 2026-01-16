"use client"
import useSelect from "@/hooks/useSelect";
import FilterSelect from "../formComponents/FilterSelect";
import { getProveedoresSelect} from "@/prisma/consultas/proveedores";

const SelectProveedorClient = ({ value, ...props }) => {
  const { data: proveedores, busy } = useSelect(getProveedoresSelect, "proveedores")

  return (
    <FilterSelect
      options={proveedores}
      value={value}
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
