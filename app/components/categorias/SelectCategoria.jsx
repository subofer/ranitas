import { getCategorias } from "@/prisma/consultas/categorias"
import FilterSelect from "../formComponents/FilterSelect";

const SelectCategoria = async (props) => (
  <FilterSelect
    options={await getCategorias()}
    valueField={"id"}
    textField={"nombre"}
    {...props}
  />
)

export default SelectCategoria;
