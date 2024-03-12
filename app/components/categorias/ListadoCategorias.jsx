"use server"
import { getCategoriasConteo } from "@/prisma/consultas/categorias";
import { RenglonCategoria } from "./RenglonCategorias";
import Tabla from "../formComponents/Tabla";

const ListadoCategorias = async (props) => {
  const columnas = ['Creada', 'Nombre']
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
