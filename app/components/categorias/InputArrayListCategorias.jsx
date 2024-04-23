"use client"
import useSelect from "@/app/hooks/useSelect";
import InputArrayList from "../formComponents/InputArrayList";
import { useEffect } from "react";
import { getCategorias } from "@/prisma/consultas/categorias";

const InputArrayListCategorias = ({dataList, dataFilterKey, ...props}) => {
  const { select: categorias, filterByKeyList } = useSelect(getCategorias)

  useEffect(() => {
    filterByKeyList(dataList, dataFilterKey)
  },[dataFilterKey, dataList, filterByKeyList])

  return (
      <InputArrayList
        value={categorias}
        {...props}
      />
  )
}

export default InputArrayListCategorias;