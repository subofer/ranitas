"use server"
import { getCategorias } from "@/prisma/consultas/categorias"
import SelectCategoriaClient from "./SelectCategoriaClient";

const SelectCategoria =  async (props) => {
  const categorias = await getCategorias()
  return (
    <SelectCategoriaClient
      options={categorias}
      valueField={"id"}
      textField={"nombre"}
      {...props}
    />
  )
};

export default SelectCategoria;
