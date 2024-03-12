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
      placeholder: "Elija Categoria",
      save: true,
    }
  ],
};

export const CargarCategoria = () => {
  return (
    <FormCard props={cargarCategorias.props} formlength={cargarCategorias.inputs.length}>
      {cargarCategorias.inputs.map(({ Component, name, ...props }, i) => (
        <Component
          name={name}
          tabIndex={i + 1}
          key={i}
          {...props}
        />
      ))}
    </FormCard>
  )
}