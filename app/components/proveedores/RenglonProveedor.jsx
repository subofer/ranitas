"use client"

import { deleteProveedor } from "@/prisma/consultas/proveedores"
import { Td, Tr } from "../Tablas"
import Icon from "../formComponents/Icon"
import { textos } from "@/lib/manipularTextos"
import useMyParams from "@/app/hooks/useMyParams"
import { useCallback } from "react"
import { alertaBorrarProveedor } from "../alertas/alertaBorrarProveedor"

export const RenglonProveedor = ({item: proveedor}) => {
  const { addParam, recarga } = useMyParams();

  const editar = useCallback(() => {
    addParam("cuit", proveedor.cuit)
  },[addParam, proveedor.cuit])

  const handleDelete = () => {
    alertaBorrarProveedor(() => {
      deleteProveedor(proveedor?.id)
      recarga()
    })
  }

  return (
    <Tr >
      <Td className="w-px">
        {textos.resumen(proveedor?.id)}
      </Td>
      <Td className="w-px">
        {textos.cuit(proveedor?.cuit)}
      </Td>
      <Td className="flex flex-row justify-between pl-1">
        {proveedor?.nombre}
        <div className="flex flex-row justify-normal gap-3 mr-2">
          <Icon icono={"editar"} onClick={editar}/>
          <Icon icono={"eliminar"} onClick={handleDelete} />
        </div>
      </Td>
    </Tr>
  )
}