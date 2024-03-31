"use client"
import { borrarCategoria } from "@/prisma/serverActions/categorias";
import { fechas } from "@/lib/manipularTextos";

import Icon from "../formComponents/Icon";
import { Td, Tr } from "../Tablas ";


export const RenglonCategoria = ({item}) => (
  <Tr >
    <Td className="w-px">
      {item?.id}
    </Td>
    <Td className="w-px">
      {fechas.fecha(item?.createdAt)}
    </Td>
    <Td className="w-px text-center">
      {item?._count?.products}
    </Td>
    <Td className="flex flex-row justify-between pl-1">
      {item?.nombre}
      <div className="flex flex-row justify-normal gap-3 mr-2">
        <Icon  icono={"salvar"} />
        <Icon icono={"editar"} />
        <Icon icono={"eliminar"} onClick={() => borrarCategoria(item.id)} />
      </div>
    </Td>
  </Tr>
)
