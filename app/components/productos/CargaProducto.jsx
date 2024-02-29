import { guardarProducto } from "@/prisma/serverActions/productos"
import SelectCategoria from "../categorias/SelectCategoria"
import Input from "../forms/Input/Input"

export const CargaProducto = () => {
  return (
    <form action={guardarProducto} id="CargarProductoForm">
      <Input name={"codigoBarra"} label={"Codigo De Barra"} />
      <Input name={"nombre"} label={"Nombre"} />
      <Input name={"descripcion"} label={"Descripcion"} />
      <Input name={"precio"} label={"Precio"} type={"number"}/>
      <SelectCategoria name="categoriaId" form="CargarProductoForm"/>
     
      <button type="submit">Guardar</button>
    </form>
  )
}