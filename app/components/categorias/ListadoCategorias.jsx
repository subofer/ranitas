import { getCategoriasConteo } from "@/prisma/consultas/categorias";
import { RenglonCategoria } from "./RenglonCategorias";
import { Tabla } from "../Tablas/Tablas";


const ListadoCategorias = async (props) => {
  const columnas = [
    {titulo:'id'},
    {ordenable: true, titulo:'Creada'},
    {ordenable: true, titulo:'Cantidad'},
    {ordenable: true, titulo:'Nombre'},
    {titulo:''}]

  const categorias = await getCategoriasConteo()

  return (
    <Tabla
      columnas={columnas}
      titulo={"Categorias"}
      {...props}
    >
      {categorias.map((p,i) => (
        <RenglonCategoria key={i} item={p}/>
      ))}
    </Tabla>
  )
};


export default ListadoCategorias;
