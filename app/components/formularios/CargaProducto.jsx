"use server"
import { guardarProducto } from "@/prisma/serverActions/productos"
import SelectCategoria from "../categorias/SelectCategoria"
import Input from "../formComponents/Input"
import { FormCard } from "../formComponents/FormCard"
import ImagenProducto from "../productos/ImagenProducto"

const cargarProductos = {
  props: {
    id: "FormCargarProducto",
    title: "Cargar Producto",
    action: guardarProducto,
  },
  inputs: [
    {Component: Input, name: "codigoBarra", label: "Codigo De Barras", placeholder: "Codigo de barras"},
    {Component: Input, name: "nombre", label: "Nombre", placeholder:"Nombre"},
    {Component: Input, name: "descripcion" , label:"Descripcion", placeholder:"Descripcion"},
    {Component: Input, name: "precio" , label: "Precio", type: "number", min:0, placeholder:0},
    {Component: SelectCategoria, name: "categoriaId", label: "Categoria", placeholder: "Elija Categoria"},
    {Component: ImagenProducto, name: "imagen", label: "imagen", placeholder: "Elija Categoria"}
  ],
};

export const CargaProducto = () => {
  return (
    <FormCard {...cargarProductos.props} formlength={cargarProductos.inputs.length}>
      {cargarProductos.inputs.map(( {Component, ...props},i ) => <Component tabIndex={i + 1} key={i} {...props}/> )}
    </FormCard>
  )
}