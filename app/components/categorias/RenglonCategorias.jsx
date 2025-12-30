"use client"
import { borrarCategoria } from "@/prisma/serverActions/categorias";
import { fechas } from "@/lib/manipularTextos";
import Icon from "../formComponents/Icon";
import { Td, Tr } from "../Tablas/Tablas";
import { alertaBorrarCategoria } from "../alertas/alertaBorrarCategoria";

export const RenglonCategoria = ({item}) => (
  <Tr className={"h-10 align-middle"} >
    <Td className="px-2 w-px">
      {item?.id.slice(0, 5)}
    </Td>
    <Td className="pl-2 w-px">
      {fechas.fecha(item?.createdAt)}
    </Td>
    <Td className="w-px text-center mx-2">
      {item?._count?.products}
    </Td>
    <Td className="justify-between align-middle pl-4 px-4 pr-10">
      {item?.nombre}
    </Td>
    <Td className="
    border border-red-500
    px-2 w-px text-center align-middle">
        <div className="flex gap-2 justify-center">
          <Icon icono={"salvar"} />
          <Icon icono={"editar"} />
          <Icon icono={"eliminar"} onClick={() => alertaBorrarCategoria(item, () => borrarCategoria(item.id))} />
        </div>
    </Td>
  </Tr>
)
