"use client"
import { borrarCategoria } from "@/prisma/serverActions/categorias";
import { fechas } from "@/lib/manipularTextos";
import IconButton from "../formComponents/IconButton";

const Cell = ({children, ...props}) => (
  <td className={`px-2 border-r-2 border-r-slate-500 ${props.moreclass}` } {...props}>{children}</td>
);

export const RenglonCategoria = ({item}) => (
  <tr className='w-full table-row odd:bg-slate-300 even:bg-slate-200'>
    <Cell moreclass="w-1/5">
      {fechas.fecha(item?.createdAt)}
    </Cell>
    <Cell moreclass="flex flex-row justify-between pl-1">
      {"("}{item?._count?.products}{")"}
      {' '}
      {item?.nombre}
      <div>
        <IconButton icono={"salvar"} />
        <IconButton icono={"editar"} />
        <IconButton icono={"eliminar"} onClick={() => borrarCategoria(item.id)} />
      </div>
    </Cell>
  </tr>
)
