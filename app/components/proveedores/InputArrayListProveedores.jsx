"use client"
import useSelect from "@/app/hooks/useSelect";
import { getProveedoresCompletos } from "@/prisma/consultas/proveedores";
import InputArrayList from "../formComponents/InputArrayList";

const InputArrayListProveedores = ({dataList, dataFilterKey, ...props}) => {
  const { filteredByKeyList } = useSelect(getProveedoresCompletos)

  return (
      <InputArrayList
        value={filteredByKeyList(dataList, dataFilterKey)}
        {...props}
      />
  )
}

export default InputArrayListProveedores;