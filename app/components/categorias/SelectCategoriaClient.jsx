"use client"
import FilterSelect from "../formComponents/FilterSelect";
import useSelect from "@/hooks/useSelect";
import { getCategorias } from "@/prisma/consultas/categorias";

const SelectCategoriaClient =  ({onChange, ...props} = {}) => {
  const { data: categorias, busy } = useSelect(getCategorias, "categorias")

  const handleSelect = (option) => {
    if (onChange) {
      onChange(option);
    }
  };

  return (
    <FilterSelect
      options={categorias}
      valueField={"id"}
      textField={"nombre"}
      placeholder="Elija una categoría"
      label="Categoria"
      busy={busy}
      onChange={handleSelect}
      {...props}
    />
  )
};

export default SelectCategoriaClient;