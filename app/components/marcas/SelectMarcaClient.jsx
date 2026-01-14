"use client";

import useSelect from "@/hooks/useSelect";
import FilterSelect from "../formComponents/FilterSelect";
import { getMarcasSelect } from "@/prisma/consultas/marcas";

const SelectMarcaClient = ({ ...props }) => {
  const { data: marcas, busy } = useSelect(getMarcasSelect, "marcas");

  return (
    <FilterSelect
      options={marcas}
      valueField={"id"}
      textField={"nombre"}
      label="Marca"
      placeholder="Elija una Marca"
      busy={busy}
      {...props}
    />
  );
};

export default SelectMarcaClient;
