"use client"
import { borrarCategoria } from "@/prisma/serverActions/categorias";
import { fechas } from "@/lib/manipularTextos";
import { Tr, Td } from '../Tablas';
import Icon from "../formComponents/Icon";


export const RenglonCategoria = ({item}) => (
  <Tr>
    <Td className="w-1/5">
      {fechas.fecha(item?.createdAt)}
    </Td>
    <Td className="flex flex-row justify-between pl-1">
      {"("}{item?._count?.products}{")"}
      {' '}
      {item?.nombre}
      <div>
        <Icon className='pr-1 ' icono={"salvar"} />
        <Icon className='pr-1 pl-2' icono={"editar"} />
        <Icon className='pr-2 pl-2' icono={"eliminar"} onClick={() => borrarCategoria(item.id)} />
      </div>
    </Td>
  </Tr>
)
