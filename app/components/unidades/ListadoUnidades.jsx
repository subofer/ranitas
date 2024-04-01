"use server"
import { getCategoriasConteo } from "@/prisma/consultas/categorias";
import { RenglonCategoria } from "./RenglonUnidades";
import { Tabla } from "../Tablas/Tablas ";


const ListadoCategorias = async (props) => {
  const columnas = ['id', 'Creada','Cantidad', 'Nombre']
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
