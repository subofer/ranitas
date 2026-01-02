"use client"
import FilterSelect from "../formComponents/FilterSelect";
import useSelect from "@/hooks/useSelect";
import { getCategorias } from "@/prisma/consultas/categorias";

const SelectCategoriaClient =  ({...props} = {}) => {
  const { data: categorias, busy } = useSelect(getCategorias, "categorias")

  return (
    <FilterSelect
      options={categorias}
      valueField={"id"}
      textField={"nombre"}
      placeholder="Elija una categoría"
      label="Categoria"
      busy={busy}
      {...props}
    />
  )
};

export default SelectCategoriaClient;