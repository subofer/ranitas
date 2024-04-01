"use client"
import { borrarCategoria } from "@/prisma/serverActions/categorias";
import { fechas } from "@/lib/manipularTextos";
import Icon from "../formComponents/Icon";
import { Td, Tr } from "../Tablas/Tablas ";
import { alertaBorrarCategoria } from "../alertas/alertaBorrarCategoria";

export const RenglonCategoria = ({item}) => (
  <Tr className={"h-10 align-middle"} >
    <Td className="w-px">
      {item?.id}
    </Td>
    <Td className="w-px">
      {fechas.fecha(item?.createdAt)}
    </Td>
    <Td className="w-px text-center">
      {item?._count?.products}
    </Td>
    <Td className="justify-between align-middle pl-1 px-4 pr-10">
      {item?.nombre}
    </Td>
    <Td className="flex flex-row gap-2 mt-2 text-center align-middle mr-2">
        <Icon icono={"salvar"} />
        <Icon icono={"editar"} />
        <Icon icono={"eliminar"} onClick={() => alertaBorrarCategoria(item, () => borrarCategoria(item.id))} />
    </Td>
  </Tr>
)
