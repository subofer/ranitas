"use client"
import { useEffect, useState, useCallback } from "react";

const useSelect = (geter)  => {
  if(!geter) throw Error('useSelect geter necesita una opcion')
  const [data, setData] = useState([])

  const filteredByKeyList = useCallback((list, key) => list.map(
    (item) => data.find((dataItem) => dataItem[key] == item[key])
  ),[data])

  useEffect(() => {
    const actualizarDatos = async () => {
      const listadoDatos = await geter()
      setData(listadoDatos)
    }
    actualizarDatos();
  }, [geter])

  return {
    data,
    filteredByKeyList,
  }
}

export default useSelect;