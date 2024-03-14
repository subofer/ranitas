"use client"
import { eliminarProductoConPreciosPorId } from "@/prisma/serverActions/productos";
import Icon from "../formComponents/Icon";

export const BotonEliminarProducto = ({item, ...props}) => (
  <Icon icono={"eliminar"} onClick={() => eliminarProductoConPreciosPorId(item.id)} {...props}/>
)