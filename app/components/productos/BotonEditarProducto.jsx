"use client"
import { eliminarProductoConPreciosPorId } from "@/prisma/serverActions/productos";
import Icon from "../formComponents/Icon";

export const BotonEditarProducto = ({item, ...props}) => (
  <Icon icono={"editar"} onClick={() => {}} {...props}/>
)