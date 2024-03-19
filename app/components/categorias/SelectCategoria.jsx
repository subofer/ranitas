"use server"
import FilterSelect from "../formComponents/FilterSelect";
import { getCategorias } from "@/prisma/consultas/categorias"

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
