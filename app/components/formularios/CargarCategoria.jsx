import SelectCategoria from "../categorias/SelectCategoria"
import { guardarCategoria } from "@/prisma/serverActions/categorias";
import { FormCard } from "../formComponents/FormCard"

const cargarCategorias = {
  props: {
    id: "FormCargarCategoria",
    title: "Cargar Categoria",
    action: guardarCategoria,
  },
  inputs: [
    {
      Component: SelectCategoria,
      valueField: "nombre",
      name: "nombre",
      label: "Categoria",
      placeholder: "Escriba una Categoria",
      save: true,
    }
  ],
};
    
export const CargarCategoria = async () => {
  return (
    <FormCard {...cargarCategorias.props} formlength={cargarCategorias.inputs.length}>
      {cargarCategorias.inputs.map(({ Component, ...props }, i) => (
        <Component key={i} tabIndex={i + 1} {...props}/>
      ))}
    </FormCard>
  )
}