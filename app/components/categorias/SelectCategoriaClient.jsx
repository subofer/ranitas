"use client"
import FilterSelect from "../formComponents/FilterSelect";
import { getCategorias } from "@/prisma/consultas/categorias";
import useSelect from "@/app/hooks/useSelect";

const SelectCategoriaClient =  ({...props}) => {
  const { data: categorias } = useSelect(getCategorias)

  return (
    <FilterSelect
      options={categorias}
      valueField={"id"}
      textField={"nombre"}
      placeholder="Elija una categoría"
      label="Categoria"
      {...props}
    />
  )
};

export default SelectCategoriaClient;