import { getCategorias } from "@/prisma/consultas/categorias"
import Select from "../forms/Select";

const SelectCategoria = async ({name, form}) => (
  <Select 
    name={name} 
    form={form}
    defaultText={"Seleccione una categoría"}
    options={await getCategorias()}
    value={"id"}
    text={"nombre"}
    type={"number"}
  />
);

export default SelectCategoria;
