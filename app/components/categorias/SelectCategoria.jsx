"use server"
import { getCategorias } from "@/prisma/consultas/categorias"
import Select from "../forms/Select";

const SelectCategoria = async (props) => {
  const opciones =await getCategorias()
  
  return(
    <Select 
      {...props}
      defaultText={"Seleccione una categoría"}
      defaultValue={0}
      options={opciones}
      valueField={"id"}
      textField={"nombre"}
      type={"number"}
    />
  )
};
    
export default SelectCategoria;
