"use server"
import { getCategorias } from "@/prisma/consultas/categorias"
import FilterSelect from "../formComponents/FilterSelect";

const SelectCategoria =  async (props) => {
  const categoria = await getCategorias()
  return(
    <FilterSelect
      options={categoria}
      valueField={"id"}
      textField={"nombre"}
      {...props}
    />
  )
}

export default SelectCategoria;
