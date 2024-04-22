"use client"
import useSelect from "@/app/hooks/useSelect";
import { getProveedoresCompletos } from "@/prisma/consultas/proveedores";
import InputArrayList from "../formComponents/InputArrayList";
import { useEffect } from "react";

const InputArrayListProveedores = ({dataList, dataFilterKey, ...props}) => {
  const { select: proveedores, filterByKeyList } = useSelect(getProveedoresCompletos, "InputArrayListProveedores")

  useEffect(() => {
    filterByKeyList(dataList, dataFilterKey)
  },[dataFilterKey, dataList, filterByKeyList])

  return (
      <InputArrayList
        value={proveedores}
        {...props}
      />
  )
}

export default InputArrayListProveedores;