"use client"
import useSelect from "@/app/hooks/useSelect";
import { getProveedoresCompletos } from "@/prisma/consultas/proveedores";
import InputArrayList from "../formComponents/InputArrayList";
import { useCallback, useMemo } from "react";

const InputArrayListProveedores = ({dataList, dataFilterKey, ...props}) => {
  const { filteredByKeyList } = useSelect(getProveedoresCompletos)

  const value = useMemo( () => (
    filteredByKeyList(dataList, dataFilterKey)
  ),[dataFilterKey, dataList, filteredByKeyList])

  return (
      <InputArrayList
        value={value}
        {...props}
      />
  )
}

export default InputArrayListProveedores;